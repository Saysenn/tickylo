import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createNotification } from "@/lib/utils/create-notification";

const rejectSchema = z.object({
	reason: z.string().max(500).optional(),
});

/** PATCH /api/v1/ticket/[id]/due-date-request/reject — admin rejects */
export async function PATCH(
	req: NextRequest,
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

		const body = await req.json().catch(() => ({}));
		const { reason } = rejectSchema.parse(body);

		const adminName = (admin.user_metadata?.name as string | undefined) ?? admin.email ?? "Admin";
		const now = new Date();

		await prisma.$transaction([
			prisma.dueDateRequest.update({
				where: { id: request.id },
				data: { status: "rejected", reviewed_by: admin.id, reviewed_at: now, reject_reason: reason ?? null },
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: admin.id,
					body: `${adminName} rejected the due date change request${reason ? ` — "${reason}"` : ""}.`,
					is_system: true,
				},
			}),
		]);

		if (request.task.user_id) {
			createNotification({
				user_id: request.task.user_id,
				type: "task_updated",
				title: "Due date change rejected",
				body: `Your due date change request for "${request.task.title}" was rejected${reason ? `: ${reason}` : ""}.`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		return ok({ success: true });
	} catch (err) {
		console.error("[due-date-request:reject]", err);
		return errorResponse("Internal server error", 500);
	}
}
