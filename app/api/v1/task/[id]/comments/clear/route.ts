import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { ROLES } from "@/configs/rbac.config";

/**
 * DELETE /api/v1/task/[id]/comments/clear
 * Deletes all non-system comments for a task.
 * Only the task creator or admin can do this.
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		const isCreator = task.created_by === user.id;

		if (!isAdmin && !isCreator) {
			return errorResponse("Forbidden", 403);
		}

		await prisma.taskComment.deleteMany({
			where: { task_id: id, is_system: false },
		});

		return ok({ success: true });
	} catch (err) {
		console.error("[task:comments:clear:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
