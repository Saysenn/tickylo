import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Update Department Schema
 */
const updateDepartmentSchema = z.object({
	name: z.string().min(2).max(200).optional(),
});

/**
 * PATCH /api/v1/department/[id]
 * Update department name
 */
export async function PATCH(
	request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { id } = await context.params;
		const body = await request.json();

		const validated = updateDepartmentSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const department = await prisma.department.findUnique({
			where: { id },
		});

		if (!department) {
			return errorResponse("Department not found", 404);
		}

		const updated = await prisma.department.update({
			where: { id },
			data: validated.data,
		});

		return ok(updated);
	} catch (err) {
		console.error("[department:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * DELETE /api/v1/department/[id]
 * Delete department (only if no users assigned)
 */
export async function DELETE(
	_request: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { id } = await context.params;

		const department = await prisma.department.findUnique({
			where: { id },
			include: { users: true },
		});

		if (!department) {
			return errorResponse("Department not found", 404);
		}

		if (department.users.length > 0) {
			return errorResponse("Cannot delete department with assigned users", 400);
		}

		await prisma.department.delete({
			where: { id },
		});

		return ok({ success: true });
	} catch (err) {
		console.error("[department:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
