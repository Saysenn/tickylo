import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

const schema = z.object({ emoji: z.string().min(1) });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { commentId } = await params;
		const result = await TicketService.getReactions(commentId, user);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[reactions:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { commentId } = await params;
		const body = await request.json();
		const validated = schema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		const result = await TicketService.toggleReaction(commentId, user, validated.data.emoji);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[reactions:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
