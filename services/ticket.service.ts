import { prisma } from "@/lib/infra/prisma";
import { withOrg } from "@/lib/utils/org-filter";
import { auditLog } from "@/lib/utils/audit";
import {
	createNotification,
	notifyAdmins,
	notifyEmployees,
	notifyWatchers,
} from "@/lib/utils/create-notification";
import { ROLES } from "@/configs/rbac.config";

// Extracts readable plain text from a TipTap JSON body (or returns the string as-is for legacy plain text)
function extractPlainText(body: string): string {
	try {
		const doc = JSON.parse(body);
		const texts: string[] = [];
		function walk(node: any) {
			if (node.type === "text") { texts.push(node.text ?? ""); return; }
			if (Array.isArray(node.content)) node.content.forEach(walk);
		}
		walk(doc);
		return texts.join("").trim();
	} catch {
		return body;
	}
}

// Minimal caller shape — compatible with Supabase AuthUser
export type Caller = {
	id: string;
	email?: string;
	app_metadata?: Record<string, unknown>;
	user_metadata?: Record<string, unknown>;
};

function callerName(caller: Caller): string {
	return (caller.user_metadata?.name as string | undefined) ?? caller.email ?? "Unknown";
}

function callerIsAdmin(caller: Caller): boolean {
	return caller.app_metadata?.role === ROLES.ADMIN;
}

function callerOrgId(caller: Caller): string | undefined {
	return caller.app_metadata?.org_id as string | undefined;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export type ListTicketsParams = {
	page?: number;
	limit?: number;
	status?: string;
	search?: string;
	view?: string;
	type?: string;
	priority?: string;
	assignee?: string;
	due?: string;
	date_from?: string;
	date_to?: string;
};

export async function listTickets(caller: Caller, params: ListTicketsParams) {
	const {
		page = 1,
		limit = 10,
		status: statusFilter,
		search,
		view = "assigned",
		type: typeFilter,
		priority: priorityFilter,
		assignee: assigneeFilter,
		due: dueFilter,
		date_from,
		date_to,
	} = params;

	const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));
	const take = Math.min(50, Math.max(1, limit));
	const isAdminCaller = callerIsAdmin(caller);
	const orgId = callerOrgId(caller);

	const searchFilter = search?.trim()
		? {
				OR: [
					{ title: { contains: search.trim(), mode: "insensitive" as const } },
					{ description: { contains: search.trim(), mode: "insensitive" as const } },
					{ client_name: { contains: search.trim(), mode: "insensitive" as const } },
					{ assignee: { name: { contains: search.trim(), mode: "insensitive" as const } } },
					{ assignee: { email: { contains: search.trim(), mode: "insensitive" as const } } },
				],
		  }
		: {};

	const employeeVisibilityFilter =
		view === "unassigned"
			? { user_id: null }
			: view === "all"
			? {}
			: { user_id: caller.id };

	const RESOLVED_STATUSES = ["completed", "closed", "rejected"];

	const overdueFilter =
		statusFilter === "overdue"
			? { due_date: { lt: new Date() }, status: { notIn: RESOLVED_STATUSES as any } }
			: {};

	const statusQueryFilter =
		statusFilter === "resolved"
			? { status: { in: RESOLVED_STATUSES as any } }
			: statusFilter && statusFilter !== "overdue"
			? { status: statusFilter as never }
			: !statusFilter
			? { status: { notIn: RESOLVED_STATUSES as any } }
			: {};

	const dateRangeFilter =
		date_from || date_to
			? {
				created_at: {
					...(date_from ? { gte: new Date(`${date_from}T00:00:00Z`) } : {}),
					...(date_to   ? { lte: new Date(`${date_to}T23:59:59Z`)   } : {}),
				},
			  }
			: {};

	const now = new Date();
	const todayEnd = new Date(now);
	todayEnd.setHours(23, 59, 59, 999);
	const weekEnd = new Date(now);
	weekEnd.setDate(weekEnd.getDate() + 7);

	const dueFilter_ =
		dueFilter === "overdue"
			? { due_date: { lt: now } }
			: dueFilter === "today"
			? { due_date: { lte: todayEnd } }
			: dueFilter === "week"
			? { due_date: { lte: weekEnd } }
			: {};

	const typeFilter_ = typeFilter ? { ticket_type: typeFilter } : {};
	const priorityFilter_ = priorityFilter ? { priority: priorityFilter as never } : {};
	const assigneeFilter_ =
		isAdminCaller && assigneeFilter
			? assigneeFilter === "unassigned"
				? { user_id: null }
				: { user_id: assigneeFilter }
			: {};

	const where = isAdminCaller
		? {
				...withOrg(orgId),
				...statusQueryFilter,
				...overdueFilter,
				...dueFilter_,
				...dateRangeFilter,
				...searchFilter,
				...typeFilter_,
				...priorityFilter_,
				...assigneeFilter_,
		  }
		: {
				...withOrg(orgId),
				...employeeVisibilityFilter,
				...statusQueryFilter,
				...overdueFilter,
				...dueFilter_,
				...dateRangeFilter,
				...searchFilter,
				...typeFilter_,
				...priorityFilter_,
		  };

	const [entries, total] = await Promise.all([
		prisma.ticket.findMany({
			where,
			include: {
				assignee: { select: { id: true, name: true, email: true } },
				dueDateRequests: { where: { status: "pending" }, select: { id: true } },
				reopenRequests: { where: { status: "pending" }, select: { id: true } },
				transferRequests: { where: { status: "pending" }, select: { id: true } },
			},
			orderBy: { created_at: "desc" },
			take,
			skip,
		}),
		prisma.ticket.count({ where }),
	]);

	const ticketIds = entries.map((e) => e.id);
	const timeSums = ticketIds.length > 0
		? await prisma.$queryRaw<{ ticket_id: string; total_ms: bigint }[]>`
				SELECT ticket_id,
				       SUM(EXTRACT(EPOCH FROM (end_time - start_time)) * 1000)::bigint AS total_ms
				FROM time_entries
				WHERE ticket_id = ANY(${ticketIds}::text[]) AND end_time IS NOT NULL
				GROUP BY ticket_id
			`
		: [];
	const timeMap = new Map(timeSums.map((r) => [r.ticket_id, Number(r.total_ms)]));

	const data = entries.map(({ dueDateRequests, reopenRequests, transferRequests, ...ticket }) => ({
		...ticket,
		total_time_ms: timeMap.get(ticket.id) ?? 0,
		pending_actions: [
			...(dueDateRequests.length > 0 ? ["due_date_request"] : []),
			...(reopenRequests.length > 0 ? ["reopen_request"] : []),
			...(transferRequests.length > 0 ? ["transfer_request"] : []),
		],
	}));

	return { data, page, total, totalPages: Math.ceil(total / take) || 1 };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateTicketData = {
	title: string;
	description?: string;
	priority?: string;
	due_date?: Date;
	assigned_to?: string;
	ticket_type?: string;
	client_name?: string;
	client_id?: string;
	client_email?: string;
	estimated_hours?: number;
	billable_hours?: number;
	implementation_plan?: string;
	rollback_plan?: string;
	links?: { url: string; label?: string }[];
	source?: string;
	assignee_permission?: string;
};

