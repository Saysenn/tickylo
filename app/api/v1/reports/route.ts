import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as AnalyticsService from "@/services/analytics.service";
import { cached } from "@/lib/infra/cache";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "reports");
		if (gate) return gate;
		const result = await cached(`reports:${orgId}`, 120, () => AnalyticsService.getReports(admin));
		return ok(result);
	} catch (err) {
		console.error("[reports:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
