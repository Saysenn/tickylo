import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TicketService from "@/services/ticket.service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		return ok(await TicketService.listWatchers(id, user));
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[watchers:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		return ok(await TicketService.addWatcher(id, user));
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[watchers:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const { id } = await params;
		await TicketService.removeWatcher(id, user);
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[watchers:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
