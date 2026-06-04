import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import { getStripe, STRIPE_PRICES, ENTERPRISE_INCLUDED_SEATS } from "@/configs/stripe.config";

const bodySchema = z.object({
	plan:             z.enum(["business", "enterprise"]),
	seat_count:       z.number().int().min(1).max(500).optional().default(1),
	interval:         z.enum(["monthly", "annual"]).default("monthly"),
	payment_method_id: z.string().min(1),
});

export async function POST(req: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({ where: { id: orgId } });
		if (!org) return errorResponse("Organization not found", 404);
		if (org.plan !== "unpaid" && org.plan !== "cancelled") {
			return errorResponse("Organization is not in a state that requires setup", 400);
		}
		if (org.stripe_subscription_id) {
			return errorResponse("A subscription already exists for this organization", 400);
		}

		const body = bodySchema.safeParse(await req.json());
		if (!body.success) return errorResponse(body.error.issues[0]?.message ?? "Invalid input", 400);

		const { plan, seat_count, interval, payment_method_id } = body.data;
		const stripe = getStripe();
		const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tickylo.app";

		// Create or retrieve Stripe customer
		let customerId = org.stripe_customer_id ?? undefined;
		if (!customerId) {
			const customer = await stripe.customers.create({
				email: admin.email,
				name: org.name,
				metadata: { org_id: orgId },
			});
			customerId = customer.id;
		}

		// Attach payment method to customer and set as default
		await stripe.paymentMethods.attach(payment_method_id, { customer: customerId });
		await stripe.customers.update(customerId, {
			invoice_settings: { default_payment_method: payment_method_id },
		});

		// Build subscription items
		const priceKey = interval === "monthly" ? "base_monthly" : "base_annual";
		const seatKey  = interval === "monthly" ? "seat_monthly" : "seat_annual";

		const items: { price: string; quantity?: number }[] = [];

		if (plan === "business") {
			const basePrice = STRIPE_PRICES.business[priceKey];
			const seatPrice = STRIPE_PRICES.business[seatKey];
			if (!basePrice || !seatPrice) return errorResponse("Stripe price IDs not configured", 500);
			items.push({ price: basePrice, quantity: 1 });
			items.push({ price: seatPrice, quantity: seat_count });
		} else {
			const basePrice = STRIPE_PRICES.enterprise[priceKey];
			if (!basePrice) return errorResponse("Stripe price IDs not configured", 500);
			items.push({ price: basePrice, quantity: 1 });
			// Extra seats beyond the 26 included
			const extraSeats = Math.max(0, seat_count - ENTERPRISE_INCLUDED_SEATS);
			if (extraSeats > 0) {
				const seatPrice = STRIPE_PRICES.enterprise[seatKey];
				if (!seatPrice) return errorResponse("Enterprise seat price ID not configured", 500);
				items.push({ price: seatPrice, quantity: extraSeats });
			}
		}

		// Determine trial eligibility.
		// Check cross-org: if this admin email was ever an admin on a different org that already used a trial,
		// deny the trial — prevents registering a new org just to get another free trial.
		let hadAnyTrial = org.had_trial;
		if (!hadAnyTrial && admin.email) {
			const previousTrialOrg = await prisma.user.findFirst({
				where: {
					email: admin.email,
					role: "admin",
					org_id: { not: orgId },
					org: { had_trial: true },
				},
				select: { id: true },
			});
			if (previousTrialOrg) hadAnyTrial = true;
		}
		const trialDays = hadAnyTrial ? 0 : 14;

		const subscription = await stripe.subscriptions.create({
			customer: customerId,
			items,
			default_payment_method: payment_method_id,
			trial_period_days: trialDays > 0 ? trialDays : undefined,
			proration_behavior: "create_prorations",
			metadata: { org_id: orgId, plan },
		});

		// Find item IDs for later seat updates (business only)
		const baseItemId = subscription.items.data[0]?.id ?? null;
		const seatItemId = subscription.items.data[1]?.id ?? null;

		const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
		const newPlan  = trialDays > 0 ? "trial" : plan;

		await prisma.organization.update({
			where: { id: orgId },
			data: {
				stripe_customer_id:     customerId,
				stripe_subscription_id: subscription.id,
				stripe_base_item_id:    baseItemId,
				stripe_seat_item_id:    seatItemId,
				plan:                   newPlan,
				seat_count:             newPlan === "trial" ? 11 : plan === "enterprise" ? Math.max(ENTERPRISE_INCLUDED_SEATS, seat_count) : seat_count,
				trial_ends_at:          trialEnd,
				had_trial:              true,
			},
		});

		return ok({
			plan:          newPlan,
			trial_ends_at: trialEnd,
			redirect:      `${appUrl}/billing/success`,
		});
	} catch (err: any) {
		console.error("[billing/setup:POST]", err);
		if (err?.type?.startsWith("Stripe")) {
			return errorResponse(err.message, 400);
		}
		return errorResponse("Internal server error", 500);
	}
}
