import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";
import * as EmployeeService from "@/services/employees.service";

export async function GET() {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const orgId = caller.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "employees");
		if (gate) return gate;

		const employees = await EmployeeService.listDeactivatedEmployees(caller);
		return ok({ data: employees });
	} catch (err) {
		console.error("[employees/deactivated:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
