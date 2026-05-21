import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as EmployeeService from "@/services/employees.service";
import { auditLog } from "@/lib/utils/audit";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";
import { prisma } from "@/lib/infra/prisma";

const createEmployeeSchema = z.object({
	name: z.string().min(2).max(100),
	email: z.string().email(),
	password: z.string().min(8),
	role: z.enum([ROLES.ADMIN, ROLES.EMPLOYEE]).default(ROLES.EMPLOYEE),
});

export async function GET(request: NextRequest) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);
		const orgId = caller.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "employees");
		if (gate) return gate;

		const { searchParams } = new URL(request.url);
		const roleFilterParam = searchParams.get("role_filter");
		const orgSettings = await prisma.organization.findUnique({
			where: { id: orgId },
			select: { admins_can_work_on_tickets: true },
		});
		const result = await EmployeeService.listEmployees(
			caller,
			parseInt(searchParams.get("page") ?? "1", 10),
			parseInt(searchParams.get("limit") ?? "10", 10),
			searchParams.get("search") ?? undefined,
			searchParams.get("department_id") ?? undefined,
			roleFilterParam === "managers" ? "managers" : undefined,
			orgSettings?.admins_can_work_on_tickets ?? false,
		);

		return ok(result);
	} catch (err) {
		console.error("[employees:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);
		const orgId = caller.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);
		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "employees");
		if (gate) return gate;

		const body = await request.json();
		const validated = createEmployeeSchema.safeParse(body);
		if (!validated.success)
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const employee = await EmployeeService.createEmployee(caller, validated.data);

		auditLog({
			org_id: caller.app_metadata?.org_id,
			actor_id: caller.id,
			actor_role: caller.app_metadata?.role ?? "admin",
			action: "CREATE",
			entity_type: "employee",
			entity_id: employee.id,
			after: { email: validated.data.email, role: validated.data.role },
		});

		return ok(employee, 201);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[employees:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
