import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { requireUser } from "@/lib/auth/require-user";
import { createNotification, notifyAdmins } from "@/lib/utils/create-notification";

const schema = z.object({
	requested_to: z.string().uuid().optional(),
});

/** GET /api/v1/task/[id]/request-transfer — pending transfer request (if any) */
export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const request = await prisma.transferRequest.findFirst({
			where: { task_id: id, status: "pending" },
			include: { targetEmployee: { select: { name: true, email: true } } },
		});
		return ok(request);
	} catch (err) {
		console.error("[request-transfer:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

/**
 * POST /api/v1/task/[id]/request-transfer
 * Current assignee only. Creates a TransferRequest record + system comment.
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

		const existing = await prisma.transferRequest.findFirst({ where: { task_id: id, status: "pending" } });
		if (existing) return errorResponse("A transfer request is already pending", 409);

		const orgId = user.app_metadata?.org_id as string | undefined;
		const commentBody = `${requesterName} requested to transfer this task to ${targetName}.`;

		const [, comment] = await prisma.$transaction([
			prisma.transferRequest.create({
				data: {
					...(orgId ? { org_id: orgId } : {}),
					task_id: id,
					requested_by: user.id,
					requested_to: requested_to ?? null,
				},
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: null,
					body: commentBody,
					is_system: true,
				},
			}),
		]);

		// Notify the ticket creator directly (most reliable — they're always the responsible admin)
		createNotification({
			user_id: task.created_by,
			type: "transfer_requested",
			title: "Transfer request",
			body: `${requesterName} requested to transfer "${task.title}" to ${targetName}.`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});

		// Also broadcast to all other admins (skips creator to avoid duplicate)
		notifyAdmins({
			type: "transfer_requested",
			title: "Transfer request",
			body: `${requesterName} requested to transfer "${task.title}" to ${targetName}.`,
			link: `/dashboard/tickets/${id}`,
			excludeId: task.created_by,
		}).catch(() => {});

		return ok({ success: true, comment });
	} catch (err) {
		console.error("[task:request-transfer:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
