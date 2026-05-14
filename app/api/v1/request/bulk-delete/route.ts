import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import * as RequestService from "@/services/request.service";

const schema = z.object({ ids: z.array(z.string()).min(1) });

export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const body = await request.json();
		const validated = schema.safeParse(body);
		if (!validated.success) return errorResponse("Invalid input", 400);
		const result = await RequestService.bulkDeleteRequests(validated.data.ids);
		return ok(result);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request:bulk-delete]", err);
		return errorResponse("Internal server error", 500);
	}
}
