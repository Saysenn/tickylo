import z from "zod";
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";

const cancelSchema = z.object({
	reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/v1/leave/cancel/:id
 * User cancels their own pending leave request
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json();
		const validated = cancelSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { reason } = validated.data;
		const { id } = await params;

		const leave = await prisma.leave.findUnique({
			where: { id },
		});

		if (!leave) return errorResponse("Leave request not found", 404);
		if (leave.user_id !== user.id)
			return errorResponse("You can only cancel your own leave requests", 403);
		if (leave.status !== "pending")
			return errorResponse("Only pending leave requests can be cancelled", 400);

		const updatedLeave = await prisma.leave.update({
			where: { id },
			data: {
				status: "cancelled",
				reason,
			},
		});

		// notify
		return ok(updatedLeave);
	} catch (err) {
		console.error("[leave:CANCEL]", err);
		return errorResponse("Internal server error", 500);
	}
}
