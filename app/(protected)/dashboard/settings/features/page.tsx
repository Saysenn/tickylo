import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeaturesSection } from "@/components/dashboard/settings/features-section";

export const metadata = { title: "Features · Settings" };

export default async function FeaturesSettingsPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	if (user.app_metadata?.role !== "admin") redirect("/dashboard/settings/profile");

	return (
		<div>
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60 mb-5">Features</p>
			<div className="space-y-1 mb-6">
				<h2 className="text-base font-semibold text-ink">Feature Toggles</h2>
				<p className="text-sm text-ink-3">Enable or disable features for your organization. Changes take effect immediately.</p>
			</div>
			<FeaturesSection />
		</div>
	);
}
