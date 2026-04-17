import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { createNotification } from "@/lib/utils/create-notification";

const postSchema = z.object({
	body: z.string().min(1).max(2000),
});

/**
 * GET /api/v1/task/[id]/comments
 * Any authenticated user can fetch comments for a task.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Task not found", 404);

		const comments = await prisma.taskComment.findMany({
			where: { task_id: id },
			orderBy: { created_at: "asc" },
			include: {
				author: { select: { id: true, name: true, email: true } },
			},
		});

		return ok(comments);
	} catch (err) {
		console.error("[task:comments:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/task/[id]/comments
 * Any authenticated user can post a comment.
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
		const validated = postSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		}

		const comment = await prisma.taskComment.create({
			data: {
				task_id: id,
				user_id: user.id,
				body: validated.data.body,
				is_system: false,
			},
			include: {
				author: { select: { id: true, name: true, email: true } },
			},
		});

		// Notify assignee and creator about the new comment (skip the commenter)
		const commenterName = user.user_metadata?.name ?? user.email ?? "Someone";
		const snippet = validated.data.body.length > 60
			? `${validated.data.body.slice(0, 60)}…`
			: validated.data.body;
		const recipientIds = new Set<string>();
		if (task.user_id && task.user_id !== user.id) recipientIds.add(task.user_id);
		if (task.created_by !== user.id) recipientIds.add(task.created_by);
		for (const recipientId of recipientIds) {
			createNotification({
				user_id: recipientId,
				type: "comment_added",
				title: `${commenterName} commented on a task`,
				body: `"${task.title}": ${snippet}`,
				link: `/dashboard/tasks/${id}`,
			}).catch(() => {});
		}

		return ok(comment);
	} catch (err) {
		console.error("[task:comments:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
