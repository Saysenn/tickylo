import { prisma } from "@/lib/infra/prisma";
import { withOrg } from "@/lib/utils/org-filter";
import { auditLog } from "@/lib/utils/audit";
import { createNotification, notifyAdmins } from "@/lib/utils/create-notification";
import { ROLES } from "@/configs/rbac.config";
import type { Caller } from "./ticket.service";

// ─── List ─────────────────────────────────────────────────────────────────────

export type ListRequestsParams = {
	page?: number;
	limit?: number;
	status?: string;
};

export async function listRequests(caller: Caller, params: ListRequestsParams) {
	const { page = 1, limit = 10, status } = params;
	const skip = (Math.max(1, page) - 1) * Math.min(50, Math.max(1, limit));
	const take = Math.min(50, Math.max(1, limit));
	const isAdminCaller = caller.app_metadata?.role === ROLES.ADMIN;
	const orgId = caller.app_metadata?.org_id as string | undefined;

	const where = isAdminCaller
		? { ...withOrg(orgId), ...(status ? { status: status as any } : {}) }
		: { ...withOrg(orgId), user_id: caller.id, ...(status ? { status: status as any } : {}) };

	const [leaves, total] = await Promise.all([
		prisma.leave.findMany({
			where,
			include: isAdminCaller
				? { user: { select: { id: true, name: true, email: true } } }
				: undefined,
			orderBy: { created_at: "desc" },
			take,
			skip,
		}),
		prisma.leave.count({ where }),
	]);

	return { data: leaves, page, totalPages: Math.ceil(total / take) || 1, total };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export type CreateRequestData = {
	startDate: Date;
	endDate: Date;
	type: "vacation" | "sick" | "emergency";
	reason?: string;
};

export async function createRequest(caller: Caller, data: CreateRequestData) {
	if (data.endDate < data.startDate)
		throw Object.assign(new Error("End date must be after start date"), { status: 400 });

	const orgId = caller.app_metadata?.org_id as string | undefined;

	const leave = await prisma.leave.create({
		data: {
			...(orgId ? { org_id: orgId } : {}),
			user_id: caller.id,
			start: data.startDate,
			end: data.endDate,
			type: data.type,
			reason: data.reason,
			status: "pending",
		},
	});

	const name = (caller.user_metadata?.name as string | undefined) ?? caller.email ?? "An employee";
	notifyAdmins({
		type: "leave_requested",
		title: "New leave request",
		body: `${name} submitted a ${data.type} leave request.`,
		link: `/dashboard/requests`,
	}).catch(() => {});

	return leave;
}

// ─── Approve ──────────────────────────────────────────────────────────────────

export async function approveRequest(id: string, admin: Caller, reason?: string) {
	const orgId = admin.app_metadata?.org_id as string | undefined;

	const result = await prisma.$transaction(async (tx) => {
		const leave = await tx.leave.findUnique({ where: { id } });
		if (!leave) throw Object.assign(new Error("Leave request not found"), { status: 404 });
		if (leave.status !== "pending")
			throw Object.assign(new Error("Only pending leaves can be approved"), { status: 400 });

		const leaveFieldMap: Record<string, string> = {
			sick: "sick_leave",
			vacation: "vacation_leave",
			emergency: "emergency_leave",
		};

		const field = leaveFieldMap[leave.type];
		if (field) {
			const meta = await tx.userMetaData.findUnique({ where: { user_id: leave.user_id } });
			if (meta) {
				const balance = Number((meta as Record<string, unknown>)[field] ?? 0);
				if (balance <= 0)
					throw Object.assign(new Error("User does not have enough leave balance"), { status: 400 });
				await tx.userMetaData.update({
					where: { user_id: leave.user_id },
					data: { [field]: { decrement: 1 } },
				});
			}
		}

		return tx.leave.update({ where: { id }, data: { status: "approved", reason } });
	});

	auditLog({
		org_id: orgId,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "APPROVE",
		entity_type: "leave_request",
		entity_id: id,
		after: { status: "approved", reason },
	});

	createNotification({
		user_id: result.user_id,
		type: "leave_approved",
		title: "Leave request approved",
		body: `Your ${result.type} leave request has been approved.`,
		link: `/dashboard/requests`,
	}).catch(() => {});

	return result;
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export async function rejectRequest(id: string, admin: Caller, reason?: string) {
	const orgId = admin.app_metadata?.org_id as string | undefined;

	const leave = await prisma.leave.findUnique({ where: { id } });
	if (!leave) throw Object.assign(new Error("Leave request not found"), { status: 404 });
	if (leave.status !== "pending")
		throw Object.assign(new Error("Only pending leave requests can be rejected"), { status: 400 });

	const updated = await prisma.leave.update({ where: { id }, data: { status: "rejected", reason } });

	auditLog({
		org_id: orgId,
		actor_id: admin.id,
		actor_role: ROLES.ADMIN,
		action: "REJECT",
		entity_type: "leave_request",
		entity_id: id,
		after: { status: "rejected", reason },
	});

	createNotification({
		user_id: updated.user_id,
		type: "leave_rejected",
		title: "Leave request rejected",
		body: `Your ${updated.type} leave request has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
		link: `/dashboard/requests`,
	}).catch(() => {});

	return updated;
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelRequest(id: string, caller: Caller, reason?: string) {
	const leave = await prisma.leave.findUnique({ where: { id } });
	if (!leave) throw Object.assign(new Error("Leave request not found"), { status: 404 });
	if (leave.user_id !== caller.id)
		throw Object.assign(new Error("You can only cancel your own leave requests"), { status: 403 });
	if (leave.status !== "pending")
		throw Object.assign(new Error("Only pending leave requests can be cancelled"), { status: 400 });

	return prisma.leave.update({ where: { id }, data: { status: "cancelled", reason } });
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function bulkDeleteRequests(ids: string[]) {
	const { count } = await prisma.leave.deleteMany({ where: { id: { in: ids } } });
	return { deleted: count };
}

export async function deleteRequest(id: string, caller: Caller) {
	const leave = await prisma.leave.findUnique({ where: { id } });
	if (!leave) throw Object.assign(new Error("Leave request not found"), { status: 404 });

	const isAdminCaller = caller.app_metadata?.role === ROLES.ADMIN;

	if (!isAdminCaller) {
		if (leave.user_id !== caller.id)
			throw Object.assign(new Error("You can only delete your own requests"), { status: 403 });
		if (leave.status !== "pending" && leave.status !== "cancelled")
			throw Object.assign(new Error("Only pending or cancelled requests can be deleted"), { status: 400 });
	}

	await prisma.leave.delete({ where: { id } });
}
