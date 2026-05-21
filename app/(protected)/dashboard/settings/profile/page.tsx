import { createClient } from "@/lib/supabase/server";
import { ProfileMetaSection } from "@/components/dashboard/settings/profile-meta-section";
import { TwoFactorSettings } from "@/components/dashboard/settings/two-factor-settings";
import { ShiftSettingsSection } from "@/components/dashboard/settings/shift-settings-section";

export const metadata = { title: "Profile · Settings" };

export default async function ProfileSettingsPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	const isAdmin = user?.app_metadata?.role === "admin";

	return (
		<div className="space-y-5">
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60">Profile</p>
			<ProfileMetaSection />
			<ShiftSettingsSection isAdmin={isAdmin} />
			<TwoFactorSettings />
		</div>
	);
}
