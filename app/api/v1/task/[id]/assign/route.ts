import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as TicketService from "@/services/ticket.service";

const schema = z.object({ user_id: z.string().uuid() });

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const body = await request.json();
		const validated = schema.safeParse(body);
		if (!validated.success)
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const updated = await TicketService.assignTicket(id, admin, validated.data.user_id);
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:assign]", err);
		return errorResponse("Failed to assign ticket", 500);
	}
}
