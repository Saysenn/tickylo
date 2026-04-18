import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { NextRequest } from "next/server";
import { notifyAdmins } from "@/lib/utils/create-notification";

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// get id from params
		const { id } = await params;
		// check is task exist
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		// Only assigned worker can start
		if (task.user_id !== user.id) return errorResponse("Not allowed", 403);

		// start the task
		const updated = await prisma.task.update({
			where: { id },
			data: { status: "in_progress", started_at: new Date() },
		});

		// Notify admins (fire-and-forget)
		const starterName = user.user_metadata?.name ?? user.email ?? "An employee";
		notifyAdmins({
			type: "task_started",
			title: "Ticket started",
			body: `${starterName} started working on "${task.title}".`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});

		return ok(updated);
	} catch (error) {
		return errorResponse("Failed to Start the Task", 500);
	}
}
