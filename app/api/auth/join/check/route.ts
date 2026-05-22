import { NextRequest } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { rateLimit, getIP } from "@/lib/utils/rate-limit";
import { LOCKED_PLANS, ENTERPRISE_INCLUDED_SEATS, TRIAL_INCLUDED_SEATS } from "@/configs/stripe.config";

// GET /api/auth/join/check?code=xxx — validates an org_join_code and returns org name + seat availability
export async function GET(request: NextRequest) {
	try {
		// 60 join-code lookups per IP per 10 minutes — prevents org enumeration
		const rl = await rateLimit(`join-check:${getIP(request)}`, 60, 600);
		if (rl) return rl;

		const code = new URL(request.url).searchParams.get("code");
		if (!code) return errorResponse("code is required", 400);

		const org = await prisma.organization.findUnique({
			where: { org_join_code: code },
			select: { id: true, name: true, plan: true, seat_count: true, is_internal: true, _count: { select: { users: true } } },
		});

		if (!org) return errorResponse("Invalid join code", 404);

		const isLocked = !org.is_internal && LOCKED_PLANS.includes(org.plan as any);

		let seatLimit: number;
		if (org.plan === "trial") seatLimit = TRIAL_INCLUDED_SEATS;
		else if (org.plan === "enterprise") seatLimit = ENTERPRISE_INCLUDED_SEATS;
		else seatLimit = org.seat_count;

		const seatsAvailable = org.is_internal || org._count.users < seatLimit;

		return ok({ id: org.id, name: org.name, is_locked: isLocked, seats_available: seatsAvailable });
	} catch (err) {
		console.error("[auth/join/check]", err);
		return errorResponse("Internal server error", 500);
	}
}