export async function createTicket(caller: Caller, data: CreateTicketData) {
	const isAdminCaller = callerIsAdmin(caller);
	const orgId = callerOrgId(caller);
	const { assigned_to: rawAssignedTo, ...rest } = data;

	const assigned_to = isAdminCaller ? rawAssignedTo : undefined;
	const status = assigned_to ? "assigned" : "pending";

	const entry = await prisma.ticket.create({
		data: {
			...(rest as any),
			org_id: orgId,
			created_by: caller.id,
			user_id: assigned_to ?? null,
			status,
			assigned_at: assigned_to ? new Date() : null,
		},
		include: { assignee: { select: { id: true, name: true, email: true } } },
	});

	auditLog({
		org_id: orgId,
		actor_id: caller.id,
		actor_role: isAdminCaller ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "CREATE",
		entity_type: "ticket",
		entity_id: entry.id,
		after: { title: entry.title, status, assigned_to },
	});

	if (!isAdminCaller) {
		notifyAdmins({
			type: "ticket_needs_approval",
			title: "New ticket submitted",
			body: `"${entry.title}" was submitted and is ready for assignment.`,
			link: `/dashboard/tickets/${entry.id}`,
		}).catch(() => {});
	} else if (assigned_to) {
		createNotification({
			user_id: assigned_to,
			type: "task_assigned",
			title: "New ticket assigned",
			body: `"${entry.title}" has been assigned to you.`,
			link: `/dashboard/tickets/${entry.id}`,
		}).catch(() => {});
	} else {
		notifyEmployees({
			type: "task_available",
			title: "New ticket available",
			body: `"${entry.title}" is available to claim.`,
			link: `/dashboard/tickets/${entry.id}`,
		}).catch(() => {});
	}

	return entry;
}

// ─── Get ──────────────────────────────────────────────────────────────────────

export async function getTicket(id: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({
		where: { id },
		include: {
			assignee: { select: { id: true, name: true, email: true } },
			creator: { select: { id: true, name: true, email: true } },
			client: { select: { id: true, name: true, email: true, deleted_at: true, rate_type: true } },
		},
	});

	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	return ticket;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export type UpdateTicketData = {
	title?: string;
	description?: string | null;
	status?: string;
	priority?: string;
	due_date?: Date | null;
	ticket_type?: string;
	client_name?: string | null;
	client_id?: string | null;
	client_email?: string | null;
	estimated_hours?: number | null;
	billable_hours?: number | null;
	implementation_plan?: string | null;
	rollback_plan?: string | null;
	links?: { url: string; label?: string }[] | null;
	source?: string | null;
	assignee_permission?: string;
};

export async function updateTicket(id: string, caller: Caller, data: UpdateTicketData) {
	const isAdminCaller = callerIsAdmin(caller);
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	if (!isAdminCaller) {
		if (ticket.user_id !== caller.id) throw Object.assign(new Error("Forbidden"), { status: 403 });
		if (ticket.assignee_permission !== "editor")
			throw Object.assign(new Error("You have viewer access to this ticket"), { status: 403 });
	}

	const { links, status, ...rest } = data;

	const statusOverrides: Record<string, unknown> = {};
	if (isAdminCaller && status !== undefined && status !== ticket.status) {
		if (status !== "completed" && status !== "closed") statusOverrides.completed_at = null;
		if (status === "pending" || status === "assigned") statusOverrides.started_at = null;
		if (status === "pending") statusOverrides.assigned_at = null;
	}

	const updated = await prisma.ticket.update({
		where: { id },
		data: {
			...(rest as any),
			...(isAdminCaller && status !== undefined ? { status: status as any } : {}),
			...statusOverrides,
			...(links !== undefined ? { links: links ?? [] } : {}),
		},
		include: { assignee: { select: { id: true, name: true, email: true } } },
	});

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: isAdminCaller ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "UPDATE",
		entity_type: "ticket",
		entity_id: id,
		before: { status: ticket.status },
		after: { status: updated.status, ...rest },
	});

	if (isAdminCaller && updated.user_id) {
		createNotification({
			user_id: updated.user_id,
			type: "task_updated",
			title: "Ticket updated",
			body: `"${updated.title}" has been updated by admin.`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});
	}

	return updated;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteTicket(id: string, admin: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	await prisma.ticket.delete({ where: { id } });

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "DELETE",
		entity_type: "ticket",
		entity_id: id,
		before: { title: ticket.title, status: ticket.status },
	});

	if (ticket.user_id && ticket.user_id !== admin.id) {
		createNotification({
			user_id: ticket.user_id,
			type: "task_deleted",
			title: "Ticket deleted",
			body: `"${ticket.title}" has been deleted by admin.`,
		}).catch(() => {});
	} else if (!ticket.user_id) {
		notifyEmployees({
			type: "task_deleted",
			title: "Ticket deleted",
			body: `"${ticket.title}" has been removed by admin.`,
		}).catch(() => {});
	}
}

// ─── Claim ────────────────────────────────────────────────────────────────────

export async function claimTicket(id: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.user_id !== null) throw Object.assign(new Error("Ticket is already assigned"), { status: 409 });

	const name = callerName(caller);

	const [updated] = await prisma.$transaction([
		prisma.ticket.update({
			where: { id },
			data: { user_id: caller.id, status: "assigned", assigned_at: new Date() },
		}),
		prisma.ticketComment.create({
			data: { task_id: id, user_id: caller.id, body: `${name} claimed this ticket.`, is_system: true },
		}),
	]);

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: ROLES.EMPLOYEE,
		action: "CLAIM",
		entity_type: "ticket",
		entity_id: id,
	});

	notifyAdmins({
		type: "task_claimed",
		title: "Ticket claimed",
		body: `${name} claimed "${ticket.title}".`,
		link: `/dashboard/tickets/${id}`,
	}).catch(() => {});

	return updated;
}

