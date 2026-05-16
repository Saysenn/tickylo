import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { GDPR } from "@/configs/gdpr.config";

export async function POST() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const existing = await prisma.deletionRequest.findFirst({
			where: { user_id: user.id, status: "pending" },
		});

		if (existing) {
			return errorResponse("A pending deletion request already exists.", 409);
		}

		const scheduledFor = new Date(
			Date.now() + GDPR.retention.deletedUserGraceDays * 24 * 60 * 60 * 1000,
		);

		await prisma.$transaction([
			prisma.deletionRequest.create({
				data: {
					user_id: user.id,
					status: "pending",
					scheduled_for: scheduledFor,
				},
			}),
			prisma.user.update({
				where: { id: user.id },
				data: { deleted_at: scheduledFor },
			}),
		]);

		return ok({ scheduledFor });
	} catch (err) {
		console.error("[users:deletion-request:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function DELETE() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const existing = await prisma.deletionRequest.findFirst({
			where: { user_id: user.id, status: "pending" },
		});

		if (!existing) {
			return errorResponse("No pending deletion request found.", 404);
		}

		await prisma.$transaction([
			prisma.deletionRequest.update({
				where: { id: existing.id },
				data: { status: "cancelled" },
			}),
			prisma.user.update({
				where: { id: user.id },
				data: { deleted_at: null },
			}),
		]);

		return ok({ cancelled: true });
	} catch (err) {
		console.error("[users:deletion-request:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
