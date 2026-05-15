import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

const postSchema = z.object({
	body: z.string().min(1).max(50000),
	attachment_ids: z.array(z.string()).max(10).optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const result = await TicketService.listComments(id, user);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:comments:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const body = await request.json();
		const validated = postSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		const result = await TicketService.addComment(id, user, validated.data.body, validated.data.attachment_ids);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[task:comments:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
