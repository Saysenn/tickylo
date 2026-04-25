import { NextRequest } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createNotification } from "@/lib/utils/create-notification";

/** PATCH /api/v1/ticket/[id]/due-date-request/approve — admin approves, writes new date */
export async function PATCH(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const request = await prisma.dueDateRequest.findFirst({
			where: { task_id: id, status: "pending" },
			include: { task: true },
		});
		if (!request) return errorResponse("No pending due date request found", 404);

		const adminName = (admin.user_metadata?.name as string | undefined) ?? admin.email ?? "Admin";
		const now = new Date();

		await prisma.$transaction([
			prisma.dueDateRequest.update({
				where: { id: request.id },
				data: { status: "approved", reviewed_by: admin.id, reviewed_at: now },
			}),
			prisma.task.update({
				where: { id },
				data: { due_date: request.requested_date },
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: admin.id,
					body: `${adminName} approved the due date change request.`,
					is_system: true,
				},
			}),
		]);

		if (request.task.user_id) {
			createNotification({
				user_id: request.task.user_id,
				type: "task_updated",
				title: "Due date change approved",
				body: `Your due date change request for "${request.task.title}" was approved.`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		return ok({ success: true });
	} catch (err) {
		console.error("[due-date-request:approve]", err);
		return errorResponse("Internal server error", 500);
	}
}
