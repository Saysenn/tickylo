import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse } from "@/lib/utils/response";

export async function GET() {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const orgId = user.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const [org, active_count] = await Promise.all([
			prisma.organization.findUnique({
				where: { id: orgId },
				select: {
					plan: true,
					seat_count: true,
					trial_ends_at: true,
					next_billing_date: true,
					had_trial: true,
				},
			}),
			prisma.user.count({
				where: { org_id: orgId, deleted_at: null, role: { in: ["employee", "manager"] } },
			}),
		]);

		if (!org) return errorResponse("Organization not found", 404);

		return NextResponse.json({ ...org, active_count });
	} catch (err) {
		console.error("[billing/status:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
