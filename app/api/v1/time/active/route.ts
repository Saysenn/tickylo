import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TimeService from "@/services/time.service";

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const entry = await TimeService.getActiveTimer(user);
		return ok(entry);
	} catch (err) {
		console.error("[time/active:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
