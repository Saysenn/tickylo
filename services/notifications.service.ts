import { prisma } from "@/lib/infra/prisma";
import type { Caller } from "./ticket.service";

const callerOrgId = (c: Caller) => c.app_metadata?.org_id as string | undefined;

export const NOTIFICATION_TYPE_GROUPS = {
	tasks:       ["task_assigned", "task_reassigned", "task_claimed", "task_completed", "task_available", "task_started", "task_updated", "task_deleted", "task_watched"],
	timers:      ["timer_auto_closed", "due_date_reminder", "priority_escalated"],
	leave:       ["leave_requested", "leave_approved", "leave_rejected"],
	comments:    ["comment_added", "comment_mention"],
	departments: ["department_assigned", "department_manager"],
} as const;

export type NotificationTypeGroup = keyof typeof NOTIFICATION_TYPE_GROUPS;

export type ListNotificationsParams = {
	page?: number;
	limit?: number;
	unread_only?: boolean;
	type_group?: NotificationTypeGroup;
};

export async function listNotifications(caller: Caller, params: ListNotificationsParams) {
	const { page = 1, limit = 20, unread_only = false, type_group } = params;
	const take = Math.min(50, Math.max(1, limit));
	const skip = (Math.max(1, page) - 1) * take;
	const orgId = callerOrgId(caller);

	const where = {
		user_id: caller.id,
		...(orgId ? { org_id: orgId } : {}),
		...(unread_only ? { read: false } : {}),
		...(type_group && NOTIFICATION_TYPE_GROUPS[type_group]
			? { type: { in: [...NOTIFICATION_TYPE_GROUPS[type_group]] } }
			: {}),
	};

	const [notifications, total, unreadCount] = await Promise.all([
		prisma.notification.findMany({ where, orderBy: { created_at: "desc" }, skip, take }),
		prisma.notification.count({ where }),
		prisma.notification.count({ where: { user_id: caller.id, read: false, ...(orgId ? { org_id: orgId } : {}) } }),
	]);

	return { data: notifications, pagination: { page, limit: take, total, pages: Math.ceil(total / take) }, unreadCount };
}

export async function markRead(id: string, caller: Caller) {
	const notification = await prisma.notification.findUnique({ where: { id } });
	if (!notification) throw Object.assign(new Error("Not found"), { status: 404 });
	if (notification.user_id !== caller.id) throw Object.assign(new Error("Forbidden"), { status: 403 });

	return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllRead(caller: Caller) {
	const orgId = callerOrgId(caller);
	const { count } = await prisma.notification.updateMany({
		where: { user_id: caller.id, read: false, ...(orgId ? { org_id: orgId } : {}) },
		data: { read: true },
	});
	return { updated: count };
}

export async function bulkMarkRead(ids: string[], caller: Caller) {
	const { count } = await prisma.notification.updateMany({
		where: { id: { in: ids }, user_id: caller.id },
		data: { read: true },
	});
	return { updated: count };
}

export async function bulkDeleteNotifications(ids: string[], caller: Caller) {
	const { count } = await prisma.notification.deleteMany({
		where: { id: { in: ids }, user_id: caller.id },
	});
	return { deleted: count };
}
