import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { ok, errorResponse } from "@/lib/utils/response";
import * as TicketService from "@/services/ticket.service";

const schema = z.object({ billable_hours: z.number().nonnegative().nullable() });

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json().catch(() => ({}));
		const parsed = schema.safeParse(body);
		if (!parsed.success) return errorResponse("Invalid input", 400);

		const updated = await TicketService.updateBillable(id, user, parsed.data.billable_hours);
		return ok(updated);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:billable]", err);
		return errorResponse("Internal server error", 500);
	}
}
