import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createNotification } from "@/lib/utils/create-notification";

const updateTaskSchema = z.object({
	user_id: z.string().uuid(),
});

/**
 * PATCH /api/v1/task/[id]/assign
 * Admin only. Assigns or reassigns a task to any worker at any status
 * (pending, assigned, in_progress). Completed tasks cannot be reassigned.
 * On reassign mid-progress, status resets to "assigned" and started_at clears.
 * A system comment is auto-posted to the thread as an audit trail.
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const body = await request.json();
		const validated = updateTaskSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		}

		const { user_id } = validated.data;

		const task = await prisma.task.findUnique({
			where: { id },
			include: { assignee: { select: { name: true, email: true } } },
		});
		if (!task) return errorResponse("Task not found", 404);

		if (task.status === "completed") {
			return errorResponse("Completed tasks cannot be reassigned", 400);
		}

		const newAssignee = await prisma.user.findUnique({
			where: { id: user_id },
			select: { name: true, email: true },
		});
		if (!newAssignee) return errorResponse("User not found", 404);

		// Build system comment body for audit trail
		const oldName = task.assignee?.name ?? task.assignee?.email ?? "Unassigned";
		const newName = newAssignee.name ?? newAssignee.email;
		const systemBody = `Task reassigned from ${oldName} to ${newName} by admin.`;

		const [updated] = await prisma.$transaction([
			prisma.task.update({
				where: { id },
				data: {
					user_id,
					status: "assigned",
					started_at: null,
					assigned_at: new Date(),
				},
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: null,
					body: systemBody,
					is_system: true,
				},
			}),
		]);

		// Notify the new assignee (fire-and-forget)
		const isReassign = !!task.user_id;
		createNotification({
			user_id,
			type: isReassign ? "task_reassigned" : "task_assigned",
			title: isReassign ? "Task reassigned to you" : "New task assigned",
			body: `"${task.title}" has been ${isReassign ? "reassigned" : "assigned"} to you.`,
			link: `/dashboard/tasks/${id}`,
		}).catch(() => {});

		return ok(updated);
	} catch (error) {
		console.error("[tasks:assign:PATCH]", error);
		return errorResponse("Failed to assign the task", 500);
	}
}
