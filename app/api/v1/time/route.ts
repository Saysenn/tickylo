import { NextRequest } from "next/server";
import { z } from "zod";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as TimeService from "@/services/time.service";

const startSchema = z.object({
	title: z.string().max(200).optional(),
	ticket_id: z.string().optional(),
});

export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);
		const result = await TimeService.listEntries(user, {
			page: parseInt(searchParams.get("page") ?? "1", 10),
			limit: parseInt(searchParams.get("limit") ?? "10", 10),
			from: searchParams.get("from") ?? undefined,
			to: searchParams.get("to") ?? undefined,
			tz_offset: parseInt(searchParams.get("tz_offset") ?? "0", 10),
			user_id: searchParams.get("user_id") ?? undefined,
		});

		return ok(result);
	} catch (err) {
		console.error("[time:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json().catch(() => ({}));
		const validated = startSchema.safeParse(body);
		if (!validated.success) return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const entry = await TimeService.startTimer(user, validated.data);
		return ok(entry, 201);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[time:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
