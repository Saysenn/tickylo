import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TimeService from "@/services/time.service";

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const entries = await TimeService.getAllActiveTimers(user);
		return ok(entries);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[time/active-all:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
