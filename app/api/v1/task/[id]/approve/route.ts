import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { createNotification } from "@/lib/utils/create-notification";

/**
 * PATCH /api/v1/task/[id]/approve
 * Admin only — approves a ticket that is pending admin review.
 * Moves status → "pending" and posts a system comment.
 */
export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Ticket not found", 404);
		if (task.status !== "needs_approval")
			return errorResponse("Only tickets pending approval can be approved", 400);

		const adminName = (admin.user_metadata?.name as string | undefined) ?? admin.email ?? "Admin";

		const assigneeId = task.created_by ?? null;
		const now = new Date();

		const [updated] = await prisma.$transaction([
			prisma.task.update({
				where: { id },
				data: assigneeId
					? { status: "assigned", user_id: assigneeId, assigned_at: now }
					: { status: "pending" },
			}),
			prisma.taskComment.create({
				data: {
					task_id: id,
					user_id: admin.id,
					body: assigneeId
						? `Ticket approved by ${adminName} — assigned to the requester.`
						: `Ticket approved by ${adminName} — now open for assignment.`,
					is_system: true,
				},
			}),
		]);

		if (task.created_by) {
			createNotification({
				user_id: task.created_by,
				type: "ticket_approved",
				title: "Ticket approved",
				body: assigneeId
					? `Your ticket "${task.title}" has been approved and assigned to you.`
					: `Your ticket "${task.title}" has been approved and is now open.`,
				link: `/dashboard/tickets/${id}`,
			}).catch(() => {});
		}

		return ok(updated);
	} catch (err) {
		console.error("[ticket:approve]", err);
		return errorResponse("Internal server error", 500);
	}
}
