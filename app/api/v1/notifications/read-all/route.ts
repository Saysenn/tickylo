import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as NotificationsService from "@/services/notifications.service";

export async function PATCH() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const result = await NotificationsService.markAllRead(user);
		return ok(result);
	} catch (err) {
		console.error("[notifications:read-all:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
