import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { NextRequest } from "next/server";
import { createNotification } from "@/lib/utils/create-notification";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// get current user
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// get id from params
		const { id } = await params;
		// check if task really exist
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		// Only assigned worker can complete
		if (task.user_id !== user.id) return errorResponse("Not allowed", 403);

		// mark task as completed
		const updated = await prisma.task.update({
			where: { id },
			data: { status: "completed", completed_at: new Date() },
		});

		// Notify creator if different from assignee (fire-and-forget)
		if (task.created_by !== user.id) {
			createNotification({
				user_id: task.created_by,
				type: "task_completed",
				title: "Task completed",
				body: `"${task.title}" has been marked as complete.`,
				link: `/dashboard/tasks/${id}`,
			}).catch(() => {});
		}

		return ok(updated);
	} catch (error) {
		return errorResponse("Failed to Mark task as Completed", 500);
	}
}
