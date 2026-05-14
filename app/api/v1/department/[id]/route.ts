import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as DepartmentService from "@/services/department.service";

const updateSchema = z.object({ name: z.string().min(2).max(200).optional() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const { id } = await params;
		const body = await request.json();
		const validated = updateSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		const result = await DepartmentService.updateDepartment(id, admin, validated.data);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[department:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const { id } = await params;
		await DepartmentService.deleteDepartment(id, admin);
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[department:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
