import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as DepartmentService from "@/services/department.service";

const createSchema = z.object({ name: z.string().min(2).max(200) });

export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { searchParams } = new URL(request.url);
		const result = await DepartmentService.listDepartments(user, Number(searchParams.get("page") ?? 1), Number(searchParams.get("limit") ?? 10));
		return ok(result);
	} catch (err) {
		console.error("[department:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const body = await request.json();
		const validated = createSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		const result = await DepartmentService.createDepartment(admin, validated.data.name);
		return ok(result, 201);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[department:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