// ─── Start ────────────────────────────────────────────────────────────────────

export async function startTicket(id: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.user_id !== caller.id) throw Object.assign(new Error("Not allowed"), { status: 403 });

	const updated = await prisma.ticket.update({
		where: { id },
		data: { status: "in_progress", started_at: new Date() },
	});

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: ROLES.EMPLOYEE,
		action: "START",
		entity_type: "ticket",
		entity_id: id,
		before: { status: ticket.status },
		after: { status: "in_progress" },
	});

	notifyAdmins({
		type: "task_started",
		title: "Ticket started",
		body: `${callerName(caller)} started working on "${ticket.title}".`,
		link: `/dashboard/tickets/${id}`,
	}).catch(() => {});

	return updated;
}

// ─── Complete ─────────────────────────────────────────────────────────────────

export async function completeTicket(id: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.user_id !== caller.id) throw Object.assign(new Error("Not allowed"), { status: 403 });
	if (ticket.status === "stale")
		throw Object.assign(new Error("Stale tickets cannot be completed by employees"), { status: 403 });

	const updated = await prisma.ticket.update({
		where: { id },
		data: { status: "completed", completed_at: new Date() },
	});

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: ROLES.EMPLOYEE,
		action: "COMPLETE",
		entity_type: "ticket",
		entity_id: id,
	});

	const name = callerName(caller);
	const body = `"${ticket.title}" has been marked as complete by ${name}.`;
	const link = `/dashboard/tickets/${id}`;

	if (ticket.created_by !== caller.id)
		createNotification({ user_id: ticket.created_by, type: "task_completed", title: "Ticket resolved", body, link }).catch(() => {});

	notifyAdmins({ type: "task_completed", title: "Ticket resolved", body, link }).catch(() => {});
	notifyWatchers(id, { type: "task_completed", title: "Ticket resolved", body, link }, [caller.id, ticket.created_by]).catch(() => {});

	return updated;
}

// ─── Hold ─────────────────────────────────────────────────────────────────────

export async function holdTicket(id: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	const isAdminCaller = callerIsAdmin(caller);
	if (!isAdminCaller && ticket.user_id !== caller.id)
		throw Object.assign(new Error("Only the assignee can put this ticket on hold"), { status: 403 });

	if (!["assigned", "in_progress"].includes(ticket.status))
		throw Object.assign(new Error("Only assigned or in-progress tickets can be put on hold"), { status: 400 });

	const name = callerName(caller);
	const activeEntry = ticket.user_id
		? await prisma.timeEntry.findFirst({ where: { ticket_id: id, user_id: ticket.user_id, end_time: null } })
		: null;

	const now = new Date();

	await prisma.$transaction([
		prisma.ticket.update({ where: { id }, data: { status: "on_hold" } }),
		...(activeEntry ? [prisma.timeEntry.update({ where: { id: activeEntry.id }, data: { end_time: now } })] : []),
		prisma.ticketComment.create({
			data: {
				task_id: id,
				user_id: caller.id,
				body: activeEntry ? `${name} put this ticket on hold — active timer stopped.` : `${name} put this ticket on hold.`,
				is_system: true,
			},
		}),
	]);

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: isAdminCaller ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "HOLD",
		entity_type: "ticket",
		entity_id: id,
	});

	const notifPayload = {
		type: "task_updated" as const,
		title: "Ticket on hold",
		body: `${name} put "${ticket.title}" on hold.`,
		link: `/dashboard/tickets/${id}`,
	};

	if (isAdminCaller && ticket.user_id && ticket.user_id !== caller.id)
		createNotification({ user_id: ticket.user_id, ...notifPayload }).catch(() => {});

	const skipIds = [caller.id, ...(isAdminCaller && ticket.user_id ? [ticket.user_id] : [])];
	notifyWatchers(id, notifPayload, skipIds).catch(() => {});
	if (!isAdminCaller) notifyAdmins({ ...notifPayload, excludeId: caller.id }).catch(() => {});

	return prisma.ticket.findUnique({ where: { id } });
}

// ─── Reopen ───────────────────────────────────────────────────────────────────

export async function reopenTicket(id: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.user_id !== caller.id)
		throw Object.assign(new Error("Only the assignee can reopen this ticket"), { status: 403 });
	if (ticket.status !== "completed")
		throw Object.assign(new Error("Only resolved tickets can be reopened"), { status: 400 });

	const name = callerName(caller);

	const [updated] = await prisma.$transaction([
		prisma.ticket.update({ where: { id }, data: { status: "assigned", completed_at: null } }),
		prisma.ticketComment.create({
			data: {
				task_id: id,
				user_id: caller.id,
				body: `Ticket reopened by ${name} — status set back to assigned.`,
				is_system: true,
			},
		}),
	]);

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: ROLES.EMPLOYEE,
		action: "REOPEN",
		entity_type: "ticket",
		entity_id: id,
	});

	if (ticket.created_by !== caller.id)
		createNotification({
			user_id: ticket.created_by,
			type: "task_updated",
			title: "Ticket reopened",
			body: `${name} reopened "${ticket.title}".`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});

	notifyAdmins({
		type: "task_updated",
		title: "Ticket reopened",
		body: `${name} reopened "${ticket.title}".`,
		link: `/dashboard/tickets/${id}`,
		excludeId: ticket.created_by,
	}).catch(() => {});

	return updated;
}

// ─── Stale ────────────────────────────────────────────────────────────────────

export async function staleTicket(id: string, admin: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (["completed", "closed", "rejected"].includes(ticket.status))
		throw Object.assign(new Error("Cannot mark a finished ticket as stale"), { status: 400 });

	const name = callerName(admin);

	const [updated] = await prisma.$transaction([
		prisma.ticket.update({ where: { id }, data: { status: "stale" } }),
		prisma.ticketComment.create({
			data: { task_id: id, user_id: admin.id, body: `${name} marked this ticket as stale.`, is_system: true },
		}),
	]);

	const notifPayload = {
		type: "task_updated" as const,
		title: "Ticket marked as stale",
		body: `"${ticket.title}" has been marked as stale.`,
		link: `/dashboard/tickets/${id}`,
	};

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "STALE",
		entity_type: "ticket",
		entity_id: id,
		before: { status: ticket.status },
		after: { status: "stale" },
	});

	if (ticket.user_id) createNotification({ user_id: ticket.user_id, ...notifPayload }).catch(() => {});
	notifyWatchers(id, notifPayload, ticket.user_id ? [ticket.user_id] : []).catch(() => {});

	return updated;
}

