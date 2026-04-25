import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createNotification } from "@/lib/utils/create-notification";

const rejectSchema = z.object({
	reason: z.string().max(500).optional(),
});

/** PATCH /api/v1/task/[id]/request-reopen/reject — admin rejects */
export async function PATCH(
	req: NextRequest,
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

		const body = await req.json().catch(() => ({}));
		const { reason } = rejectSchema.parse(body);

		const adminName = (admin.user_metadata?.name as string | undefined) ?? admin.email ?? "Admin";
		const now = new Date();

		await prisma.$transaction([
			prisma.reopenRequest.update({
				where: { id: request.id },
				data: { status: "rejected", reviewed_by: admin.id, reviewed_at: now },
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: admin.id,
					body: `${adminName} rejected the reopen request${reason ? ` — "${reason}"` : ""}.`,
					is_system: true,
				},
			}),
		]);

		if (request.task.user_id) {
			createNotification({
				user_id: request.task.user_id,
				type: "task_updated",
				title: "Reopen request rejected",
				body: `Your reopen request for "${request.task.title}" was rejected${reason ? `: ${reason}` : ""}.`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		return ok({ success: true });
	} catch (err) {
		console.error("[request-reopen:reject]", err);
		return errorResponse("Internal server error", 500);
	}
}
