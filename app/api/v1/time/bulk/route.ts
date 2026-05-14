import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TimeService from "@/services/time.service";

const bulkDeleteSchema = z.object({
	ids: z.array(z.string().cuid()).min(1, "Select at least 1 entry"),
});

export async function DELETE(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json().catch(() => ({}));
		const validated = bulkDeleteSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const result = await TimeService.bulkDelete(validated.data.ids, user);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[time/bulk:DELETE]", err);
		return errorResponse("Internal server error", 500);
	}
}