// ─── Assign ───────────────────────────────────────────────────────────────────

export async function assignTicket(id: string, admin: Caller, assigneeId: string) {
	const ticket = await prisma.ticket.findUnique({
		where: { id },
		include: { assignee: { select: { name: true, email: true } } },
	});
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.status === "completed")
		throw Object.assign(new Error("Completed tickets cannot be reassigned"), { status: 400 });

	const newAssignee = await prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } });
	if (!newAssignee) throw Object.assign(new Error("User not found"), { status: 404 });

	const oldName = ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned";
	const newName = newAssignee.name ?? newAssignee.email;

	const [updated] = await prisma.$transaction([
		prisma.ticket.update({
			where: { id },
			data: { user_id: assigneeId, status: "assigned", started_at: null, assigned_at: new Date() },
		}),
		prisma.ticketComment.create({
			data: {
				task_id: id,
				user_id: null,
				body: `Ticket reassigned from ${oldName} to ${newName} by admin.`,
				is_system: true,
			},
		}),
	]);

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "UPDATE",
		entity_type: "ticket",
		entity_id: id,
		before: { user_id: ticket.user_id },
		after: { user_id: assigneeId },
	});

	const isReassign = !!ticket.user_id;
	const eventBody = `"${ticket.title}" has been ${isReassign ? "reassigned" : "assigned"} to ${newName}.`;

	createNotification({
		user_id: assigneeId,
		type: isReassign ? "task_reassigned" : "task_assigned",
		title: isReassign ? "Ticket reassigned to you" : "New ticket assigned",
		body: `"${ticket.title}" has been ${isReassign ? "reassigned" : "assigned"} to you.`,
		link: `/dashboard/tickets/${id}`,
	}).catch(() => {});

	if (isReassign && ticket.user_id && ticket.user_id !== assigneeId) {
		createNotification({
			user_id: ticket.user_id,
			type: "task_reassigned",
			title: "Ticket reassigned",
			body: `"${ticket.title}" has been reassigned to ${newName}.`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});
	}

	notifyWatchers(id, {
		type: isReassign ? "task_reassigned" : "task_assigned",
		title: isReassign ? "Ticket reassigned" : "Ticket assigned",
		body: eventBody,
		link: `/dashboard/tickets/${id}`,
	}, [assigneeId, ...(ticket.user_id ? [ticket.user_id] : [])]).catch(() => {});

	return updated;
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export async function approveTicket(id: string, admin: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.status !== "needs_approval")
		throw Object.assign(new Error("Only tickets pending approval can be approved"), { status: 400 });

	const name = callerName(admin);
	const assigneeId = ticket.created_by ?? null;
	const now = new Date();

	const [updated] = await prisma.$transaction([
		prisma.ticket.update({
			where: { id },
			data: assigneeId
				? { status: "assigned", user_id: assigneeId, assigned_at: now }
				: { status: "pending" },
		}),
		prisma.ticketComment.create({
			data: {
				task_id: id,
				user_id: admin.id,
				body: assigneeId
					? `Ticket approved by ${name} — assigned to the requester.`
					: `Ticket approved by ${name} — now open for assignment.`,
				is_system: true,
			},
		}),
	]);

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "APPROVE",
		entity_type: "ticket",
		entity_id: id,
	});

	if (ticket.created_by) {
		createNotification({
			user_id: ticket.created_by,
			type: "ticket_approved",
			title: "Ticket approved",
			body: assigneeId
				? `Your ticket "${ticket.title}" has been approved and assigned to you.`
				: `Your ticket "${ticket.title}" has been approved and is now open.`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});
	}

	return updated;
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export async function rejectTicket(id: string, admin: Caller, reason?: string) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.status !== "needs_approval")
		throw Object.assign(new Error("Only tickets pending approval can be rejected"), { status: 400 });

	const name = callerName(admin);

	const [updated] = await prisma.$transaction([
		prisma.ticket.update({ where: { id }, data: { status: "rejected" } }),
		prisma.ticketComment.create({
			data: {
				task_id: id,
				user_id: admin.id,
				body: reason ? `Ticket rejected by ${name}. Reason: ${reason}` : `Ticket rejected by ${name}.`,
				is_system: true,
			},
		}),
	]);

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "REJECT",
		entity_type: "ticket",
		entity_id: id,
	});

	createNotification({
		user_id: ticket.created_by,
		type: "ticket_rejected",
		title: "Ticket rejected",
		body: `Your ticket "${ticket.title}" was rejected.${reason ? ` Reason: ${reason}` : ""}`,
		link: `/dashboard/tickets/${id}`,
	}).catch(() => {});

	return updated;
}

// ─── Billable ─────────────────────────────────────────────────────────────────

