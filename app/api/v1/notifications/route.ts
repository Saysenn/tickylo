import { NextRequest } from "next/server";
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
