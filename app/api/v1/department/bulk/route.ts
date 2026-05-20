import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as DepartmentService from "@/services/department.service";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

const schema = z.object({
	action: z.enum(["delete"]),
	ids: z.array(z.string()).min(1).max(100),
	force: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "departments");
		if (gate) return gate;
		const body = await request.json();
		const validated = schema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		const { ids, force } = validated.data;
		const result = await DepartmentService.bulkDeleteDepartments(ids, admin, force ?? false);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[department:bulk:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