export async function updateBillable(id: string, caller: Caller, billableHours: number | null) {
	const ticket = await prisma.ticket.findUnique({ where: { id } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	const isAdminCaller = callerIsAdmin(caller);
	if (!isAdminCaller && ticket.user_id !== caller.id)
		throw Object.assign(new Error("Forbidden"), { status: 403 });

	const updated = await prisma.ticket.update({ where: { id }, data: { billable_hours: billableHours } });

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: isAdminCaller ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "UPDATE",
		entity_type: "ticket",
		entity_id: id,
		before: { billable_hours: ticket.billable_hours },
		after: { billable_hours: billableHours },
	});

	return updated;
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function listComments(ticketId: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	return prisma.ticketComment.findMany({
		where: { task_id: ticketId },
		orderBy: { created_at: "asc" },
		include: {
			author: { select: { id: true, name: true, email: true } },
			attachments: {
				orderBy: { created_at: "asc" },
				select: { id: true, file_name: true, file_size: true, mime_type: true, url: true, created_at: true,
					author: { select: { id: true, name: true, email: true } } },
			},
		},
	});
}

export async function addComment(ticketId: string, caller: Caller, body: string, attachmentIds?: string[]) {
	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	const comment = await prisma.ticketComment.create({
		data: { task_id: ticketId, user_id: caller.id, body, is_system: false },
		include: {
			author: { select: { id: true, name: true, email: true } },
			attachments: {
				select: { id: true, file_name: true, file_size: true, mime_type: true, url: true, created_at: true,
					author: { select: { id: true, name: true, email: true } } },
			},
		},
	});

	// Link pre-uploaded attachments to this comment (only own, unlinked)
	if (attachmentIds?.length) {
		await prisma.ticketAttachment.updateMany({
			where: { id: { in: attachmentIds }, user_id: caller.id, comment_id: null },
			data: { comment_id: comment.id },
		});
	}

	const commenterName = callerName(caller);
	const plainText = extractPlainText(body);
	const snippet = plainText.length > 60 ? `${plainText.slice(0, 60)}…` : plainText;
	const recipientIds = new Set<string>();
	if (ticket.user_id && ticket.user_id !== caller.id) recipientIds.add(ticket.user_id);
	if (ticket.created_by !== caller.id) recipientIds.add(ticket.created_by);
	for (const recipientId of recipientIds) {
		createNotification({
			user_id: recipientId,
			type: "comment_added",
			title: `${commenterName} commented on a ticket`,
			body: `"${ticket.title}": ${snippet}`,
			link: `/dashboard/tickets/${ticketId}`,
		}).catch(() => {});
	}
	notifyWatchers(ticketId, {
		type: "comment_added",
		title: `${commenterName} commented on a ticket`,
		body: `"${ticket.title}": ${snippet}`,
		link: `/dashboard/tickets/${ticketId}`,
	}, [...recipientIds, caller.id]).catch(() => {});

	return comment;
}

export async function deleteComment(commentId: string, caller: Caller) {
	const comment = await prisma.ticketComment.findUnique({ where: { id: commentId } });
	if (!comment) throw Object.assign(new Error("Comment not found"), { status: 404 });
	if (comment.is_system) throw Object.assign(new Error("System comments cannot be deleted"), { status: 403 });

	const isAdmin = callerIsAdmin(caller);
	if (!isAdmin && comment.user_id !== caller.id)
		throw Object.assign(new Error("Forbidden"), { status: 403 });

	await prisma.ticketComment.delete({ where: { id: commentId } });

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: isAdmin ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "DELETE",
		entity_type: "ticket",
		entity_id: comment.task_id,
		after: { deleted_comment_id: commentId },
	});
}

export async function clearComments(ticketId: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	const isAdmin = callerIsAdmin(caller);
	const isCreator = ticket.created_by === caller.id;
	if (!isAdmin && !isCreator) throw Object.assign(new Error("Forbidden"), { status: 403 });

	await prisma.ticketComment.deleteMany({ where: { task_id: ticketId, is_system: false } });

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: isAdmin ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "DELETE",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { cleared_comments: true },
	});
}

// ─── Reactions ────────────────────────────────────────────────────────────────

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export async function getReactions(commentId: string, caller: Caller) {
	const reactions = await prisma.commentReaction.findMany({
		where: { comment_id: commentId },
		include: { user: { select: { id: true, name: true, email: true } } },
	});

	return ALLOWED_EMOJIS.map((emoji) => {
		const group = reactions.filter((r) => r.emoji === emoji);
		return {
			emoji,
			count: group.length,
			reacted: group.some((r) => r.user_id === caller.id),
			users: group.map((r) => r.user),
		};
	}).filter((g) => g.count > 0);
}

export async function toggleReaction(commentId: string, caller: Caller, emoji: string) {
	if (!ALLOWED_EMOJIS.includes(emoji))
		throw Object.assign(new Error("Invalid emoji"), { status: 400 });

	const existing = await prisma.commentReaction.findUnique({
		where: { comment_id_user_id_emoji: { comment_id: commentId, user_id: caller.id, emoji } },
	});

	if (existing) {
		await prisma.commentReaction.delete({ where: { id: existing.id } });
		return { action: "removed", emoji };
	}

	await prisma.commentReaction.create({ data: { comment_id: commentId, user_id: caller.id, emoji } });
	return { action: "added", emoji };
}

// ─── Subtasks ─────────────────────────────────────────────────────────────────

export async function listSubtasks(ticketId: string, caller: Caller) {
	return prisma.ticketSubtask.findMany({
		where: { task_id: ticketId },
		orderBy: { position: "asc" },
	});
}

export async function createSubtask(ticketId: string, caller: Caller, title: string) {
	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	const count = await prisma.ticketSubtask.count({ where: { task_id: ticketId } });
	return prisma.ticketSubtask.create({ data: { task_id: ticketId, title, position: count } });
}

export async function updateSubtask(subtaskId: string, caller: Caller, data: { title?: string; completed?: boolean; position?: number }) {
	const subtask = await prisma.ticketSubtask.findUnique({ where: { id: subtaskId } });
	if (!subtask) throw Object.assign(new Error("Subtask not found"), { status: 404 });
	return prisma.ticketSubtask.update({ where: { id: subtaskId }, data });
}

export async function deleteSubtask(subtaskId: string, caller: Caller) {
	await prisma.ticketSubtask.delete({ where: { id: subtaskId } });
}

// ─── Watchers ─────────────────────────────────────────────────────────────────

export async function listWatchers(ticketId: string, caller: Caller) {
	const watchers = await prisma.ticketWatcher.findMany({
		where: { task_id: ticketId },
		include: { user: { select: { id: true, name: true, email: true } } },
	});
	return { watchers, isWatching: watchers.some((w) => w.user_id === caller.id), count: watchers.length };
}

export async function addWatcher(ticketId: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });

	const watcher = await prisma.ticketWatcher.upsert({
		where: { task_id_user_id: { task_id: ticketId, user_id: caller.id } },
		create: { task_id: ticketId, user_id: caller.id },
		update: {},
	});

	const watcherName = callerName(caller);
	const notifPayload = {
		type: "task_watched",
		title: "New watcher",
		body: `${watcherName} is now watching "${ticket.title}".`,
		link: `/dashboard/tickets/${ticketId}`,
	};
	if (ticket.created_by !== caller.id)
		createNotification({ user_id: ticket.created_by, ...notifPayload }).catch(() => {});
	if (ticket.user_id && ticket.user_id !== caller.id && ticket.user_id !== ticket.created_by)
		createNotification({ user_id: ticket.user_id, ...notifPayload }).catch(() => {});
	notifyAdmins({ ...notifPayload, excludeId: ticket.created_by }).catch(() => {});

	return watcher;
}

export async function removeWatcher(ticketId: string, caller: Caller) {
	await prisma.ticketWatcher.deleteMany({ where: { task_id: ticketId, user_id: caller.id } });
}

// ─── Bulk Operations ──────────────────────────────────────────────────────────

