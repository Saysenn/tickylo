import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { NextRequest } from "next/server";
import { createNotification, notifyAdmins } from "@/lib/utils/create-notification";

/**
 * PATCH /api/v1/task/[id]/reopen
 * Assignee only. Moves a resolved ticket back to assigned (not in_progress —
 * the employee chooses when to restart work via the timer).
 * Admins should use the main PATCH /api/v1/task/[id] to change any status.
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

		if (task.user_id !== user.id) return errorResponse("Only the assignee can reopen this ticket", 403);
		if (task.status !== "completed") return errorResponse("Only resolved tickets can be reopened", 400);

		const actorName = (user.user_metadata?.name as string | undefined) ?? user.email ?? "The assignee";

		const [updated] = await prisma.$transaction([
			prisma.task.update({
				where: { id },
				data: { status: "assigned", completed_at: null },
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: user.id,
					body: `Ticket reopened by ${actorName} — status set back to assigned.`,
					is_system: true,
				},
			}),
		]);

		// Notify creator
		if (task.created_by !== user.id) {
			createNotification({
				user_id: task.created_by,
				type: "task_updated",
				title: "Ticket reopened",
				body: `${actorName} reopened "${task.title}".`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		// Notify admins
		notifyAdmins({
			type: "task_updated",
			title: "Ticket reopened",
			body: `${actorName} reopened "${task.title}".`,
			link: `/dashboard/tickets/${id}`,
			excludeId: task.created_by,
		}).catch(() => {});

		return ok(updated);
	} catch (error) {
		console.error("[task:reopen:PATCH]", error);
		return errorResponse("Failed to reopen ticket", 500);
	}
}
