import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";

/**
 * GET /api/v1/notifications
 * Returns paginated notifications for the current user.
 * Query params: page (default 1), limit (default 20), unread_only (default false)
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);
		const page = Math.max(1, Number(searchParams.get("page") ?? 1));
		const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
		const unreadOnly = searchParams.get("unread_only") === "true";

		const where = {
			user_id: user.id,
			...(unreadOnly ? { read: false } : {}),
		};

		const [notifications, total, unreadCount] = await Promise.all([
			prisma.notification.findMany({
				where,
				orderBy: { created_at: "desc" },
				skip: (page - 1) * limit,
				take: limit,
			}),
			prisma.notification.count({ where }),
			prisma.notification.count({ where: { user_id: user.id, read: false } }),
		]);

		return ok({
			data: notifications,
			pagination: {
				page,
				limit,
				total,
				pages: Math.ceil(total / limit),
			},
			unreadCount,
		});
	} catch (err) {
		console.error("[notifications:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

const bulkSchema = z.object({
	ids: z.array(z.string()).min(1).max(200),
});

/**
 * DELETE /api/v1/notifications — bulk delete by ids
 * Body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json().catch(() => ({}));
		const parsed = bulkSchema.safeParse(body);
		if (!parsed.success) return errorResponse("Invalid input", 400);

		const { count } = await prisma.notification.deleteMany({
			where: { id: { in: parsed.data.ids }, user_id: user.id },
		});

		return ok({ deleted: count });
	} catch (err) {
		console.error("[notifications:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * PATCH /api/v1/notifications — bulk mark as read by ids
 * Body: { ids: string[] }
 */
export async function PATCH(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json().catch(() => ({}));
		const parsed = bulkSchema.safeParse(body);
		if (!parsed.success) return errorResponse("Invalid input", 400);

		const { count } = await prisma.notification.updateMany({
			where: { id: { in: parsed.data.ids }, user_id: user.id },
			data: { read: true },
		});

		return ok({ updated: count });
	} catch (err) {
		console.error("[notifications:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
