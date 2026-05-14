import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

const createSchema = z.object({ title: z.string().min(1).max(200) });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		return ok(await TicketService.listSubtasks(id, user));
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[subtasks:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		const body = await request.json();
		const validated = createSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		return ok(await TicketService.createSubtask(id, user, validated.data.title));
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[subtasks:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
