import { NextRequest } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";

// GET /api/auth/join/check?code=xxx — validates an org_join_code and returns org name
export async function GET(request: NextRequest) {
	try {
		const code = new URL(request.url).searchParams.get("code");
		if (!code) return errorResponse("code is required", 400);

		const org = await prisma.organization.findUnique({
			where: { org_join_code: code },
			select: { id: true, name: true },
		});

		if (!org) return errorResponse("Invalid join code", 404);

		return ok(org);
	} catch (err) {
		console.error("[auth/join/check]", err);
		return errorResponse("Internal server error", 500);
	}
}
