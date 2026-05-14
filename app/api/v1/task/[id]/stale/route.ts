import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as TicketService from "@/services/ticket.service";

export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Admin only", 403);

		const updated = await TicketService.staleTicket(id, admin);
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:stale]", err);
		return errorResponse("Failed to mark ticket as stale", 500);
	}
}
