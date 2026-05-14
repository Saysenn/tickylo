import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { errorResponse, ok } from "@/lib/utils/response";
import * as RequestService from "@/services/request.service";

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { id } = await params;
		await RequestService.deleteRequest(id, user);
		return ok({ success: true });
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
