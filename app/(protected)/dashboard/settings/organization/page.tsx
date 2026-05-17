import { redirect } from "next/navigation";
import { getSessionOrg, isSessionOrg } from "@/lib/auth/get-session-org";
import { WorkScheduleAdminSection } from "@/components/dashboard/settings/work-schedule-admin-section";
import { StorageAdminSection } from "@/components/dashboard/settings/storage-admin-section";
import { OrgJoinQrSection } from "@/components/dashboard/settings/org-join-qr-section";

export const metadata = { title: "Organization · Settings" };

export default async function OrganizationSettingsPage() {
	const session = await getSessionOrg();
	if (!isSessionOrg(session) || !session.isAdmin) redirect("/dashboard/settings/profile");

	return (
		<div className="space-y-5">
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60">Organization</p>
			<OrgJoinQrSection />
			<WorkScheduleAdminSection />
			<StorageAdminSection />
		</div>
	);
}
