import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ROLES } from "@/configs/rbac.config";

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

		// Employee can only view their own task or an unassigned one
		if (!isAdmin && task.user_id !== null && task.user_id !== user.id) {
			return errorResponse("Forbidden", 403);
		}

		return ok(task);
	} catch (error) {
		console.error("[task:GET]", error);
		return errorResponse("Failed to fetch task", 500);
	}
}

const adminUpdateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional(),
	status: z.enum(["pending", "assigned", "in_progress", "completed"]).optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	due_date: z.coerce.date().optional(),
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

		const updatedTask = await prisma.task.update({
			where: { id },
			data: validated.data,
			include: {
				assignee: { select: { id: true, name: true, email: true } },
			},
		});

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

		return ok({ success: true });
	} catch (error) {
		console.error("[task:DELETE]", error);
		return errorResponse("Failed to delete task", 500);
	}
}
