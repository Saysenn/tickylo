import { prisma } from "@/lib/infra/prisma";
import { ROLES } from "@/configs/rbac.config";
import { auditLog } from "@/lib/utils/audit";
import type { Caller } from "./ticket.service";

const callerIsAdmin = (c: Caller) => c.app_metadata?.role === ROLES.ADMIN;
const callerOrgId = (c: Caller) => c.app_metadata?.org_id as string | undefined;

// ─── List ─────────────────────────────────────────────────────────────────────

export type ListEntriesParams = {
	page?: number;
	limit?: number;
	from?: string;
	to?: string;
	tz_offset?: number;
	user_id?: string;
	flagged_only?: boolean;
};

export async function listEntries(caller: Caller, params: ListEntriesParams) {
	const { page = 1, limit = 10, from, to, tz_offset = 0, user_id, flagged_only } = params;
	const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));
	const take = Math.min(50, Math.max(1, limit));
	const isAdmin = callerIsAdmin(caller);
	const orgId = callerOrgId(caller);

	const localMidnightUTC = (d: string) =>
		new Date(new Date(d + "T00:00:00Z").getTime() + tz_offset * 60000);

	// Admin with no user_id → show all org entries; employee always sees only their own
	const userFilter = isAdmin
		? (user_id ? { user_id } : {})
		: { user_id: caller.id };

	const where = {
		...(orgId ? { org_id: orgId } : {}),
		...userFilter,
		end_time: { not: null as null },
		...(flagged_only && isAdmin ? { flagged: true } : {}),
		...(from && to
			? {
					start_time: {
						gte: localMidnightUTC(from),
						lte: new Date(localMidnightUTC(to).getTime() + 24 * 60 * 60 * 1000 - 1),
					},
				}
			: {}),
	};

	const [entries, total] = await Promise.all([
		prisma.timeEntry.findMany({
			where,
			orderBy: { start_time: "desc" },
			take,
			skip,
			include: {
				ticket: { select: { id: true, title: true, ticket_type: true } },
				user:   { select: { id: true, name: true, email: true } },
			},
		}),
		prisma.timeEntry.count({ where }),
	]);

	return { data: entries, page, totalPages: Math.ceil(total / take) || 1 };
}

// ─── Get Active ───────────────────────────────────────────────────────────────

export async function getActiveTimer(caller: Caller) {
	return prisma.timeEntry.findFirst({
		where: { user_id: caller.id, end_time: null },
		orderBy: { start_time: "desc" },
		include: { ticket: { select: { id: true, title: true, ticket_type: true } } },
	});
}

export async function getAllActiveTimers(caller: Caller) {
	if (!callerIsAdmin(caller)) throw Object.assign(new Error("Forbidden"), { status: 403 });
	const orgId = callerOrgId(caller);
	return prisma.timeEntry.findMany({
		where: { ...(orgId ? { org_id: orgId } : {}), end_time: null },
		orderBy: { start_time: "asc" },
		include: {
			ticket: { select: { id: true, title: true, ticket_type: true } },
			user:   { select: { id: true, name: true, email: true } },
		},
	});
}

export async function adminForceStop(entryId: string, caller: Caller) {
	if (!callerIsAdmin(caller)) throw Object.assign(new Error("Forbidden"), { status: 403 });
	const orgId = callerOrgId(caller);
	const entry = await prisma.timeEntry.findFirst({
		where: { id: entryId, end_time: null, ...(orgId ? { org_id: orgId } : {}) },
	});
	if (!entry) throw Object.assign(new Error("Active entry not found"), { status: 404 });

	const now = new Date();
	const updated = await prisma.timeEntry.update({
		where: { id: entryId },
		data: { end_time: now, auto_closed: true },
	});

	auditLog({
		org_id: orgId,
		actor_id: caller.id,
		actor_role: ROLES.ADMIN,
		action: "UPDATE",
		entity_type: "time_entry",
		entity_id: entryId,
		after: { end_time: now.toISOString(), auto_closed: true, force_stopped_by_admin: true },
	});

	return updated;
}

// ─── Start ────────────────────────────────────────────────────────────────────

export type StartTimerData = {
	title?: string;
	ticket_id?: string;
};

