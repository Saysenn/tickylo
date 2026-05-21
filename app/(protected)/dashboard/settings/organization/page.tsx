import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionOrg, isSessionOrg } from "@/lib/auth/get-session-org";
import { WorkScheduleAdminSection } from "@/components/dashboard/settings/work-schedule-admin-section";
import { StorageAdminSection } from "@/components/dashboard/settings/storage-admin-section";
import { OrgJoinQrSection } from "@/components/dashboard/settings/org-join-qr-section";
import { DepartmentsAdminSection } from "@/components/dashboard/settings/departments-admin-section";
import { ExtensionAdminSection } from "@/components/dashboard/settings/extension-admin-section";
import { DeactivatedEmployeesSection } from "@/components/dashboard/settings/deactivated-employees-section";
import { OrgDeletionSection } from "@/components/dashboard/settings/org-deletion-section";
import { SettingsTabNav } from "@/components/dashboard/settings/settings-tab-nav";

export const metadata = { title: "Organization · Settings" };

const TABS = [
	{ key: "details",     label: "Details" },
	{ key: "departments", label: "Departments" },
	{ key: "schedule",    label: "Schedule" },
	{ key: "storage",     label: "Storage" },
	{ key: "members",     label: "Deactivated" },
];

export default async function OrganizationSettingsPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const session = await getSessionOrg();
	if (!isSessionOrg(session) || !session.isAdmin) redirect("/dashboard/settings/profile");

	const { tab = "details" } = await searchParams;

	return (
		<div>
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60 mb-5">Organization</p>
			<Suspense>
				<SettingsTabNav tabs={TABS} defaultTab="details" />
			</Suspense>

			<div className="space-y-5">
				{tab === "details"     && <><OrgJoinQrSection /><ExtensionAdminSection /><OrgDeletionSection /></>}
				{tab === "departments" && <DepartmentsAdminSection />}
				{tab === "schedule"    && <WorkScheduleAdminSection />}
				{tab === "storage"     && <StorageAdminSection />}
				{tab === "members"     && <DeactivatedEmployeesSection />}
			</div>
		</div>
	);
}
