import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import { getStripe } from "@/configs/stripe.config";

const bodySchema = z.object({
	seat_count: z.number().int().min(1).max(500),
});

export async function PATCH(req: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({ where: { id: orgId } });
		if (!org) return errorResponse("Organization not found", 404);

		if (org.plan !== "business") {
			return errorResponse("Seat management is only available on the Business plan.", 400);
		}

		if (!org.stripe_subscription_id || !org.stripe_seat_item_id) {
			return errorResponse("Subscription not found. Contact support.", 400);
		}

		const body = bodySchema.safeParse(await req.json());
		if (!body.success) return errorResponse(body.error.issues[0]?.message ?? "Invalid input", 400);

		const { seat_count } = body.data;

		// Cannot drop below current active employee count
		const activeUsers = await prisma.user.count({
			where: { org_id: orgId, deleted_at: null },
		});
		if (seat_count < activeUsers) {
			return errorResponse(
				`Cannot reduce below ${activeUsers} seats — your current active employee count.`,
				400,
			);
		}

		const stripe = getStripe();

		await stripe.subscriptionItems.update(org.stripe_seat_item_id, {
			quantity:          seat_count,
			proration_behavior: "create_prorations",
		});

		await prisma.organization.update({
			where: { id: orgId },
			data:  { seat_count },
		});

		return ok({ seat_count });
	} catch (err: any) {
		console.error("[billing/seats:PATCH]", err);
		if (err?.type?.startsWith("Stripe")) {
			return errorResponse(err.message, 400);
		}
		return errorResponse("Internal server error", 500);
	}
}
