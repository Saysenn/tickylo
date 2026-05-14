import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const updated = await TicketService.startTicket(id, user);
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:start]", err);
		return errorResponse("Failed to start ticket", 500);
	}
}