export async function startTimer(caller: Caller, data: StartTimerData) {
	const orgId = callerOrgId(caller);

	const active = await prisma.timeEntry.findFirst({
		where: { user_id: caller.id, end_time: null },
	});
	if (active) throw Object.assign(new Error("You already have an active session"), { status: 409 });

	let resolvedTitle = data.title ?? null;
	if (data.ticket_id) {
		const ticket = await prisma.ticket.findUnique({
			where: { id: data.ticket_id },
			select: { title: true, status: true },
		});
		if (ticket?.status === "stale")
			throw Object.assign(new Error("Cannot start a timer on a stale ticket"), { status: 403 });
		if (!resolvedTitle) resolvedTitle = ticket?.title ?? null;
	}

	const entry = await prisma.timeEntry.create({
		data: {
			...(orgId ? { org_id: orgId } : {}),
			user_id: caller.id,
			start_time: new Date(),
			title: resolvedTitle,
			ticket_id: data.ticket_id ?? null,
		},
	});

	if (data.ticket_id) {
		const ticket = await prisma.ticket.findUnique({
			where: { id: data.ticket_id },
			select: { id: true, status: true, user_id: true },
		});
		if (ticket && ticket.user_id === caller.id && (ticket.status === "assigned" || ticket.status === "on_hold")) {
			const actorName = (caller.user_metadata?.name as string | undefined) ?? caller.email ?? "Employee";
			await prisma.$transaction([
				prisma.ticket.update({ where: { id: data.ticket_id }, data: { status: "in_progress", started_at: new Date() } }),
				prisma.ticketComment.create({
					data: {
						task_id: data.ticket_id,
						user_id: caller.id,
						body: `${actorName} started the timer — ticket is now in progress.`,
						is_system: true,
					},
				}),
			]);
		}
	}

	auditLog({
		org_id: orgId,
		actor_id: caller.id,
		actor_role: callerIsAdmin(caller) ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "CREATE",
		entity_type: "time_entry",
		entity_id: entry.id,
		after: { ticket_id: data.ticket_id ?? null, title: resolvedTitle },
	});

	return entry;
}

// ─── Stop ─────────────────────────────────────────────────────────────────────

export type StopTimerData = {
	title?: string;
	description?: string;
};

export async function stopTimer(id: string, caller: Caller, data: StopTimerData) {
	const entry = await prisma.timeEntry.findFirst({
		where: { id, user_id: caller.id, end_time: null },
	});
	if (!entry) throw Object.assign(new Error("Active entry not found"), { status: 404 });

	const updated = await prisma.timeEntry.update({
		where: { id },
		data: {
			end_time: new Date(),
			...(data.title !== undefined ? { title: data.title } : {}),
			...(data.description !== undefined ? { description: data.description } : {}),
		},
	});

	if (entry.ticket_id) {
		const ticket = await prisma.ticket.findUnique({
			where: { id: entry.ticket_id },
			select: { id: true, status: true, user_id: true },
		});
		if (ticket && ticket.user_id === caller.id && ticket.status === "in_progress") {
			const actorName = (caller.user_metadata?.name as string | undefined) ?? caller.email ?? "Employee";
			await prisma.$transaction([
				prisma.ticket.update({ where: { id: entry.ticket_id }, data: { status: "assigned" } }),
				prisma.ticketComment.create({
					data: {
						task_id: entry.ticket_id,
						user_id: caller.id,
						body: `${actorName} stopped the timer — ticket reverted to assigned.`,
						is_system: true,
					},
				}),
			]);
		}
	}

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: callerIsAdmin(caller) ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "UPDATE",
		entity_type: "time_entry",
		entity_id: id,
		after: { end_time: updated.end_time?.toISOString() },
	});

	return updated;
}

// ─── Update Entry ─────────────────────────────────────────────────────────────

export type UpdateEntryData = {
	title?: string;
	description?: string;
	start_time?: string;
	end_time?: string;
};

