import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";

const schema = z.object({
	billable_hours: z.number().nonnegative().nullable(),
});

/**
 * PATCH /api/v1/task/[id]/billable
 * Allows the ticket assignee (or admin) to update billable_hours only.
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		const task = await prisma.task.findUnique({ where: { id } });
		if (!task) return errorResponse("Ticket not found", 404);

		const isAdmin = user.app_metadata?.role === "admin";
		const isAssignee = task.user_id === user.id;

		if (!isAdmin && !isAssignee) return errorResponse("Forbidden", 403);

		const body = await request.json().catch(() => ({}));
		const parsed = schema.safeParse(body);
		if (!parsed.success) return errorResponse("Invalid input", 400);

		const updated = await prisma.task.update({
			where: { id },
			data: { billable_hours: parsed.data.billable_hours },
		});

		return ok(updated);
	} catch (err) {
		console.error("[task:billable:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