export type BulkAction = "assign" | "complete" | "delete" | "status" | "priority" | "due_date";

const VALID_STATUSES  = ["open", "assigned", "in_progress", "completed", "stale"] as const;
const VALID_PRIORITIES = ["low", "medium", "high"] as const;

interface BulkPayload {
	user_id?:  string;
	status?:   string;
	priority?: string;
	due_date?: string | null;
}

export async function bulkTicketAction(action: BulkAction, ids: string[], admin: Caller, payload: BulkPayload = {}) {
	const { user_id: userId, status, priority, due_date } = payload;

	if (action === "assign" && !userId)
		throw Object.assign(new Error("user_id is required for assign action"), { status: 400 });
	if (action === "status" && (!status || !VALID_STATUSES.includes(status as any)))
		throw Object.assign(new Error("valid status is required"), { status: 400 });
	if (action === "priority" && (!priority || !VALID_PRIORITIES.includes(priority as any)))
		throw Object.assign(new Error("valid priority is required"), { status: 400 });
	if (action === "due_date" && due_date === undefined)
		throw Object.assign(new Error("due_date is required"), { status: 400 });

	const succeeded: string[] = [];
	const failed: string[] = [];

	for (const id of ids) {
		try {
			const ticket = await prisma.ticket.findUnique({ where: { id } });
			if (!ticket) { failed.push(id); continue; }

			if (action === "assign") {
				const newAssignee = await prisma.user.findUnique({ where: { id: userId! }, select: { name: true, email: true } });
				if (!newAssignee) { failed.push(id); continue; }
				const oldName = ticket.user_id
					? (await prisma.user.findUnique({ where: { id: ticket.user_id }, select: { name: true, email: true } }))?.name ?? "Unassigned"
					: "Unassigned";
				await prisma.$transaction([
					prisma.ticket.update({ where: { id }, data: { user_id: userId!, status: "assigned", assigned_at: new Date(), started_at: null } }),
					prisma.ticketComment.create({ data: { task_id: id, user_id: null, body: `Ticket reassigned from ${oldName} to ${newAssignee.name ?? newAssignee.email} by admin.`, is_system: true } }),
				]);
				auditLog({ org_id: callerOrgId(admin), actor_id: admin.id, actor_role: ROLES.ADMIN, action: "TRANSFER", entity_type: "ticket", entity_id: id, before: { user_id: ticket.user_id }, after: { user_id: userId } });
				createNotification({ user_id: userId!, type: ticket.user_id ? "task_reassigned" : "task_assigned", title: ticket.user_id ? "Ticket reassigned to you" : "New ticket assigned", body: `"${ticket.title}" has been assigned to you.`, link: `/dashboard/tickets/${id}` }).catch(() => {});
			} else if (action === "complete") {
				if (ticket.status === "completed") { succeeded.push(id); continue; }
				await prisma.ticket.update({ where: { id }, data: { status: "completed", completed_at: new Date() } });
				auditLog({ org_id: callerOrgId(admin), actor_id: admin.id, actor_role: ROLES.ADMIN, action: "COMPLETE", entity_type: "ticket", entity_id: id, before: { status: ticket.status }, after: { status: "completed" } });
				if (ticket.created_by !== admin.id)
					createNotification({ user_id: ticket.created_by, type: "task_completed", title: "Ticket resolved", body: `"${ticket.title}" has been marked complete.`, link: `/dashboard/tickets/${id}` }).catch(() => {});
			} else if (action === "delete") {
				await prisma.ticket.delete({ where: { id } });
				auditLog({ org_id: callerOrgId(admin), actor_id: admin.id, actor_role: ROLES.ADMIN, action: "DELETE", entity_type: "ticket", entity_id: id });
				if (ticket.user_id && ticket.user_id !== admin.id)
					createNotification({ user_id: ticket.user_id, type: "task_deleted", title: "Ticket deleted", body: `"${ticket.title}" has been deleted by admin.` }).catch(() => {});
				else if (!ticket.user_id)
					notifyEmployees({ type: "task_deleted", title: "Ticket deleted", body: `"${ticket.title}" has been removed by admin.` }).catch(() => {});
			} else if (action === "status") {
				if (ticket.status === status) { succeeded.push(id); continue; }
				await prisma.ticket.update({ where: { id }, data: { status: status as any } });
				auditLog({ org_id: callerOrgId(admin), actor_id: admin.id, actor_role: ROLES.ADMIN, action: "UPDATE", entity_type: "ticket", entity_id: id, before: { status: ticket.status }, after: { status } });
			} else if (action === "priority") {
				if (ticket.priority === priority) { succeeded.push(id); continue; }
				await prisma.ticket.update({ where: { id }, data: { priority: priority as any } });
				auditLog({ org_id: callerOrgId(admin), actor_id: admin.id, actor_role: ROLES.ADMIN, action: "UPDATE", entity_type: "ticket", entity_id: id, before: { priority: ticket.priority }, after: { priority } });
			} else if (action === "due_date") {
				const newDate = due_date ? new Date(due_date) : null;
				await prisma.ticket.update({ where: { id }, data: { due_date: newDate } });
				auditLog({ org_id: callerOrgId(admin), actor_id: admin.id, actor_role: ROLES.ADMIN, action: "UPDATE", entity_type: "ticket", entity_id: id, before: { due_date: ticket.due_date }, after: { due_date: newDate } });
			}
			succeeded.push(id);
		} catch {
			failed.push(id);
		}
	}

	return { succeeded, failed };
}

// ─── Reopen Request ───────────────────────────────────────────────────────────

export async function getReopenRequest(ticketId: string) {
	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { status: true } });
	if (!ticket || ticket.status !== "stale") return null;
	return prisma.reopenRequest.findFirst({ where: { task_id: ticketId, status: "pending" } });
}

