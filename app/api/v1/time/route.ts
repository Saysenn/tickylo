import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, errorResponse } from "@/lib/response";
import { requireUser } from "@/lib/auth/require-user";

// GET /api/v1/time?page=1&limit=10 — paginated list of completed entries
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

		const [entries, total] = await Promise.all([
			prisma.timeEntry.findMany({
				where: { user_id: user.id, end_time: { not: null } },
				orderBy: { start_time: "desc" },
				take: limit,
				skip,
			}),
			prisma.timeEntry.count({
				where: { user_id: user.id, end_time: { not: null } },
			}),
		]);

		return ok({
			data: entries,
			page,
			totalPages: Math.ceil(total / limit) || 1,
		});
	} catch (err) {
		console.error("[time:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

// POST /api/v1/time — start timer
export async function POST() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// Guard: prevent duplicate active sessions
		const active = await prisma.timeEntry.findFirst({
			where: { user_id: user.id, end_time: null },
		});
		if (active) return errorResponse("You already have an active session", 409);

		const entry = await prisma.timeEntry.create({
			data: { user_id: user.id, start_time: new Date() },
		});

		return ok(entry, 201);
	} catch (err) {
		console.error("[time:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
