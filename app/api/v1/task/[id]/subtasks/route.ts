import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";

const createSchema = z.object({
	title: z.string().min(1).max(200),
});

/**
 * GET /api/v1/task/[id]/subtasks
 * Returns subtasks ordered by position.
 */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const subtasks = await prisma.taskSubtask.findMany({
			where: { task_id: id },
			orderBy: { position: "asc" },
		});

		return ok(subtasks);
	} catch (err) {
		console.error("[subtasks:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/task/[id]/subtasks
 * Add a subtask. Any authenticated user can add subtasks to a task they can access.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		const body = await request.json();
		const validated = createSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		}

		// Append at the end
		const count = await prisma.taskSubtask.count({ where: { task_id: id } });

		const subtask = await prisma.taskSubtask.create({
			data: {
				task_id: id,
				title: validated.data.title,
				position: count,
			},
		});

		return ok(subtask);
	} catch (err) {
		console.error("[subtasks:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
