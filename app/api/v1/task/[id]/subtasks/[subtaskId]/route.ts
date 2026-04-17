import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";

const updateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	completed: z.boolean().optional(),
	position: z.number().int().min(0).optional(),
});

/**
 * PATCH /api/v1/task/[id]/subtasks/[subtaskId]
 * Toggle completed, rename, or reorder.
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string; subtaskId: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { subtaskId } = await params;

		const subtask = await prisma.taskSubtask.findUnique({ where: { id: subtaskId } });
		if (!subtask) return errorResponse("Subtask not found", 404);

		const body = await request.json();
		const validated = updateSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		}

		const updated = await prisma.taskSubtask.update({
			where: { id: subtaskId },
			data: validated.data,
		});

		return ok(updated);
	} catch (err) {
		console.error("[subtasks:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * DELETE /api/v1/task/[id]/subtasks/[subtaskId]
 */
export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string; subtaskId: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { subtaskId } = await params;

		await prisma.taskSubtask.delete({ where: { id: subtaskId } });

		return ok({ success: true });
	} catch (err) {
		console.error("[subtasks:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
