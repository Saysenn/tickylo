import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as AnalyticsService from "@/services/analytics.service";

export async function GET(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("user_id");
		if (!userId) return errorResponse("user_id is required", 400);
		const result = await AnalyticsService.getEmployeeReport(
			admin,
			userId,
			searchParams.get("from") ?? undefined,
			searchParams.get("to") ?? undefined,
		);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[performance/employee-report:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
