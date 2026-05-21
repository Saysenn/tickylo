import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";
import * as EmployeeService from "@/services/employees.service";

export async function POST(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const orgId = caller.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "employees");
		if (gate) return gate;

		const { id } = await params;
		await EmployeeService.reactivateEmployee(id, caller);
		return ok({ reactivated: true });
	} catch (err: any) {
		console.error("[employees/reactivate:POST]", err);
		return errorResponse(err.message ?? "Internal server error", err.status ?? 500);
	}
}
