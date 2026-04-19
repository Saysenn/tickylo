import { prisma } from "@/lib/infra/prisma";

interface NotificationData {
	user_id: string;
	org_id?: string;
	type: string;
	title: string;
	body: string;
	link?: string;
}

/**
 * Creates a notification for a user. Fire-and-forget safe —
 * wrap in a separate try/catch so notification failures never
 * break the primary operation.
 *
 * org_id is auto-resolved from the target user if not supplied.
 */
export async function createNotification(data: NotificationData) {
	let org_id = data.org_id;
	if (!org_id) {
		const user = await prisma.user.findUnique({
			where: { id: data.user_id },
			select: { org_id: true },
		});
		org_id = user?.org_id ?? undefined;
	}
	return prisma.notification.create({ data: { ...data, org_id } });
}

/**
 * Notify all admin users in the given org. Looks up admins from the users table.
 * Optional excludeId skips one admin (e.g. the one who triggered the action).
 */
export async function notifyAdmins(
	data: Omit<NotificationData, "user_id"> & { excludeId?: string; orgId?: string },
) {
	const { excludeId, orgId, ...notifData } = data;
	const admins = await prisma.user.findMany({
		where: {
			role: "admin",
			...(orgId ? { org_id: orgId } : {}),
			...(excludeId ? { id: { not: excludeId } } : {}),
		},
		select: { id: true, org_id: true },
	});
	if (admins.length === 0) return;
	await prisma.notification.createMany({
		data: admins.map((a) => ({
			...notifData,
			user_id: a.id,
			org_id: a.org_id ?? orgId ?? notifData.org_id,
		})),
	});
}

/**
 * Notify all watchers of a task, skipping any user IDs in the excludeIds set.
 */
export async function notifyWatchers(
	taskId: string,
	data: Omit<NotificationData, "user_id">,
	excludeIds: string[] = [],
) {
	const watchers = await prisma.taskWatcher.findMany({
		where: { task_id: taskId },
		select: { user_id: true, user: { select: { org_id: true } } },
	});
	const recipients = watchers.filter((w) => !excludeIds.includes(w.user_id));
	if (recipients.length === 0) return;
	await prisma.notification.createMany({
		data: recipients.map((w) => ({
			...data,
			user_id: w.user_id,
			org_id: w.user.org_id ?? data.org_id,
		})),
	});
}

/**
 * Notify all non-admin users (employees) in the given org.
 */
export async function notifyEmployees(data: Omit<NotificationData, "user_id"> & { orgId?: string }) {
	const { orgId, ...notifData } = data;
	const employees = await prisma.user.findMany({
		where: {
			role: { not: "admin" },
			...(orgId ? { org_id: orgId } : {}),
		},
		select: { id: true, org_id: true },
	});
	if (employees.length === 0) return;
	await prisma.notification.createMany({
		data: employees.map((e) => ({
			...notifData,
			user_id: e.id,
			org_id: e.org_id ?? orgId ?? notifData.org_id,
		})),
	});
}
