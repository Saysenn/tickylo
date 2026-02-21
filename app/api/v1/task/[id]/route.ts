import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";

/**
 * PATCH AND DELETE TASKS ENDPOINTS
 */

const updateTaskSchema = z.object({
	title: z.string().max(200).optional(),
	description: z.string().max(1000).optional(),
	status: z.enum(["pending", "in_progress", "completed"]).optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	due_date: z.date().optional(),
	completed_at: z.date().optional(),
});

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// check if id exist
		const { id } = await params;
		if (!id) return errorResponse("Task not found", 404);

		// get current user
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// verify ownership
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);
		if (task.user_id !== user.id)
			return errorResponse("Task not Assigned to you", 401);

		// parse body response
		const body = await request.json().catch(() => ({}));
		const validated = updateTaskSchema.safeParse(body);
		if (!validated.success) return errorResponse("Invalid request body", 400);

		// update data
		const updatedTask = await prisma.task.update({
			where: { id },
			data: validated.data,
		});

		return ok(updatedTask);
	} catch (error) {
		return errorResponse("Failed to Update Task", 500);
	}
}

export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		// check if id exist
		const { id } = await params;
		if (!id) return errorResponse("Task not found", 404);

		// get current user
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// verify ownership
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);
		if (task.user_id !== user.id)
			return errorResponse("Task not Assigned to you", 401);

		// parse body response
		const body = await request.json().catch(() => ({}));
		const validated = updateTaskSchema.safeParse(body);
		if (!validated.success) return errorResponse("Invalid request body", 400);

		// delete task
		// update data
		const deletedTask = await prisma.task.delete({
			where: { id },
		});

		return ok(deletedTask);
	} catch (error) {
		return errorResponse("Failed to Delete Task", 500);
	}
}
