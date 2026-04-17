import z from "zod";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import { createNotification } from "@/lib/utils/create-notification";

const rejectSchema = z.object({
	reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/v1/admin/leave/reject
 * Reject a leave request and optionally store a reason
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Unauthorized", 401);

		const body = await request.json();
		const validated = rejectSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { reason } = validated.data;

		const { id } = await params;

		const leave = await prisma.leave.findUnique({
			where: { id: id },
		});

		if (!leave) return errorResponse("Leave request not found", 404);
		if (leave.status !== "pending")
			return errorResponse("Only pending leave requests can be rejected", 400);

		const updatedLeave = await prisma.leave.update({
			where: { id: id },
			data: {
				status: "rejected",
				reason,
			},
		});

		// Notify the employee their leave was rejected (fire-and-forget)
		createNotification({
			user_id: updatedLeave.user_id,
			type: "leave_rejected",
			title: "Leave request rejected",
			body: `Your ${updatedLeave.type} leave request has been rejected.${reason ? ` Reason: ${reason}` : ""}`,
			link: `/dashboard/requests`,
		}).catch(() => {});

		return ok(updatedLeave);
	} catch (err) {
		console.error("[admin:leave:REJECT]", err);
		return errorResponse("Internal server error", 500);
	}
}
