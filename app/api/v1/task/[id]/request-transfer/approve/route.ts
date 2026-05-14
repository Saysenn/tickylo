import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as TicketService from "@/services/ticket.service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const { id } = await params;
		const body = await req.json().catch(() => ({}));
		const assigneeId = body.assignee_id;
		if (!assigneeId) return errorResponse("assignee_id is required", 400);
		await TicketService.approveTransferRequest(id, admin, assigneeId);
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request-transfer:approve]", err);
		return errorResponse("Internal server error", 500);
	}
}
