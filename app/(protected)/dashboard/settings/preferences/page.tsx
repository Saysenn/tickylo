import { TimezoneSection } from "@/components/dashboard/settings/timezone-section";

export const metadata = { title: "Preferences · Settings" };

export default function PreferencesSettingsPage() {
	return (
		<div className="space-y-5">
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60">Preferences</p>
			<TimezoneSection />
		</div>
	);
}
