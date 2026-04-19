import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ROLES } from "@/configs/rbac.config";
import { createNotification, notifyEmployees } from "@/lib/utils/create-notification";

/**
 * GET /api/v1/task/[id]
 * Admin: any task. Employee: own assigned tasks or unassigned tasks.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;

		const task = await prisma.task.findUnique({
			where: { id },
			include: {
				assignee: { select: { id: true, name: true, email: true } },
				creator: { select: { id: true, name: true, email: true } },
			},
		});

		if (!task) return errorResponse("Task not found", 404);

		return ok(task);
	} catch (error) {
		console.error("[task:GET]", error);
		return errorResponse("Failed to fetch task", 500);
	}
}

const adminUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	status: z.enum(["pending", "assigned", "in_progress", "on_hold", "completed", "closed"]).optional(),
	priority: z.enum(["low", "medium", "high", "critical"]).optional(),
	due_date: z.coerce.date().nullable().optional(),
	ticket_type: z.enum(["internal_task", "request", "incident", "change"]).optional(),
	client_name: z.string().max(200).nullable().optional(),
	client_email: z.string().email().max(200).nullable().optional(),
	estimated_hours: z.number().positive().nullable().optional(),
	billable_hours: z.number().nonnegative().nullable().optional(),
	implementation_plan: z.string().max(5000).nullable().optional(),
	rollback_plan: z.string().max(5000).nullable().optional(),
	links: z.array(z.object({ url: z.string().url().max(2000), label: z.string().max(100).optional() })).max(20).nullable().optional(),
});

/**
 * PATCH /api/v1/task/[id]
 * Admin: update any field
 * Employee: not allowed via this route (use /start and /complete)
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		if (!isAdmin) return errorResponse("Forbidden", 403);

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		const body = await request.json().catch(() => ({}));
		const validated = adminUpdateSchema.safeParse(body);
		if (!validated.success) return errorResponse("Invalid request body", 400);

		const { links, status, ...rest } = validated.data;

		// Auto-clear timestamp fields when status changes away from their trigger
		const statusOverrides: Record<string, unknown> = {};
		if (status !== undefined && status !== task.status) {
			if (status !== "completed" && status !== "closed") {
				statusOverrides.completed_at = null;
			}
			if (status === "pending" || status === "assigned") {
				statusOverrides.started_at = null;
			}
			if (status === "pending") {
				statusOverrides.assigned_at = null;
			}
		}

		const updatedTask = await prisma.task.update({
			where: { id },
			data: {
				...rest,
				...(status !== undefined ? { status } : {}),
				...statusOverrides,
				// Prisma Json field: null → empty array, undefined → unchanged
				...(links !== undefined ? { links: links ?? [] } : {}),
			},
			include: {
				assignee: { select: { id: true, name: true, email: true } },
			},
		});

		// Notify assignee if task has one (fire-and-forget)
		if (updatedTask.user_id) {
			createNotification({
				user_id: updatedTask.user_id,
				type: "task_updated",
				title: "Ticket updated",
				body: `"${updatedTask.title}" has been updated by admin.`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		return ok(updatedTask);
	} catch (error) {
		console.error("[task:PATCH]", error);
		return errorResponse("Failed to update task", 500);
	}
}

/**
 * DELETE /api/v1/task/[id] — admin only
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		await prisma.task.delete({ where: { id } });

		// Notify whoever was affected — skip the admin who performed the action
		if (task.user_id && task.user_id !== admin.id) {
			createNotification({
				user_id: task.user_id,
				type: "task_deleted",
				title: "Ticket deleted",
				body: `"${task.title}" has been deleted by admin.`,
			}).catch(() => {});
		} else if (!task.user_id) {
			notifyEmployees({
				type: "task_deleted",
				title: "Ticket deleted",
				body: `"${task.title}" has been removed by admin.`,
			}).catch(() => {});
		}

		return ok({ success: true });
	} catch (error) {
		console.error("[task:DELETE]", error);
		return errorResponse("Failed to delete task", 500);
	}
}
