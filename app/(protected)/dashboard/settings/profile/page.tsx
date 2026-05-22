import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { ProfileMetaSection } from "@/components/dashboard/settings/profile-meta-section";
import { TwoFactorSettings } from "@/components/dashboard/settings/two-factor-settings";
import { ShiftSettingsSection } from "@/components/dashboard/settings/shift-settings-section";
import { SettingsTabNav } from "@/components/dashboard/settings/settings-tab-nav";
import { OnboardingTourSection } from "@/components/dashboard/settings/onboarding-tour-section";

export const metadata = { title: "Profile · Settings" };

const TABS = [
	{ key: "personal", label: "Personal" },
	{ key: "shift",    label: "Shift" },
	{ key: "security", label: "Security" },
];

export default async function ProfileSettingsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	const isAdmin = user?.app_metadata?.role === "admin";
	const { tab = "personal" } = await searchParams;

	return (
		<div>
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60 mb-5">Profile</p>
			<Suspense>
				<SettingsTabNav tabs={TABS} defaultTab="personal" />
			</Suspense>

			<div className="space-y-5">
				{tab === "personal" && (
					<>
						<ProfileMetaSection />
						<OnboardingTourSection />
					</>
				)}
				{tab === "shift"    && <ShiftSettingsSection isAdmin={isAdmin} />}
				{tab === "security" && <TwoFactorSettings />}
			</div>
		</div>
	);
}
