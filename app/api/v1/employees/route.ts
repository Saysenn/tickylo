import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as EmployeeService from "@/services/employees.service";

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

		const { searchParams } = new URL(request.url);
		const result = await EmployeeService.listEmployees(
			caller,
			parseInt(searchParams.get("page") ?? "1", 10),
			parseInt(searchParams.get("limit") ?? "10", 10),
			searchParams.get("search") ?? undefined,
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

		const body = await request.json();
		const validated = createEmployeeSchema.safeParse(body);
		if (!validated.success)
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const employee = await EmployeeService.createEmployee(caller, validated.data);
		return ok(employee, 201);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[employees:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