export async function updateEntry(id: string, caller: Caller, data: UpdateEntryData) {
	const isAdmin = callerIsAdmin(caller);

	const entry = await prisma.timeEntry.findFirst({
		where: { id, end_time: { not: null }, ...(isAdmin ? {} : { user_id: caller.id }) },
	});
	if (!entry) throw Object.assign(new Error("Entry not found"), { status: 404 });

	const newStart = data.start_time ? new Date(data.start_time) : entry.start_time;
	const newEnd = data.end_time ? new Date(data.end_time) : entry.end_time!;

	if (newEnd <= newStart) throw Object.assign(new Error("End time must be after start time"), { status: 400 });

	const updated = await prisma.timeEntry.update({
		where: { id },
		data: {
			...(data.title !== undefined ? { title: data.title } : {}),
			...(data.description !== undefined ? { description: data.description } : {}),
			start_time: newStart,
			end_time: newEnd,
		},
	});

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: callerIsAdmin(caller) ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "UPDATE",
		entity_type: "time_entry",
		entity_id: id,
		before: { start_time: entry.start_time.toISOString(), end_time: entry.end_time?.toISOString(), title: entry.title },
		after: { start_time: newStart.toISOString(), end_time: newEnd.toISOString(), title: updated.title },
	});

	return updated;
}

// ─── Delete Entry ─────────────────────────────────────────────────────────────

export async function deleteEntry(id: string, caller: Caller) {
	const isAdmin = callerIsAdmin(caller);

	const entry = await prisma.timeEntry.findFirst({
		where: { id, ...(isAdmin ? {} : { user_id: caller.id }) },
	});
	if (!entry) throw Object.assign(new Error("Entry not found"), { status: 404 });
	if (!entry.end_time) throw Object.assign(new Error("Cannot delete an active timer"), { status: 400 });

	await prisma.timeEntry.delete({ where: { id } });

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: callerIsAdmin(caller) ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "DELETE",
		entity_type: "time_entry",
		entity_id: id,
	});
}

// ─── Bulk Delete ──────────────────────────────────────────────────────────────

export async function bulkDelete(ids: string[], caller: Caller) {
	const isAdmin = callerIsAdmin(caller);

	const entries = await prisma.timeEntry.findMany({
		where: { id: { in: ids }, end_time: { not: null }, ...(isAdmin ? {} : { user_id: caller.id }) },
		select: { id: true },
	});

	if (entries.length === 0) throw Object.assign(new Error("No valid entries found"), { status: 404 });

	const validIds = entries.map((e) => e.id);
	await prisma.timeEntry.deleteMany({ where: { id: { in: validIds } } });

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: callerIsAdmin(caller) ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "DELETE",
		entity_type: "time_entry",
		entity_id: "bulk",
		after: { deleted_ids: validIds, count: validIds.length },
	});

	return { deleted: validIds.length };
}

// ─── Merge ────────────────────────────────────────────────────────────────────

export async function mergeEntries(ids: string[], caller: Caller, title?: string) {
	const isAdmin = callerIsAdmin(caller);

	const entries = await prisma.timeEntry.findMany({
		where: { id: { in: ids }, end_time: { not: null }, ...(isAdmin ? {} : { user_id: caller.id }) },
		orderBy: { start_time: "asc" },
	});

	if (entries.length !== ids.length)
		throw Object.assign(new Error("One or more entries not found or still active"), { status: 404 });

	const ownerIds = new Set(entries.map((e) => e.user_id));
	if (ownerIds.size > 1)
		throw Object.assign(new Error("Cannot merge entries from different employees"), { status: 400 });

	const totalMs = entries.reduce(
		(sum, e) => sum + (new Date(e.end_time!).getTime() - new Date(e.start_time).getTime()),
		0,
	);

	const startTime = new Date(entries[0].start_time);
	const endTime = new Date(startTime.getTime() + totalMs);

	const ticketIds = new Set(entries.map((e) => e.ticket_id));
	const sharedTicketId = ticketIds.size === 1 ? entries[0].ticket_id : null;

	const merged = await prisma.$transaction(async (tx) => {
		await tx.timeEntry.deleteMany({ where: { id: { in: ids } } });
		return tx.timeEntry.create({
			data: {
				user_id: entries[0].user_id,
				start_time: startTime,
				end_time: endTime,
				title: title ?? entries[0].title ?? null,
				ticket_id: sharedTicketId,
			},
		});
	});

	auditLog({
		org_id: callerOrgId(caller),
		actor_id: caller.id,
		actor_role: isAdmin ? ROLES.ADMIN : ROLES.EMPLOYEE,
		action: "MERGE",
		entity_type: "time_entry",
		entity_id: merged.id,
		after: { merged_from: ids, count: ids.length, total_ms: totalMs },
	});

	return merged;
}
