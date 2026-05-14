import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

const schema = z.object({ requested_to: z.string().uuid().optional() });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		return ok(await TicketService.getTransferRequest(id));
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request-transfer:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const body = await request.json().catch(() => ({}));
		const validated = schema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		const result = await TicketService.submitTransferRequest(id, user, validated.data.requested_to);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request-transfer:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
