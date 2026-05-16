import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { Logo } from "@/components/logo";
import BillingSetupForm from "@/components/billing/billing-setup-form";

export const metadata = { title: "Billing Setup — Tickworks" };

export default async function BillingPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();

	if (!user) redirect("/login");

	const role = user.app_metadata?.role as string | undefined;
	if (role !== "admin") {
		// Employees who somehow reach /billing go back to dashboard
		redirect("/dashboard");
	}

	const orgId = user.app_metadata?.org_id as string | undefined;
	if (!orgId) redirect("/pending");

	const org = await prisma.organization.findUnique({
		where: { id: orgId },
		select: { name: true, plan: true, had_trial: true, is_internal: true },
	});

	if (!org) redirect("/pending");

	// Already active — redirect to dashboard
	if (org.is_internal || ["trial", "business", "enterprise"].includes(org.plan)) {
		redirect("/dashboard");
	}

	return (
		<div className="min-h-screen bg-background flex flex-col">
			{/* Header */}
			<header className="border-b border-border/60 px-6 py-4">
				<Logo size="sm" />
			</header>

			{/* Content */}
			<main className="flex-1 flex items-center justify-center px-4 py-12">
				<div className="w-full max-w-2xl space-y-8">
					<div className="text-center space-y-2">
						<h1 className="text-2xl font-bold text-ink">
							{org.plan === "cancelled" ? "Reactivate your workspace" : "Set up billing to get started"}
						</h1>
						<p className="text-ink-3 text-sm">
							{org.had_trial
								? "Your previous trial has been used. You'll be charged immediately upon setup."
								: "Start a 14-day free trial. No charge until the trial ends."}
						</p>
					</div>

					<BillingSetupForm orgName={org.name} hadTrial={org.had_trial} />
				</div>
			</main>

			{/* Footer */}
			<footer className="border-t border-border/60 px-6 py-4 flex items-center justify-center gap-4 text-xs text-ink-3">
				<a href="/privacy" className="hover:text-ink transition-colors">Privacy Policy</a>
				<a href="/terms" className="hover:text-ink transition-colors">Terms</a>
				<a href="mailto:hello@tickworks.app" className="hover:text-ink transition-colors">Contact Support</a>
			</footer>
		</div>
	);
}
