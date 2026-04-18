import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { NextRequest } from "next/server";
import { createNotification, notifyWatchers } from "@/lib/utils/create-notification";
import { ROLES } from "@/configs/rbac.config";

/**
 * PATCH /api/v1/task/[id]/stale
 * Admin only. Marks a ticket as stale and notifies the assignee + watchers.
 */
export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		if (user.app_metadata?.role !== ROLES.ADMIN) {
			return errorResponse("Admin only", 403);
		}

		const { id } = await params;

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Ticket not found", 404);

		if (["completed", "closed", "rejected"].includes(task.status)) {
			return errorResponse("Cannot mark a finished ticket as stale", 400);
		}

		const adminName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "Admin";

		const [updated] = await prisma.$transaction([
			prisma.task.update({ where: { id }, data: { status: "stale" } }),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: user.id,
					body: `${adminName} marked this ticket as stale.`,
					is_system: true,
				},
			}),
		]);

		const notifPayload = {
			type: "task_updated" as const,
			title: "Ticket marked as stale",
			body: `"${task.title}" has been marked as stale.`,
			link: `/dashboard/tickets/${id}`,
		};

		// Notify assignee
		if (task.user_id) {
			createNotification({ user_id: task.user_id, ...notifPayload }).catch(() => {});
		}

		// Notify watchers (skip assignee if already notified)
		notifyWatchers(id, notifPayload, task.user_id ? [task.user_id] : []).catch(() => {});

		return ok(updated);
	} catch (error) {
		console.error("[task:stale:PATCH]", error);
		return errorResponse("Failed to mark ticket as stale", 500);
	}
}
