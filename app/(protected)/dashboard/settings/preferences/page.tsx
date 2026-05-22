import { TimezoneSection } from "@/components/dashboard/settings/timezone-section";
import { NudgeIntervalSection } from "@/components/dashboard/settings/nudge-interval-section";

export const metadata = { title: "Preferences · Settings" };

export default function PreferencesSettingsPage() {
	return (
		<div className="space-y-5">
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60">Preferences</p>
			<TimezoneSection />
			<NudgeIntervalSection />
		</div>
	);
}
