import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";

/**
 * PATCH /api/v1/notifications/read-all
 * Marks all unread notifications as read for the current user.
 */
export async function PATCH() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const orgId = user.app_metadata?.org_id as string | undefined;
		const { count } = await prisma.notification.updateMany({
			where: { user_id: user.id, read: false, ...(orgId ? { org_id: orgId } : {}) },
			data: { read: true },
		});

		return ok({ updated: count });
	} catch (err) {
		console.error("[notifications:read-all:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
