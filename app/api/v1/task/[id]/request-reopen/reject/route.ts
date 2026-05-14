import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as TicketService from "@/services/ticket.service";

const schema = z.object({ reason: z.string().max(500).optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const { id } = await params;
		const body = await req.json().catch(() => ({}));
		const { reason } = schema.safeParse(body).data ?? {};
		await TicketService.rejectReopenRequest(id, admin, reason);
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request-reopen:reject]", err);
		return errorResponse("Internal server error", 500);
	}
}
