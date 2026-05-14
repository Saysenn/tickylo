import { requireUser } from "@/lib/auth/require-user";
import z from "zod";
import { NextRequest } from "next/server";
import { errorResponse, ok } from "@/lib/utils/response";
import * as RequestService from "@/services/request.service";

const leaveSchema = z.object({
	startDate: z.coerce.date(),
	endDate: z.coerce.date(),
	type: z.enum(["vacation", "sick", "emergency"]),
	reason: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);
		const result = await RequestService.listRequests(user, {
			page: parseInt(searchParams.get("page") ?? "1", 10),
			limit: parseInt(searchParams.get("limit") ?? "10", 10),
			status: searchParams.get("status") ?? undefined,
		});

		return ok(result);
	} catch (err) {
		console.error("[request:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function POST(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const body = await request.json();
		const validated = leaveSchema.safeParse(body);
		if (!validated.success)
			return errorResponse(validated.error.issues[0]?.message ?? "Invalid input", 400);

		const leave = await RequestService.createRequest(user, validated.data);
		return ok(leave, 201);
	} catch (err: any) {
		if (err.status) return errorResponse(err.message, err.status);
		console.error("[request:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
