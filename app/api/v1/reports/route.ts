import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as AnalyticsService from "@/services/analytics.service";

export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const result = await AnalyticsService.getReports(admin);
		return ok(result);
	} catch (err) {
		console.error("[reports:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
