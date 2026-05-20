import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TimeService from "@/services/time.service";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

const mergeSchema = z.object({
	ids: z.array(z.string().cuid()).min(2, "Select at least 2 entries to merge"),
	title: z.string().max(200).optional(),
});

export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "audit_logs");
		if (gate) return gate;

		const body = await request.json().catch(() => ({}));
		const validated = mergeSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const result = await TimeService.mergeEntries(validated.data.ids, user, validated.data.title);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[time:merge:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
