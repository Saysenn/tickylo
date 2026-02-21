import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/response";
import { prisma } from "@/lib/prisma";
import z from "zod";
import { requireUser } from "@/lib/auth/require-user";

/**
 * GET AND POST TASKS
 */
const createTaskSchema = z.object({
	title: z.string().max(200),
	description: z.string().max(1000).optional(),
	priority: z.enum(["low", "medium", "high"]).optional(),
	due_date: z.coerce.date().optional(),
});

// GET /api/v1/task?page=1&limit=10 — paginated list of completed entries
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
			prisma.task.findMany({
				where: { user_id: user.id },
				orderBy: { created_at: "desc" },
				take: limit,
				skip,
			}),
			prisma.task.count({
				where: { user_id: user.id },
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

// POST /api/v1/task — create task
export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json();

		const validated = createTaskSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const entry = await prisma.task.create({
			data: {
				user_id: user.id,
				status: "pending",
				...validated.data,
			},
		});

		return ok(entry, 201);
	} catch (err) {
		console.error("[task:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
