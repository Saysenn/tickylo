import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Billing Setup Complete — Tickworks" };

export default async function BillingSuccessPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const orgId = user.app_metadata?.org_id as string | undefined;
	if (!orgId) redirect("/pending");

	const org = await prisma.organization.findUnique({
		where: { id: orgId },
		select: { plan: true, trial_ends_at: true, next_billing_date: true },
	});

	if (!org) redirect("/pending");

	const isTrial = org.plan === "trial";

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<header className="border-b border-border/60 px-6 py-4">
				<Logo size="sm" />
			</header>

			<main className="flex-1 flex items-center justify-center px-4 py-12">
				<div className="w-full max-w-md text-center space-y-6">
					<div className="flex justify-center">
						<div className="w-16 h-16 rounded-full bg-mint/15 flex items-center justify-center">
							<CheckCircle2 className="w-8 h-8 text-mint" />
						</div>
					</div>

					<div className="space-y-2">
						<h1 className="text-2xl font-bold text-ink">
							{isTrial ? "Your trial has started!" : "You're all set!"}
						</h1>
						{isTrial && org.trial_ends_at ? (
							<p className="text-ink-3 text-sm">
								Your 14-day free trial runs until{" "}
								<span className="font-medium text-ink">{formatDate(org.trial_ends_at.toISOString())}</span>.
								Your card will be charged automatically after the trial ends.
							</p>
						) : (
							<p className="text-ink-3 text-sm">
								Your subscription is now active.
								{org.next_billing_date && (
									<> Next billing date:{" "}
										<span className="font-medium text-ink">{formatDate(org.next_billing_date.toISOString())}</span>.
									</>
								)}
							</p>
						)}
					</div>

					<div className="pt-2">
						<Button asChild className="w-full">
							<Link href="/dashboard">Go to Dashboard →</Link>
						</Button>
					</div>

					<p className="text-xs text-ink-3">
						Manage your subscription anytime in{" "}
						<Link href="/dashboard/settings/subscription" className="underline hover:text-ink">
							Settings → Subscription
						</Link>
					</p>
				</div>
			</main>
		</div>
	);
}
