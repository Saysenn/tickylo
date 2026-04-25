import { NextRequest } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createNotification } from "@/lib/utils/create-notification";

/** PATCH /api/v1/task/[id]/request-transfer/approve
 * Admin picks an assignee (body.assignee_id) — auto-assigns and closes the request.
 */
export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const body = await req.json().catch(() => ({}));
		const assigneeId: string | null = body.assignee_id ?? null;
		if (!assigneeId) return errorResponse("assignee_id is required", 400);

		const [request, newAssignee] = await Promise.all([
			prisma.transferRequest.findFirst({
				where: { task_id: id, status: "pending" },
				include: { task: true },
			}),
			prisma.user.findUnique({ where: { id: assigneeId }, select: { name: true, email: true } }),
		]);
		if (!request) return errorResponse("No pending transfer request found", 404);
		if (!newAssignee) return errorResponse("Assignee not found", 404);

		const adminName = (admin.user_metadata?.name as string | undefined) ?? admin.email ?? "Admin";
		const now = new Date();
		const targetName = newAssignee.name ?? newAssignee.email;

		await prisma.$transaction(async (tx) => {
			await tx.transferRequest.update({
				where: { id: request.id },
				data: { status: "approved", reviewed_by: admin.id, reviewed_at: now },
			});
			await tx.task.update({
				where: { id },
				data: { user_id: assigneeId, status: "assigned", assigned_at: now },
			});
			await tx.taskComment.create({
				data: {
					task_id: id,
					user_id: admin.id,
					body: `${adminName} approved the transfer request — reassigned to ${targetName}.`,
					is_system: true,
				},
			});
		});

		// Notify original assignee
		if (request.task.user_id) {
			createNotification({
				user_id: request.task.user_id,
				type: "task_updated",
				title: "Transfer request approved",
				body: `Your transfer request for "${request.task.title}" was approved — reassigned to ${targetName}.`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		// Notify the new assignee
		if (assigneeId !== request.task.user_id) {
			createNotification({
				user_id: assigneeId,
				type: "task_assigned",
				title: "Ticket transferred to you",
				body: `"${request.task.title}" has been transferred to you.`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		return ok({ success: true });
	} catch (err) {
		console.error("[request-transfer:approve]", err);
		return errorResponse("Internal server error", 500);
	}
}
