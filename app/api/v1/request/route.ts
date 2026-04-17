import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import z from "zod";
import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";
import { notifyAdmins } from "@/lib/utils/create-notification";

const leaveSchema = z.object({
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	type: z.enum(["vacation", "sick", "emergency"]),
	reason: z.string().max(500).optional(),
});

/**
 * GET /api/v1/request?page=1&limit=10
 * Admin: all requests with user info
 * Employee: own requests only
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

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		const statusFilter = searchParams.get("status");

		const where: any = isAdmin
			? statusFilter ? { status: statusFilter } : {}
			: { user_id: user.id, ...(statusFilter ? { status: statusFilter } : {}) };

		const [leaves, total] = await Promise.all([
			prisma.leave.findMany({
				where,
				include: isAdmin
					? { user: { select: { id: true, name: true, email: true } } }
					: undefined,
				orderBy: { created_at: "desc" },
				take: limit,
				skip,
			}),
			prisma.leave.count({ where }),
		]);

		return ok({
			data: leaves,
			page,
			totalPages: Math.ceil(total / limit) || 1,
			total,
		});
	} catch (err) {
		console.error("[request:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/request — employee creates a leave request
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

		const { startDate, endDate, type, reason } = validated.data;

		if (endDate < startDate) {
			return errorResponse("End date must be after start date", 400);
		}

		const leave = await prisma.leave.create({
			data: {
				user_id: user.id,
				start: startDate,
				end: endDate,
				type,
				reason,
				status: "pending",
			},
		});

		// Notify all admins about the new leave request (fire-and-forget)
		const requesterName = user.user_metadata?.name ?? user.email ?? "An employee";
		notifyAdmins({
			type: "leave_requested",
			title: "New leave request",
			body: `${requesterName} submitted a ${type} leave request.`,
			link: `/dashboard/requests`,
		}).catch(() => {});

		return ok(leave, 201);
	} catch (err) {
		console.error("[request:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
