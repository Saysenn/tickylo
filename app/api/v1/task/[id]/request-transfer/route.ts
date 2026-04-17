import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { notifyAdmins } from "@/lib/utils/create-notification";

const schema = z.object({
	requested_to: z.string().uuid().optional(), // null = let admin decide
});

/**
 * POST /api/v1/task/[id]/request-transfer
 * Current assignee only. Posts a system comment requesting transfer.
 * requested_to is optional — if omitted, admin decides who gets it.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;

		const task = await prisma.task.findUnique({
			where: { id },
			include: { assignee: { select: { name: true, email: true } } },
		});
		if (!task) return errorResponse("Task not found", 404);

		// Only the current assignee can request a transfer
		if (task.user_id !== user.id) {
			return errorResponse("Only the current assignee can request a transfer", 403);
		}

		if (task.status === "completed") {
			return errorResponse("Completed tasks cannot be transferred", 400);
		}

		const body = await request.json().catch(() => ({}));
		const validated = schema.safeParse(body);
		if (!validated.success) {
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		}

		const { requested_to } = validated.data;

		const requesterName =
			task.assignee?.name ?? task.assignee?.email ?? "An employee";

		let targetName = "any available team member";
		if (requested_to) {
			const target = await prisma.user.findUnique({
				where: { id: requested_to },
				select: { name: true, email: true },
			});
			if (!target) return errorResponse("Requested employee not found", 404);
			targetName = target.name ?? target.email;
		}

		const commentBody = `${requesterName} requested to transfer this task to ${targetName}.`;

		const comment = await prisma.taskComment.create({
			data: {
				task_id: id,
				user_id: null,
				body: commentBody,
				is_system: true,
			},
		});

		// Notify all admins (fire-and-forget)
		notifyAdmins({
			type: "transfer_requested",
			title: "Transfer request",
			body: `${requesterName} requested to transfer "${task.title}" to ${targetName}.`,
			link: `/dashboard/tasks/${id}`,
		}).catch(() => {});

		return ok(comment);
	} catch (err) {
		console.error("[task:request-transfer:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
