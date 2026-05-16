import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import SubscriptionPanel from "@/components/billing/subscription-panel";

export const metadata = { title: "Subscription — Tickworks" };

export default async function SubscriptionPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const role = user.app_metadata?.role as string | undefined;
	if (role !== "admin") redirect("/dashboard/settings/profile");

	const orgId = user.app_metadata?.org_id as string | undefined;
	if (!orgId) redirect("/pending");

	const org = await prisma.organization.findUnique({
		where: { id: orgId },
		select: {
			plan: true,
			seat_count: true,
			trial_ends_at: true,
			next_billing_date: true,
			had_trial: true,
			is_internal: true,
		},
	});

	if (!org) redirect("/pending");

	const activeUsers = await prisma.user.count({
		where: { org_id: orgId, deleted_at: null },
	});

	return (
		<SubscriptionPanel
			org={org}
			activeUsers={activeUsers}
		/>
	);
}
