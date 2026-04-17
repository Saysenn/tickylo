import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createNotification, notifyEmployees } from "@/lib/utils/create-notification";

const schema = z.object({
	action: z.enum(["assign", "complete", "delete"]),
	ids: z.array(z.string()).min(1).max(100),
	user_id: z.string().uuid().optional(), // required for action=assign
});

/**
 * POST /api/v1/task/bulk
 * Admin only. Bulk assign, complete, or delete tasks.
 * Returns { succeeded: string[], failed: string[] }
 */
export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const body = await request.json();
		const validated = schema.safeParse(body);
		if (!validated.success) {
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		}

		const { action, ids, user_id } = validated.data;

		if (action === "assign" && !user_id) {
			return errorResponse("user_id is required for assign action", 400);
		}

		const succeeded: string[] = [];
		const failed: string[] = [];

		for (const id of ids) {
			try {
				const task = await prisma.task.findUnique({ where: { id } });
				if (!task) { failed.push(id); continue; }

				if (action === "assign") {
					const newAssignee = await prisma.user.findUnique({
						where: { id: user_id! },
						select: { name: true, email: true },
					});
					if (!newAssignee) { failed.push(id); continue; }

					const oldName = task.user_id
						? (await prisma.user.findUnique({ where: { id: task.user_id }, select: { name: true, email: true } }))?.name ?? "Unassigned"
						: "Unassigned";

					await prisma.$transaction([
						prisma.task.update({
							where: { id },
							data: { user_id: user_id!, status: "assigned", assigned_at: new Date(), started_at: null },
						}),
						prisma.taskComment.create({
							data: {
								task_id: id,
								user_id: null,
								body: `Task reassigned from ${oldName} to ${newAssignee.name ?? newAssignee.email} by admin.`,
								is_system: true,
							},
						}),
					]);

					createNotification({
						user_id: user_id!,
						type: task.user_id ? "task_reassigned" : "task_assigned",
						title: task.user_id ? "Task reassigned to you" : "New task assigned",
						body: `"${task.title}" has been assigned to you.`,
						link: `/dashboard/tasks/${id}`,
					}).catch(() => {});

				} else if (action === "complete") {
					if (task.status === "completed") { succeeded.push(id); continue; }
					await prisma.task.update({
						where: { id },
						data: { status: "completed", completed_at: new Date() },
					});
					if (task.created_by !== admin.id) {
						createNotification({
							user_id: task.created_by,
							type: "task_completed",
							title: "Task completed",
							body: `"${task.title}" has been marked complete.`,
							link: `/dashboard/tasks/${id}`,
						}).catch(() => {});
					}

				} else if (action === "delete") {
					await prisma.task.delete({ where: { id } });
					if (task.user_id) {
						createNotification({
							user_id: task.user_id,
							type: "task_deleted",
							title: "Task removed",
							body: `"${task.title}" has been deleted by admin.`,
						}).catch(() => {});
					} else {
						notifyEmployees({
							type: "task_deleted",
							title: "Task removed",
							body: `"${task.title}" has been removed by admin.`,
						}).catch(() => {});
					}
				}

				succeeded.push(id);
			} catch {
				failed.push(id);
			}
		}

		return ok({ succeeded, failed });
	} catch (err) {
		console.error("[task:bulk:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
