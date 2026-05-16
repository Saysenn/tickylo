import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse } from "@/lib/utils/response";
import { getStripe } from "@/configs/stripe.config";

export async function POST() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({
			where: { id: orgId },
			select: { stripe_customer_id: true },
		});

		if (!org?.stripe_customer_id) {
			return errorResponse("No Stripe customer found. Complete billing setup first.", 400);
		}

		const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://tickworks.app";
		const stripe = getStripe();

		const session = await stripe.billingPortal.sessions.create({
			customer:   org.stripe_customer_id,
			return_url: `${appUrl}/dashboard/settings/subscription`,
		});

		return NextResponse.json({ url: session.url });
	} catch (err: any) {
		console.error("[billing/portal:POST]", err);
		if (err?.type?.startsWith("Stripe")) {
			return errorResponse(err.message, 400);
		}
		return errorResponse("Internal server error", 500);
	}
}
