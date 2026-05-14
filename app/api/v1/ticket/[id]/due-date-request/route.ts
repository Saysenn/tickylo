import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

const createSchema = z.object({
	requested_date: z.coerce.date(),
	reason: z.string().max(500).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		return ok(await TicketService.getDueDateRequest(id));
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[due-date-request:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const body = await req.json().catch(() => ({}));
		const validated = createSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		const result = await TicketService.submitDueDateRequest(id, user, validated.data.requested_date, validated.data.reason);
		return ok(result, 201);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[due-date-request:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
