import { ProfileMetaSection } from "@/components/dashboard/settings/profile-meta-section";
import { TwoFactorSettings } from "@/components/dashboard/settings/two-factor-settings";

export const metadata = { title: "Profile · Settings" };

export default function ProfileSettingsPage() {
	return (
		<div className="space-y-5">
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60">Profile</p>
			<ProfileMetaSection />
			<TwoFactorSettings />
		</div>
	);
}
