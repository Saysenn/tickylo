import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import z from "zod";
import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";

const leaveSchema = z.object({
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	type: z.enum(["vacation", "sick", "emergency"]), // adjust to your LeaveType enum
});

/**
 * GET /api/v1/leave?page=1&limit=10
 * Get all leave requests (paginated, user only)
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);

		const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

		const limit = Math.min(
			50,
			Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10)),
		);

		const skip = (page - 1) * limit;

		const [leaves, total] = await Promise.all([
			prisma.leave.findMany({
				where: { user_id: user.id },
				orderBy: { created_at: "desc" },
				take: limit,
				skip,
			}),
			prisma.leave.count({
				where: { user_id: user.id },
			}),
		]);

		return ok({
			data: leaves,
			page,
			totalPages: Math.ceil(total / limit) || 1,
			total,
		});
	} catch (err) {
		console.error("[leave:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/leave
 * Create new leave request
 */
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json();

		const validated = leaveSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { startDate, endDate, type } = validated.data;

		// Basic validation: end must be after start
		if (endDate < startDate) {
			return errorResponse("End date must be after start date", 400);
		}

		const leave = await prisma.leave.create({
			data: {
				user_id: user.id,
				start: startDate,
				end: endDate,
				type,
				status: "pending",
			},
		});

		return ok(leave, 201);
	} catch (err) {
		console.error("[leave:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
