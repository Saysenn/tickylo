import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as TicketService from "@/services/ticket.service";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const { id } = await params;
		await TicketService.approveReopenRequest(id, admin);
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request-reopen:approve]", err);
		return errorResponse("Internal server error", 500);
	}
}
