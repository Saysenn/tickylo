import z from "zod";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";

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

			// 2️⃣ Optionally deduct leave balance (skip if no metadata or unknown type)
			const leaveFieldMap: Record<string, string> = {
				sick: "sick_leave",
				vacation: "vacation_leave",
				emergency: "emergency_leave",
			};

			const field = leaveFieldMap[leave.type];

			if (field) {
				const userMeta = await tx.userMetaData.findUnique({
					where: { user_id: leave.user_id },
				});
				if (userMeta) {
					const balance = Number((userMeta as Record<string, unknown>)[field] ?? 0);
					if (balance <= 0) throw new Error("INSUFFICIENT_LEAVE");
					await tx.userMetaData.update({
						where: { user_id: leave.user_id },
						data: { [field]: { decrement: 1 } },
					});
				}
			}

			// 3️⃣ Approve the leave
			const updatedLeave = await tx.leave.update({
				where: { id },
				data: { status: "approved", reason },
			});

			return updatedLeave;
		});

		return ok(result);
	} catch (err: any) {
		console.error("[admin:leave:APPROVE]", err);

		switch (err.message) {
			case "NOT_FOUND":
				return errorResponse("Leave request not found", 404);
			case "ALREADY_PROCESSED":
				return errorResponse("Only pending leaves can be approved", 400);
			case "INSUFFICIENT_LEAVE":
				return errorResponse("User does not have enough leave balance", 400);
			default:
				return errorResponse("Internal server error", 500);
		}
	}
}
