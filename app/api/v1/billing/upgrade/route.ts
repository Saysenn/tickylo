import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import { getStripe, STRIPE_PRICES } from "@/configs/stripe.config";

export async function POST() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({ where: { id: orgId } });
		if (!org) return errorResponse("Organization not found", 404);

		if (org.plan === "enterprise") return errorResponse("Already on Enterprise plan.", 400);
		if (!org.stripe_subscription_id || !org.stripe_customer_id) {
			return errorResponse("No active subscription found. Complete billing setup first.", 400);
		}

		const stripe = getStripe();
		const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

		// Determine interval from current subscription
		const currentInterval = sub.items.data[0]?.plan?.interval ?? "month";
		const priceKey = currentInterval === "year" ? "base_annual" : "base_monthly";
		const enterprisePrice = STRIPE_PRICES.enterprise[priceKey];
		if (!enterprisePrice) return errorResponse("Enterprise price not configured.", 500);

		// Build items update: swap base price, remove seat item if present
		const itemUpdates: any[] = [
			{ id: sub.items.data[0].id, price: enterprisePrice, quantity: 1 },
		];
		if (org.stripe_seat_item_id) {
			itemUpdates.push({ id: org.stripe_seat_item_id, deleted: true });
		}

		await stripe.subscriptions.update(org.stripe_subscription_id, {
			items:               itemUpdates,
			proration_behavior:  "create_prorations",
			metadata:            { org_id: orgId, plan: "enterprise" },
			// trial_end is intentionally omitted — Stripe keeps existing trial unchanged
		});

		const isTrialing = sub.status === "trialing";
		await prisma.organization.update({
			where: { id: orgId },
			data: {
				plan:               isTrialing ? "trial" : "enterprise",
				seat_count:         26,
				stripe_seat_item_id: null,
			},
		});

		// If trialing, store pending plan so webhook knows what to activate post-trial
		// Stripe metadata already has plan: "enterprise" — webhook handleSubscriptionUpdated reads it

		return ok({ plan: isTrialing ? "trial" : "enterprise", seat_count: 26 });
	} catch (err: any) {
		console.error("[billing/upgrade:POST]", err);
		if (err?.type?.startsWith("Stripe")) return errorResponse(err.message, 400);
		return errorResponse("Internal server error", 500);
	}
}
