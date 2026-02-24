import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";

const startSchema = z.object({
	title: z.string().max(200).optional(),
});

// GET /api/v1/time?page=1&limit=10&from=YYYY-MM-DD&to=YYYY-MM-DD&tz_offset=<min>
// Paginated list of completed entries, optionally filtered by local date range.
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

		const fromParam = searchParams.get("from");
		const toParam = searchParams.get("to");
		const tzOffset = parseInt(searchParams.get("tz_offset") ?? "0", 10);

		const localMidnightUTC = (d: string) =>
			new Date(new Date(d + "T00:00:00Z").getTime() + tzOffset * 60000);

		const where = {
			user_id: user.id,
			end_time: { not: null as null },
			...(fromParam && toParam
				? {
						start_time: {
							gte: localMidnightUTC(fromParam),
							lte: new Date(localMidnightUTC(toParam).getTime() + 24 * 60 * 60 * 1000 - 1),
						},
					}
				: {}),
		};

		const [entries, total] = await Promise.all([
			prisma.timeEntry.findMany({
				where,
				orderBy: { start_time: "desc" },
				take: limit,
				skip,
			}),
			prisma.timeEntry.count({ where }),
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

// POST /api/v1/time — start timer (optionally pre-fill title from task)
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		// Guard: prevent duplicate active sessions
		const active = await prisma.timeEntry.findFirst({
			where: { user_id: user.id, end_time: null },
		});
		if (active) return errorResponse("You already have an active session", 409);

		const body = await request.json().catch(() => ({}));
		const { title } = startSchema.parse(body);

		const entry = await prisma.timeEntry.create({
			data: { user_id: user.id, start_time: new Date(), title: title ?? null },
		});

		return ok(entry, 201);
	} catch (err) {
		console.error("[time:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
