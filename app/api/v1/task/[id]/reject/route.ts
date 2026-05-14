import z from "zod";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ok, errorResponse } from "@/lib/utils/response";
import * as TicketService from "@/services/ticket.service";

const schema = z.object({ reason: z.string().max(500).optional() });

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Unauthorized", 401);

		const body = await request.json().catch(() => ({}));
		const { reason } = schema.safeParse(body).data ?? {};

		const updated = await TicketService.rejectTicket(id, admin, reason);
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[ticket:reject]", err);
		return errorResponse("Internal server error", 500);
	}
}
