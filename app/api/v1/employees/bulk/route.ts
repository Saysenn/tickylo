import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ROLES } from "@/configs/rbac.config";
import * as EmployeeService from "@/services/employees.service";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

const schema = z.object({
	action: z.enum(["delete", "change_role", "assign_department", "remove_department"]),
	ids: z.array(z.string()).min(1).max(100),
	role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]).optional(),
	department_id: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "bulk_operations");
		if (gate) return gate;
		const body = await request.json();
		const validated = schema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		const { action, ids, role, department_id } = validated.data;
		const result = await EmployeeService.bulkEmployeeAction(action, ids, admin, role, department_id);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[employees:bulk:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
