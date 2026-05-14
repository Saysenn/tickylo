import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as NotificationsService from "@/services/notifications.service";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const result = await NotificationsService.markRead(id, user);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[notifications:read:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
