import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as AnalyticsService from "@/services/analytics.service";

export async function GET(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const { searchParams } = new URL(request.url);
		const result = await AnalyticsService.getPerformance(admin, searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined);
		return ok(result);
	} catch (err) {
		console.error("[performance:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
