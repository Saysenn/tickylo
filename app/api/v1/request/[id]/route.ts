import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";
import z from "zod";

const bulkDeleteSchema = z.object({
	ids: z.array(z.string()).min(1),
});

/**
 * DELETE /api/v1/request/[id]
 * Employee: deletes own pending or cancelled request
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const leave = await prisma.leave.findUnique({ where: { id } });
		if (!leave) return errorResponse("Leave request not found", 404);

		// Admin can delete any request
		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		if (!isAdmin) {
			if (leave.user_id !== user.id)
				return errorResponse("You can only delete your own requests", 403);
			if (leave.status !== "pending" && leave.status !== "cancelled")
				return errorResponse("Only pending or cancelled requests can be deleted", 400);
		}

		await prisma.leave.delete({ where: { id } });

		return ok({ success: true });
	} catch (err) {
		console.error("[request:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
