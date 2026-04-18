import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { NextRequest } from "next/server";
import { createNotification, notifyAdmins, notifyWatchers } from "@/lib/utils/create-notification";
import { ROLES } from "@/configs/rbac.config";

/**
 * PATCH /api/v1/task/[id]/hold
 * Assignee or admin. Puts an assigned/in_progress ticket on hold.
 * Automatically stops any active timer running on this ticket.
 */
export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Ticket not found", 404);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		// Employees can only put their own tickets on hold
		if (!isAdmin && task.user_id !== user.id) {
			return errorResponse("Only the assignee can put this ticket on hold", 403);
		}

		if (!["assigned", "in_progress"].includes(task.status)) {
			return errorResponse("Only assigned or in-progress tickets can be put on hold", 400);
		}

		const actorName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "Employee";

		// Stop any active timer on this ticket (the assignee's timer)
		const activeEntry = task.user_id
			? await prisma.timeEntry.findFirst({
					where: { ticket_id: id, user_id: task.user_id, end_time: null },
				})
			: null;

		const now = new Date();

		await prisma.$transaction([
			prisma.task.update({ where: { id }, data: { status: "on_hold" } }),
			// Stop the timer if one is running
			...(activeEntry
				? [prisma.timeEntry.update({ where: { id: activeEntry.id }, data: { end_time: now } })]
				: []),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: user.id,
					body: activeEntry
						? `${actorName} put this ticket on hold — active timer stopped.`
						: `${actorName} put this ticket on hold.`,
					is_system: true,
				},
			}),
		]);

		const updated = await prisma.task.findUnique({ where: { id } });

		const notifPayload = {
			type: "task_updated" as const,
			title: "Ticket on hold",
			body: `${actorName} put "${task.title}" on hold.`,
			link: `/dashboard/tickets/${id}`,
		};

		// If an admin put it on hold, notify the assignee
		if (isAdmin && task.user_id && task.user_id !== user.id) {
			createNotification({ user_id: task.user_id, ...notifPayload }).catch(() => {});
		}

		// Notify watchers (skip actor + assignee already notified above)
		const skipIds = [user.id, ...(isAdmin && task.user_id ? [task.user_id] : [])];
		notifyWatchers(id, notifPayload, skipIds).catch(() => {});

		// Notify admins if the actor is an employee
		if (!isAdmin) {
			notifyAdmins({ ...notifPayload, excludeId: user.id }).catch(() => {});
		}

		return ok(updated);
	} catch (error) {
		console.error("[task:hold:PATCH]", error);
		return errorResponse("Failed to put ticket on hold", 500);
	}
}
