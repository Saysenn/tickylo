import z from "zod";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";
import { errorResponse, ok } from "@/lib/response";

const approveSchema = z.object({
	reason: z.string().max(500).optional(),
});

/**
 * PATCH /api/v1/admin/leave/approve/:id
 * Approve a leave request and deduct leave balance
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Unauthorized", 401);

		const body = await request.json();
		const validated = approveSchema.safeParse(body);
		if (!validated.success) {
			return errorResponse(
				validated.error.issues[0]?.message ?? "Invalid input",
				400,
			);
		}

		const { reason } = validated.data;
		const { id } = await params;

		const result = await prisma.$transaction(async (tx) => {
			// 1️⃣ Get the leave request
			const leave = await tx.leave.findUnique({ where: { id } });
			if (!leave) throw new Error("NOT_FOUND");
			if (leave.status !== "pending") throw new Error("ALREADY_PROCESSED");

			// 2️⃣ Deduct leave balance
			const userMeta = await tx.userMetaData.findUnique({
				where: { user_id: leave.user_id },
			});
			if (!userMeta) throw new Error("USER_META_NOT_FOUND");

			const leaveFieldMap: Record<string, keyof typeof userMeta> = {
				sick: "sick_leave",
				vacation: "vacation_leave",
				emergency: "emergency_leave",
			};

			const field = leaveFieldMap[leave.type];
			const balance = Number(userMeta[field] ?? 0);
			if (balance <= 0) {
				throw new Error("INSUFFICIENT_LEAVE");
			}

			const updatedMeta = await tx.userMetaData.update({
				where: { user_id: leave.user_id },
				data: {
					[field]: { decrement: 1 },
				},
			});

			// 3️⃣ Approve the leave
			const updatedLeave = await tx.leave.update({
				where: { id },
				data: {
					status: "approved",
					reason,
				},
			});
			// notify
			return ok({ leave: updatedLeave, meta: updatedMeta });
		});

		return ok(result);
	} catch (err: any) {
		console.error("[admin:leave:APPROVE]", err);

		switch (err.message) {
			case "NOT_FOUND":
				return errorResponse("Leave request not found", 404);
			case "ALREADY_PROCESSED":
				return errorResponse("Only pending leaves can be approved", 400);
			case "USER_META_NOT_FOUND":
				return errorResponse("User metadata not found", 500);
			case "INSUFFICIENT_LEAVE":
				return errorResponse("User does not have enough leave balance", 400);
			default:
				return errorResponse("Internal server error", 500);
		}
	}
}
