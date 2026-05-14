import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import * as UsersService from "@/services/users.service";

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const result = await UsersService.getUserMeta(user);
		return ok(result);
	} catch (err) {
		console.error("[users:meta:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);
		const body = await request.json();
		const result = await UsersService.updateUserMeta(user, body);
		return ok(result);
	} catch (err) {
		console.error("[users:meta:PATCH]", err);
		return errorResponse("Internal server error", 500);
	}
}
