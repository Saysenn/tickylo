import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as EmployeeService from "@/services/employees.service";
import { auditLog } from "@/lib/utils/audit";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

const updateEmployeeSchema = z.object({
	name: z.string().min(2).max(100).optional(),
	role: z.enum([ROLES.ADMIN, ROLES.MANAGER, ROLES.EMPLOYEE]).optional(),
	phone: z.string().optional().nullable(),
	dob: z.string().optional().nullable(),
	address: z.string().optional().nullable(),
	passport_number: z.string().optional().nullable(),
	visa_status: z.string().optional().nullable(),
	visa_expiry: z.string().optional().nullable(),
	salary: z.number().optional().nullable(),
	date_joined: z.string().optional().nullable(),
	sick_leave: z.number().int().min(0).optional().nullable(),
	vacation_leave: z.number().int().min(0).optional().nullable(),
	emergency_leave: z.number().int().min(0).optional().nullable(),
	personal_leave: z.number().int().min(0).optional().nullable(),
	department_id: z.string().nullable().optional(),
	bio: z.string().nullable().optional(),
	skills: z.string().nullable().optional(),
	notes: z.string().nullable().optional(),
});

export async function GET(
	_request: NextRequest,
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
		const employee = await EmployeeService.getEmployee(id, caller);

		auditLog({
			org_id: caller.app_metadata?.org_id,
			actor_id: caller.id,
			actor_role: caller.app_metadata?.role ?? "admin",
			action: "READ",
			entity_type: "employee",
			entity_id: id,
		});

		return ok(employee);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[employees:GET:id]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function PATCH(
	request: NextRequest,
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
		const body = await request.json();
		const validated = updateEmployeeSchema.safeParse(body);
		if (!validated.success)
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const before = await EmployeeService.getEmployee(id, caller);
		const result = await EmployeeService.updateEmployee(id, caller, validated.data);

		auditLog({
			org_id: caller.app_metadata?.org_id,
			actor_id: caller.id,
			actor_role: caller.app_metadata?.role ?? "admin",
			action: "UPDATE",
			entity_type: "employee",
			entity_id: id,
			before: before as object,
			after: validated.data as object,
		});

		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[employees:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function DELETE(
	_request: NextRequest,
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
		const snapshot = await EmployeeService.getEmployee(id, caller);
		await EmployeeService.deleteEmployee(id, caller);

		auditLog({
			org_id: caller.app_metadata?.org_id,
			actor_id: caller.id,
			actor_role: caller.app_metadata?.role ?? "admin",
			action: "DELETE",
			entity_type: "employee",
			entity_id: id,
			before: snapshot as object,
		});

		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[employees:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
