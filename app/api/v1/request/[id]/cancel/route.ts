import z from "zod";
import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { errorResponse, ok } from "@/lib/utils/response";
import * as RequestService from "@/services/request.service";

const schema = z.object({ reason: z.string().max(500).optional() });

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		const body = await request.json().catch(() => ({}));
		const { reason } = schema.safeParse(body).data ?? {};

		const result = await RequestService.cancelRequest(id, user, reason);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request:cancel]", err);
		return errorResponse("Internal server error", 500);
	}
}
