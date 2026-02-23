import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { ROLES } from "@/configs/rbac.config";

/**
 * PATCH /api/v1/task/[id]/claim
 * Employee claims an unassigned task (user_id === null)
 */
export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;

		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// Admins assign via /assign — employees use this endpoint
		if (user.app_metadata?.role === ROLES.ADMIN) {
			return errorResponse("Admins should use the assign endpoint", 400);
		}

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		if (task.user_id !== null) {
			return errorResponse("Task is already assigned", 409);
		}

		const updated = await prisma.task.update({
			where: { id },
			data: {
				user_id: user.id,
				status: "assigned",
				assigned_at: new Date(),
			},
		});

		return ok(updated);
	} catch (error) {
		console.error("[task:CLAIM]", error);
		return errorResponse("Failed to claim task", 500);
	}
}
