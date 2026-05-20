import { NextRequest } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/require-super-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { getStripe } from "@/configs/stripe.config";
import { sendEmail } from "@/lib/email/send";

export async function POST(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const caller = await requireSuperAdmin();
		if (!caller) return errorResponse("Forbidden", 403);

		const { id } = await params;

		const request = await prisma.orgDeletionRequest.findUnique({
			where:   { id },
			include: { org: true },
		});
		if (!request) return errorResponse("Request not found", 404);
		if (request.status !== "pending") return errorResponse("Request already reviewed", 400);

		const org = request.org;

		// 1. Cancel Stripe subscription
		if (org.stripe_subscription_id) {
			try {
				const stripe = getStripe();
				await stripe.subscriptions.cancel(org.stripe_subscription_id);
			} catch (e) {
				console.error("[deletion-approve] Stripe cancel failed:", e);
			}
		}

		// 2. Revoke all users' org access in Supabase
		const orgUsers = await prisma.user.findMany({
			where:  { org_id: org.id },
			select: { id: true, email: true },
		});
		const supabaseAdmin = createAdminClient();
		await Promise.allSettled(
			orgUsers.map((u) =>
				supabaseAdmin.auth.admin.updateUserById(u.id, {
					app_metadata: { org_id: null, role: null },
				}),
			),
		);

		// 3. Persist had_trial on the requesting admin's User row
		await prisma.user.update({
			where: { id: request.requested_by },
			data:  { had_trial: true },
		}).catch(() => {});

		// 4. Soft-delete org — set plan to cancelled, clear Stripe IDs
		await prisma.organization.update({
			where: { id: org.id },
			data: {
				plan:                   "cancelled",
				stripe_subscription_id: null,
				stripe_customer_id:     null,
				stripe_base_item_id:    null,
				stripe_seat_item_id:    null,
			},
		});

		// 5. Mark request approved
		await prisma.orgDeletionRequest.update({
			where: { id },
			data:  { status: "approved", reviewed_at: new Date() },
		});

		// 6. Notify the requesting admin by email
		const adminUser = orgUsers.find((u) => u.id === request.requested_by);
		if (adminUser?.email) {
			await sendEmail({
				to:      adminUser.email,
				subject: "Your organization deletion request has been approved",
				html: `
					<p>Hi,</p>
					<p>Your deletion request for <strong>${org.name}</strong> has been approved.</p>
					<p>Your subscription has been cancelled and all team members have lost access. Your data will be permanently deleted within 30 days.</p>
					<p>If this was a mistake, please contact us immediately at <a href="mailto:hello@tickworks.app">hello@tickworks.app</a>.</p>
					<p>— The Tickworks Team</p>
				`,
			});
		}

		return ok({ approved: true });
	} catch (err: any) {
		console.error("[super-admin/deletion-requests/approve:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
