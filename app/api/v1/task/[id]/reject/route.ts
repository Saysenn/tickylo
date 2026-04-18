import z from "zod";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { createNotification } from "@/lib/utils/create-notification";

const schema = z.object({
	reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/v1/task/[id]/reject
 * Admin only — rejects a ticket pending review.
 * Moves status → "rejected" and posts a system comment with the optional reason.
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Ticket not found", 404);
		if (task.status !== "needs_approval")
			return errorResponse("Only tickets pending approval can be rejected", 400);

		const body = await request.json().catch(() => ({}));
		const { reason } = schema.safeParse(body).data ?? {};

		const adminName = (admin.user_metadata?.name as string | undefined) ?? admin.email ?? "Admin";
		const systemBody = reason
			? `Ticket rejected by ${adminName}. Reason: ${reason}`
			: `Ticket rejected by ${adminName}.`;

		const [updated] = await prisma.$transaction([
			prisma.task.update({ where: { id }, data: { status: "rejected" } }),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: admin.id,
					body: systemBody,
					is_system: true,
				},
			}),
		]);

		createNotification({
			user_id: task.created_by,
			type: "ticket_rejected",
			title: "Ticket rejected",
			body: `Your ticket "${task.title}" was rejected.${reason ? ` Reason: ${reason}` : ""}`,
			link: `/dashboard/tickets/${id}`,
		}).catch(() => {});

		return ok(updated);
	} catch (err) {
		console.error("[ticket:reject]", err);
		return errorResponse("Internal server error", 500);
	}
}
