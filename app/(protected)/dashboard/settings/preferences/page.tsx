import { createClient } from "@/lib/supabase/server";
import { TimezoneSection } from "@/components/dashboard/settings/timezone-section";
import { NudgeIntervalSection } from "@/components/dashboard/settings/nudge-interval-section";
import { ShiftSettingsSection } from "@/components/dashboard/settings/shift-settings-section";

export const metadata = { title: "Preferences · Settings" };

export default async function PreferencesSettingsPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	const isAdmin = user?.app_metadata?.role === "admin";

	return (
		<div className="space-y-5">
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60">Preferences</p>
			<TimezoneSection />
			<NudgeIntervalSection />
			<ShiftSettingsSection isAdmin={isAdmin} />
		</div>
	);
}
