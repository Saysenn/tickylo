import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";

/**
 * PATCH /api/v1/notifications/[id]/read
 * Marks a single notification as read. User can only mark their own.
 */
export async function PATCH(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const notification = await prisma.notification.findUnique({ where: { id } });
		if (!notification) return errorResponse("Not found", 404);
		if (notification.user_id !== user.id) return errorResponse("Forbidden", 403);

		const updated = await prisma.notification.update({
			where: { id },
			data: { read: true },
		});

		return ok(updated);
	} catch (err) {
		console.error("[notifications:read:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