export async function submitReopenRequest(ticketId: string, caller: Caller) {
	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (callerIsAdmin(caller)) throw Object.assign(new Error("Admins can reopen tickets directly"), { status: 400 });
	if (ticket.user_id !== caller.id) throw Object.assign(new Error("Only the assignee can request a reopen"), { status: 403 });
	if (ticket.status !== "stale")
		throw Object.assign(new Error("Only stale tickets can be requested for reopen"), { status: 400 });

	const existing = await prisma.reopenRequest.findFirst({ where: { task_id: ticketId, status: "pending" } });
	if (existing) throw Object.assign(new Error("A reopen request is already pending"), { status: 409 });

	const actorName = callerName(caller);
	const orgId = callerOrgId(caller);

	await prisma.$transaction([
		prisma.reopenRequest.create({ data: { ...(orgId ? { org_id: orgId } : {}), task_id: ticketId, requested_by: caller.id } }),
		prisma.ticketComment.create({ data: { task_id: ticketId, user_id: caller.id, body: `${actorName} requested to reopen this ticket — currently stale.`, is_system: true } }),
	]);

	auditLog({
		org_id: orgId,
		actor_id: caller.id,
		actor_role: ROLES.EMPLOYEE,
		action: "SUBMIT",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { request_type: "reopen", ticket_status: ticket.status },
	});

	notifyAdmins({ type: "task_updated", title: "Reopen requested", body: `${actorName} requested to reopen "${ticket.title}".`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
}

export async function approveReopenRequest(ticketId: string, admin: Caller) {
	const request = await prisma.reopenRequest.findFirst({ where: { task_id: ticketId, status: "pending" }, include: { ticket: true } });
	if (!request) throw Object.assign(new Error("No pending reopen request found"), { status: 404 });

	const adminName = callerName(admin);
	const now = new Date();
	const newStatus = request.ticket.user_id ? "assigned" : "pending";

	await prisma.$transaction([
		prisma.reopenRequest.update({ where: { id: request.id }, data: { status: "approved", reviewed_by: admin.id, reviewed_at: now } }),
		prisma.ticket.update({ where: { id: ticketId }, data: { status: newStatus } }),
		prisma.ticketComment.create({ data: { task_id: ticketId, user_id: admin.id, body: `${adminName} approved the reopen request — ticket is now ${newStatus === "assigned" ? "assigned" : "open"}.`, is_system: true } }),
	]);

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "APPROVE",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { request_type: "reopen", new_status: newStatus },
	});

	if (request.ticket.user_id)
		createNotification({ user_id: request.ticket.user_id, type: "task_updated", title: "Reopen request approved", body: `Your reopen request for "${request.ticket.title}" was approved.`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
}

export async function rejectReopenRequest(ticketId: string, admin: Caller, reason?: string) {
	const request = await prisma.reopenRequest.findFirst({ where: { task_id: ticketId, status: "pending" }, include: { ticket: true } });
	if (!request) throw Object.assign(new Error("No pending reopen request found"), { status: 404 });

	const adminName = callerName(admin);
	const now = new Date();

	await prisma.$transaction([
		prisma.reopenRequest.update({ where: { id: request.id }, data: { status: "rejected", reviewed_by: admin.id, reviewed_at: now } }),
		prisma.ticketComment.create({ data: { task_id: ticketId, user_id: admin.id, body: `${adminName} rejected the reopen request${reason ? ` — "${reason}"` : ""}.`, is_system: true } }),
	]);

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "REJECT",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { request_type: "reopen", reason },
	});

	if (request.ticket.user_id)
		createNotification({ user_id: request.ticket.user_id, type: "task_updated", title: "Reopen request rejected", body: `Your reopen request for "${request.ticket.title}" was rejected${reason ? `: ${reason}` : ""}.`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
}

// ─── Transfer Request ─────────────────────────────────────────────────────────

export async function getTransferRequest(ticketId: string) {
	return prisma.transferRequest.findFirst({
		where: { task_id: ticketId, status: "pending" },
		include: { targetEmployee: { select: { name: true, email: true } } },
	});
}

export async function submitTransferRequest(ticketId: string, caller: Caller, requestedTo?: string) {
	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { assignee: { select: { name: true, email: true } } } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.user_id !== caller.id) throw Object.assign(new Error("Only the current assignee can request a transfer"), { status: 403 });
	if (ticket.status === "completed") throw Object.assign(new Error("Completed tasks cannot be transferred"), { status: 400 });

	const existing = await prisma.transferRequest.findFirst({ where: { task_id: ticketId, status: "pending" } });
	if (existing) throw Object.assign(new Error("A transfer request is already pending"), { status: 409 });

	const requesterName = ticket.assignee?.name ?? ticket.assignee?.email ?? "An employee";
	let targetName = "any available team member";
	if (requestedTo) {
		const target = await prisma.user.findUnique({ where: { id: requestedTo }, select: { name: true, email: true } });
		if (!target) throw Object.assign(new Error("Requested employee not found"), { status: 404 });
		targetName = target.name ?? target.email ?? targetName;
	}

	const orgId = callerOrgId(caller);

	const [, comment] = await prisma.$transaction([
		prisma.transferRequest.create({ data: { ...(orgId ? { org_id: orgId } : {}), task_id: ticketId, requested_by: caller.id, requested_to: requestedTo ?? null } }),
		prisma.ticketComment.create({ data: { task_id: ticketId, user_id: null, body: `${requesterName} requested to transfer this task to ${targetName}.`, is_system: true } }),
	]);

	auditLog({
		org_id: orgId,
		actor_id: caller.id,
		actor_role: ROLES.EMPLOYEE,
		action: "SUBMIT",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { request_type: "transfer", requested_to: requestedTo ?? null },
	});

	createNotification({ user_id: ticket.created_by, type: "transfer_requested", title: "Transfer request", body: `${requesterName} requested to transfer "${ticket.title}" to ${targetName}.`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
	notifyAdmins({ type: "transfer_requested", title: "Transfer request", body: `${requesterName} requested to transfer "${ticket.title}" to ${targetName}.`, link: `/dashboard/tickets/${ticketId}`, excludeId: ticket.created_by }).catch(() => {});

	return { success: true, comment };
}

export async function approveTransferRequest(ticketId: string, admin: Caller, assigneeId: string) {
	const [request, newAssignee] = await Promise.all([
		prisma.transferRequest.findFirst({ where: { task_id: ticketId, status: "pending" }, include: { ticket: true } }),
		prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } }),
	]);
	if (!request) throw Object.assign(new Error("No pending transfer request found"), { status: 404 });
	if (!newAssignee) throw Object.assign(new Error("Assignee not found"), { status: 404 });

	const adminName = callerName(admin);
	const now = new Date();
	const targetName = newAssignee.name ?? newAssignee.email;

	await prisma.$transaction(async (tx) => {
		await tx.transferRequest.update({ where: { id: request.id }, data: { status: "approved", reviewed_by: admin.id, reviewed_at: now } });
		await tx.ticket.update({ where: { id: ticketId }, data: { user_id: assigneeId, status: "assigned", assigned_at: now } });
		await tx.ticketComment.create({ data: { task_id: ticketId, user_id: admin.id, body: `${adminName} approved the transfer request — reassigned to ${targetName}.`, is_system: true } });
	});

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "APPROVE",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { request_type: "transfer", new_assignee_id: assigneeId },
	});

	if (request.ticket.user_id)
		createNotification({ user_id: request.ticket.user_id, type: "task_updated", title: "Transfer request approved", body: `Your transfer request for "${request.ticket.title}" was approved — reassigned to ${targetName}.`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
	if (assigneeId !== request.ticket.user_id)
		createNotification({ user_id: assigneeId, type: "task_assigned", title: "Ticket transferred to you", body: `"${request.ticket.title}" has been transferred to you.`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
}

export async function rejectTransferRequest(ticketId: string, admin: Caller, reason?: string) {
	const request = await prisma.transferRequest.findFirst({ where: { task_id: ticketId, status: "pending" }, include: { ticket: true } });
	if (!request) throw Object.assign(new Error("No pending transfer request found"), { status: 404 });

	const adminName = callerName(admin);
	const now = new Date();

	await prisma.$transaction([
		prisma.transferRequest.update({ where: { id: request.id }, data: { status: "rejected", reviewed_by: admin.id, reviewed_at: now } }),
		prisma.ticketComment.create({ data: { task_id: ticketId, user_id: admin.id, body: `${adminName} rejected the transfer request${reason ? ` — "${reason}"` : ""}.`, is_system: true } }),
	]);

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "REJECT",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { request_type: "transfer", reason },
	});

	if (request.ticket.user_id)
		createNotification({ user_id: request.ticket.user_id, type: "task_updated", title: "Transfer request rejected", body: `Your transfer request for "${request.ticket.title}" was rejected${reason ? `: ${reason}` : ""}.`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
}

// ─── Due Date Request ─────────────────────────────────────────────────────────

export async function getDueDateRequest(ticketId: string) {
	return prisma.dueDateRequest.findFirst({
		where: { task_id: ticketId, status: "pending" },
		include: { requester: { select: { id: true, name: true, email: true } } },
	});
}

export async function submitDueDateRequest(ticketId: string, caller: Caller, requestedDate: Date, reason?: string) {
	if (callerIsAdmin(caller)) throw Object.assign(new Error("Admins can change the due date directly"), { status: 400 });

	const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
	if (!ticket) throw Object.assign(new Error("Ticket not found"), { status: 404 });
	if (ticket.user_id !== caller.id) throw Object.assign(new Error("Only the assignee can request a due date change"), { status: 403 });
	if (ticket.assignee_permission !== "editor") throw Object.assign(new Error("You have viewer access to this ticket"), { status: 403 });

	const existing = await prisma.dueDateRequest.findFirst({ where: { task_id: ticketId, status: "pending" } });
	if (existing) throw Object.assign(new Error("A due date change request is already pending"), { status: 409 });

	const orgId = callerOrgId(caller);
	const actorName = callerName(caller);

	const [request] = await prisma.$transaction([
		prisma.dueDateRequest.create({ data: { ...(orgId ? { org_id: orgId } : {}), task_id: ticketId, requested_by: caller.id, requested_date: requestedDate, reason: reason ?? null }, include: { requester: { select: { id: true, name: true, email: true } } } }),
		prisma.ticketComment.create({ data: { task_id: ticketId, user_id: caller.id, body: `${actorName} requested a due date change${reason ? ` — "${reason}"` : ""}.`, is_system: true } }),
	]);

	auditLog({
		org_id: orgId,
		actor_id: caller.id,
		actor_role: ROLES.EMPLOYEE,
		action: "SUBMIT",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { request_type: "due_date", requested_date: requestedDate.toISOString(), reason },
	});

	notifyAdmins({ type: "task_updated", title: "Due date change requested", body: `${actorName} requested a new due date for "${ticket.title}".`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});

	return request;
}

export async function approveDueDateRequest(ticketId: string, admin: Caller) {
	const request = await prisma.dueDateRequest.findFirst({ where: { task_id: ticketId, status: "pending" }, include: { ticket: true } });
	if (!request) throw Object.assign(new Error("No pending due date request found"), { status: 404 });

	const adminName = callerName(admin);
	const now = new Date();

	await prisma.$transaction([
		prisma.dueDateRequest.update({ where: { id: request.id }, data: { status: "approved", reviewed_by: admin.id, reviewed_at: now } }),
		prisma.ticket.update({ where: { id: ticketId }, data: { due_date: request.requested_date } }),
		prisma.ticketComment.create({ data: { task_id: ticketId, user_id: admin.id, body: `${adminName} approved the due date change request.`, is_system: true } }),
	]);

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "APPROVE",
		entity_type: "ticket",
		entity_id: ticketId,
		before: { due_date: request.ticket.due_date?.toISOString() ?? null },
		after: { request_type: "due_date", due_date: request.requested_date.toISOString() },
	});

	if (request.ticket.user_id)
		createNotification({ user_id: request.ticket.user_id, type: "task_updated", title: "Due date change approved", body: `Your due date change request for "${request.ticket.title}" was approved.`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
}

export async function rejectDueDateRequest(ticketId: string, admin: Caller, reason?: string) {
	const request = await prisma.dueDateRequest.findFirst({ where: { task_id: ticketId, status: "pending" }, include: { ticket: true } });
	if (!request) throw Object.assign(new Error("No pending due date request found"), { status: 404 });

	const adminName = callerName(admin);
	const now = new Date();

	await prisma.$transaction([
		prisma.dueDateRequest.update({ where: { id: request.id }, data: { status: "rejected", reviewed_by: admin.id, reviewed_at: now, reject_reason: reason ?? null } }),
		prisma.ticketComment.create({ data: { task_id: ticketId, user_id: admin.id, body: `${adminName} rejected the due date change request${reason ? ` — "${reason}"` : ""}.`, is_system: true } }),
	]);

	auditLog({
		org_id: callerOrgId(admin),
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "REJECT",
		entity_type: "ticket",
		entity_id: ticketId,
		after: { request_type: "due_date", reason },
	});

	if (request.ticket.user_id)
		createNotification({ user_id: request.ticket.user_id, type: "task_updated", title: "Due date change rejected", body: `Your due date change request for "${request.ticket.title}" was rejected${reason ? `: ${reason}` : ""}.`, link: `/dashboard/tickets/${ticketId}` }).catch(() => {});
}
