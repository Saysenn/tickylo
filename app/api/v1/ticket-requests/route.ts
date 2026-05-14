import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as AnalyticsService from "@/services/analytics.service";

export async function GET(req: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { searchParams } = req.nextUrl;
		const result = await AnalyticsService.getTicketRequests(admin, {
			page: searchParams.get("page") ? Number(searchParams.get("page")) : undefined,
			limit: searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined,
			type: searchParams.get("type") ?? undefined,
			search: searchParams.get("search") ?? undefined,
		});

		return ok(result);
	} catch (err) {
		console.error("[ticket-requests:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
