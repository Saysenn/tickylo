import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

const updateSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	completed: z.boolean().optional(),
	position: z.number().int().min(0).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { subtaskId } = await params;
		const body = await request.json();
		const validated = updateSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);
		return ok(await TicketService.updateSubtask(subtaskId, user, validated.data));
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[subtasks:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { subtaskId } = await params;
		await TicketService.deleteSubtask(subtaskId, user);
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[subtasks:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
