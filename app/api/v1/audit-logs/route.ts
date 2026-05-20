import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdminAccess } from "@/lib/auth/require-admin-access";
import * as AnalyticsService from "@/services/analytics.service";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

export async function GET(req: NextRequest) {
	try {
		const admin = await requireAdminAccess();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "audit_logs");
		if (gate) return gate;

		const { searchParams } = req.nextUrl;
		const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
		const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));

		const result = await AnalyticsService.getAuditLogs(admin, {
			page,
			limit,
			action: searchParams.get("action") ?? undefined,
			entity_type: searchParams.get("entity_type") ?? undefined,
			actor_id: searchParams.get("actor_id") ?? undefined,
			from: searchParams.get("from") ?? undefined,
			to: searchParams.get("to") ?? undefined,
		});

		return ok(result);
	} catch (err) {
		console.error("[audit-logs:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
