import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Department Schema
 */
const createDepartmentSchema = z.object({
	name: z.string().min(2).max(200),
});

/**
 * GET /api/v1/department?page=1&limit=10
 * Paginated list of departments
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);

		const page = Math.max(1, Number(searchParams.get("page") ?? 1));
		const limit = Math.min(
			50,
			Math.max(1, Number(searchParams.get("limit") ?? 10)),
		);
		const skip = (page - 1) * limit;

		const [departments, total] = await Promise.all([
			prisma.department.findMany({
				orderBy: { name: "asc" },
				take: limit,
				skip,
			}),
			prisma.department.count(),
		]);

		return ok({
			data: departments,
			page,
			totalPages: Math.ceil(total / limit) || 1,
		});
	} catch (err) {
		console.error("[department:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/department
 * Create new department
 */
export async function POST(request: NextRequest) {
	try {
		const caller = await requireAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const body = await request.json();

		const validated = createDepartmentSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { name } = validated.data;

		// Prevent duplicate department names
		const existing = await prisma.department.findUnique({
			where: { name },
		});

		if (existing) {
			return errorResponse("Department already exists", 400);
		}

		const department = await prisma.department.create({
			data: { name },
		});

		return ok(department, 201);
	} catch (err) {
		console.error("[department:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
