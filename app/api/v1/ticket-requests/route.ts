import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as AnalyticsService from "@/services/analytics.service";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

export async function GET(req: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "ticket_requests");
		if (gate) return gate;

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
