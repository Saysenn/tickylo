import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { ok, errorResponse } from "@/lib/utils/response";
import * as TicketService from "@/services/ticket.service";

export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Unauthorized", 401);

		const updated = await TicketService.approveTicket(id, admin);
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[ticket:approve]", err);
		return errorResponse("Internal server error", 500);
	}
}
