import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/infra/prisma";
import { getStripe } from "@/configs/stripe.config";

// Stripe sends raw body — disable Next.js body parsing
export const runtime = "nodejs";

async function getRawBody(req: NextRequest): Promise<Buffer> {
	const chunks: Uint8Array[] = [];
	const reader = req.body?.getReader();
	if (!reader) return Buffer.alloc(0);
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		if (value) chunks.push(value);
	}
	return Buffer.concat(chunks);
}

export async function POST(req: NextRequest) {
	const stripe = getStripe();
	const sig = req.headers.get("stripe-signature");
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!sig || !webhookSecret) {
		return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
	}

	let event: Stripe.Event;
	try {
		const rawBody = await getRawBody(req);
		event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
	} catch (err: any) {
		console.error("[stripe-webhook] Signature verification failed:", err.message);
		return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
	}

	try {
		switch (event.type) {
			case "customer.subscription.updated": {
				const sub = event.data.object as Stripe.Subscription;
				await handleSubscriptionUpdated(sub);
				break;
			}
			case "customer.subscription.deleted": {
				const sub = event.data.object as Stripe.Subscription;
				await handleSubscriptionDeleted(sub);
				break;
			}
			case "invoice.payment_succeeded": {
				const invoice = event.data.object as Stripe.Invoice;
				await handleInvoicePaid(invoice);
				break;
			}
			case "invoice.payment_failed": {
				const invoice = event.data.object as Stripe.Invoice;
				await handleInvoiceFailed(invoice);
				break;
			}
			default:
				// Unhandled event — acknowledge and move on
				break;
		}
	} catch (err) {
		console.error("[stripe-webhook] Handler error:", err);
		// Return 500 so Stripe retries the event — DB failures are transient
		return NextResponse.json({ error: "Handler failed" }, { status: 500 });
	}

	return NextResponse.json({ received: true });
}

// ─────────────────────────────────────────────────────────────────────────────

async function getOrgBySubscription(subscriptionId: string) {
	return prisma.organization.findUnique({
		where: { stripe_subscription_id: subscriptionId },
	});
}

const VALID_PLANS = ["business", "enterprise"] as const;
type ValidPlan = typeof VALID_PLANS[number];

function validatePlanMeta(meta: string | undefined, fallback: string): ValidPlan {
	return VALID_PLANS.includes(meta as ValidPlan) ? (meta as ValidPlan) : (fallback as ValidPlan);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
	const org = await getOrgBySubscription(sub.id);
	if (!org) return;

	const s     = sub as any;
	const plan  = validatePlanMeta(sub.metadata?.plan, org.plan);
	const seats = sub.items.data.find((i) => i.quantity && i.quantity > 1)?.quantity ?? org.seat_count;
	const nextBillingDate = s.current_period_end
		? new Date(s.current_period_end * 1000)
		: null;

	// Only update plan if not in trial (trial end is handled by invoice.payment_succeeded)
	const newPlan = sub.status === "trialing" ? "trial"
		: sub.status === "active" ? plan
		: org.plan;

	await prisma.organization.update({
		where:  { id: org.id },
		data: {
			plan:             newPlan,
			seat_count:       seats,
			next_billing_date: nextBillingDate,
		},
	});
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
	const org = await getOrgBySubscription(sub.id);
	if (!org) return;

	await prisma.organization.update({
		where: { id: org.id },
		data:  { plan: "cancelled" },
	});
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
	const subscriptionId = (invoice as any).subscription as string | null;
	if (!subscriptionId) return;

	const org = await getOrgBySubscription(subscriptionId);
	if (!org) return;

	// Fetch subscription to determine current plan
	const stripe  = getStripe();
	const sub     = await stripe.subscriptions.retrieve(subscriptionId) as any;
	const plan    = validatePlanMeta(sub.metadata?.plan, org.plan);
	const seats   = sub.items.data.find((i: any) => (i.quantity ?? 0) > 1)?.quantity ?? org.seat_count;
	const nextDate = sub.current_period_end
		? new Date(sub.current_period_end * 1000)
		: null;

	await prisma.organization.update({
		where: { id: org.id },
		data: {
			plan:              plan,
			seat_count:        seats,
			trial_ends_at:     null,
			next_billing_date: nextDate,
		},
	});
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
	const subscriptionId = (invoice as any).subscription as string | null;
	if (!subscriptionId) return;

	const org = await getOrgBySubscription(subscriptionId);
	if (!org) return;

	// Log the failure — Stripe handles retries. We only lock on subscription.deleted.
	console.warn(`[stripe-webhook] Payment failed for org ${org.id} (${org.name})`);
}
