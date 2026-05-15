import { isSessionOrg, getSessionOrg } from "@/lib/auth/get-session-org";
import { ProfileMetaSection } from "@/components/dashboard/settings/profile-meta-section";
import { TwoFactorSettings } from "@/components/dashboard/settings/two-factor-settings";
import { TimezoneSection } from "@/components/dashboard/settings/timezone-section";
import { WorkScheduleAdminSection } from "@/components/dashboard/settings/work-schedule-admin-section";
import { WorkScheduleReadonlySection } from "@/components/dashboard/settings/work-schedule-readonly-section";
import { StorageAdminSection } from "@/components/dashboard/settings/storage-admin-section";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
	const session = await getSessionOrg();
	const isAdmin = isSessionOrg(session) && session.isAdmin;

	return (
		<div className="space-y-6 max-w-2xl">
			<div>
				<h1 className="text-2xl font-bold text-ink">Settings</h1>
				<p className="text-ink-3 mt-1 text-sm">Manage your profile and preferences.</p>
			</div>

			<TimezoneSection />

			{isAdmin
				? <WorkScheduleAdminSection />
				: <WorkScheduleReadonlySection />
			}

			{isAdmin && <StorageAdminSection />}

			<ProfileMetaSection />
			<TwoFactorSettings />
		</div>
	);
}
