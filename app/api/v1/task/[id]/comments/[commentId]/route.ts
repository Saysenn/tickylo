import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { ROLES } from "@/configs/rbac.config";

/**
 * DELETE /api/v1/task/[id]/comments/[commentId]
 * Admin can delete any comment. Employees can only delete their own.
 * System comments cannot be deleted.
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string; commentId: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { commentId } = await params;

		const comment = await prisma.taskComment.findUnique({
			where: { id: commentId },
		});
		if (!comment) return errorResponse("Comment not found", 404);

		if (comment.is_system)
			return errorResponse("System comments cannot be deleted", 403);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		if (!isAdmin && comment.user_id !== user.id) {
			return errorResponse("Forbidden", 403);
		}

		await prisma.taskComment.delete({ where: { id: commentId } });

		return ok({ success: true });
	} catch (err) {
		console.error("[task:comments:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
