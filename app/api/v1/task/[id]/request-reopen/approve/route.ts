import { NextRequest } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createNotification } from "@/lib/utils/create-notification";

/** PATCH /api/v1/task/[id]/request-reopen/approve — admin approves, reopens the ticket */
export async function PATCH(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const request = await prisma.reopenRequest.findFirst({
			where: { task_id: id, status: "pending" },
			include: { task: true },
		});
		if (!request) return errorResponse("No pending reopen request found", 404);

		const adminName = (admin.user_metadata?.name as string | undefined) ?? admin.email ?? "Admin";
		const now = new Date();
		const newStatus = request.task.user_id ? "assigned" : "pending";

		await prisma.$transaction([
			prisma.reopenRequest.update({
				where: { id: request.id },
				data: { status: "approved", reviewed_by: admin.id, reviewed_at: now },
			}),
			prisma.task.update({
				where: { id },
				data: { status: newStatus },
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: admin.id,
					body: `${adminName} approved the reopen request — ticket is now ${newStatus === "assigned" ? "assigned" : "open"}.`,
					is_system: true,
				},
			}),
		]);

		if (request.task.user_id) {
			createNotification({
				user_id: request.task.user_id,
				type: "task_updated",
				title: "Reopen request approved",
				body: `Your reopen request for "${request.task.title}" was approved.`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		return ok({ success: true });
	} catch (err) {
		console.error("[request-reopen:approve]", err);
		return errorResponse("Internal server error", 500);
	}
}
