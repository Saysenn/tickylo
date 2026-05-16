import { NextRequest } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { rateLimit, getIP } from "@/lib/utils/rate-limit";

// GET /api/auth/join/check?code=xxx — validates an org_join_code and returns org name
export async function GET(request: NextRequest) {
	try {
		// 60 join-code lookups per IP per 10 minutes — prevents org enumeration
		const rl = await rateLimit(`join-check:${getIP(request)}`, 60, 600);
		if (rl) return rl;

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
