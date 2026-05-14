import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { ROLES } from "@/configs/rbac.config";
import * as TicketService from "@/services/ticket.service";

export async function PATCH(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		if (user.app_metadata?.role === ROLES.ADMIN)
			return errorResponse("Admins should use the assign endpoint", 400);

		const updated = await TicketService.claimTicket(id, user);
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:claim]", err);
		return errorResponse("Failed to claim ticket", 500);
	}
}
