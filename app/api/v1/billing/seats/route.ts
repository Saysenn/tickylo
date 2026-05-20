import { NextRequest } from "next/server";
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

		const isEnterprise = org.plan === "enterprise";
		const isBusiness   = org.plan === "business";
		if (!isEnterprise && !isBusiness) {
			return errorResponse("Seat management is only available on paid plans.", 400);
		}

		if (!org.stripe_subscription_id) {
			return errorResponse("No active subscription found.", 400);
		}

		// Enterprise can update seat count directly in DB (no seat line item)
		// Business requires stripe_seat_item_id to update Stripe
		if (isBusiness && !org.stripe_seat_item_id) {
			return errorResponse("Subscription not found. Contact support.", 400);
		}

		const body = bodySchema.safeParse(await req.json());
		if (!body.success) return errorResponse(body.error.issues[0]?.message ?? "Invalid input", 400);

		const { seat_count } = body.data;

		const ENTERPRISE_MIN = 26;
		const minSeats = isEnterprise ? ENTERPRISE_MIN : 0;

		// Cannot drop below current active employee count or plan minimum
		const activeUsers = await prisma.user.count({
			where: { org_id: orgId, deleted_at: null },
		});
		const effectiveMin = Math.max(activeUsers, minSeats);
		if (seat_count < effectiveMin) {
			return errorResponse(
				isEnterprise
					? `Enterprise plan requires a minimum of ${ENTERPRISE_MIN} seats.`
					: `Cannot reduce below ${activeUsers} seats — your current active employee count.`,
				400,
			);
		}

		if (isBusiness) {
			const stripe = getStripe();
			await stripe.subscriptionItems.update(org.stripe_seat_item_id!, {
				quantity:           seat_count,
				proration_behavior: "create_prorations",
			});
		}
		// Enterprise: seat count tracked in DB only (no per-seat Stripe line item)

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
