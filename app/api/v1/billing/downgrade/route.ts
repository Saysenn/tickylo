import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import { getStripe, STRIPE_PRICES } from "@/configs/stripe.config";

const bodySchema = z.object({
	seat_count:    z.number().int().min(1).max(500),
	keep_user_ids: z.array(z.string()).optional(), // IDs of employees to keep active; others get deactivated
});

export async function POST(req: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await prisma.organization.findUnique({ where: { id: orgId } });
		if (!org) return errorResponse("Organization not found", 404);

		if (org.plan !== "enterprise") return errorResponse("Only Enterprise orgs can downgrade.", 400);
		if (!org.stripe_subscription_id || !org.stripe_customer_id) {
			return errorResponse("No active subscription found.", 400);
		}

		const body = bodySchema.safeParse(await req.json().catch(() => ({})));
		if (!body.success) return errorResponse(body.error.issues[0]?.message ?? "Invalid input", 400);

		const { seat_count, keep_user_ids } = body.data;

		// Count active employees (excluding admin)
		const activeCount = await prisma.user.count({
			where: { org_id: orgId, deleted_at: null, id: { not: admin.id } },
		});

		// If more active employees than seats, keep_user_ids is required and must match seat_count
		if (activeCount > seat_count) {
			if (!keep_user_ids || keep_user_ids.length !== seat_count) {
				return errorResponse(
					`You have ${activeCount} active employees but only ${seat_count} seats. Select exactly ${seat_count} employees to keep.`,
					400,
				);
			}
			// Validate all keep_user_ids belong to this org
			const validUsers = await prisma.user.findMany({
				where: { id: { in: keep_user_ids }, org_id: orgId, deleted_at: null },
				select: { id: true },
			});
			if (validUsers.length !== keep_user_ids.length) {
				return errorResponse("One or more selected employees are invalid.", 400);
			}
			// Deactivate employees not in keep_user_ids (excluding admin)
			await prisma.user.updateMany({
				where: {
					org_id:     orgId,
					deleted_at: null,
					id: { notIn: [...keep_user_ids, admin.id] },
				},
				data: { deleted_at: new Date() },
			});
		}

		const stripe = getStripe();
		const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

		const currentInterval = sub.items.data[0]?.plan?.interval ?? "month";
		const priceKey    = currentInterval === "year" ? "base_annual"  : "base_monthly";
		const seatPriceKey = currentInterval === "year" ? "seat_annual" : "seat_monthly";

		const businessBasePrice = STRIPE_PRICES.business[priceKey];
		const businessSeatPrice = STRIPE_PRICES.business[seatPriceKey];
		if (!businessBasePrice || !businessSeatPrice) {
			return errorResponse("Business price not configured.", 500);
		}

		// Replace enterprise base with business base + seat line item
		const itemUpdates: any[] = [
			{ id: sub.items.data[0].id, price: businessBasePrice, quantity: 1 },
			{ price: businessSeatPrice, quantity: seat_count },
		];

		const updatedSub = await stripe.subscriptions.update(org.stripe_subscription_id, {
			items:              itemUpdates,
			proration_behavior: "create_prorations",
			metadata:           { org_id: orgId, plan: "business" },
		});

		// Find the newly created seat item
		const seatItem = updatedSub.items.data.find((i) => i.price.id === businessSeatPrice);

		const isTrialing = sub.status === "trialing";
		await prisma.organization.update({
			where: { id: orgId },
			data: {
				plan:                isTrialing ? "trial" : "business",
				seat_count,
				stripe_seat_item_id: seatItem?.id ?? null,
			},
		});

		return ok({ plan: isTrialing ? "trial" : "business", seat_count });
	} catch (err: any) {
		console.error("[billing/downgrade:POST]", err);
		if (err?.type?.startsWith("Stripe")) return errorResponse(err.message, 400);
		return errorResponse("Internal server error", 500);
	}
}
