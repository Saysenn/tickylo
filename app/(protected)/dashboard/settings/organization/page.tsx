import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionOrg, isSessionOrg } from "@/lib/auth/get-session-org";
import { WorkScheduleAdminSection } from "@/components/dashboard/settings/work-schedule-admin-section";
import { OrgJoinQrSection } from "@/components/dashboard/settings/org-join-qr-section";
import { DeactivatedEmployeesSection } from "@/components/dashboard/settings/deactivated-employees-section";
import { OrgDeletionSection } from "@/components/dashboard/settings/org-deletion-section";
import { SettingsTabNav } from "@/components/dashboard/settings/settings-tab-nav";
import { AdminPermissionsSection } from "@/components/dashboard/settings/admin-permissions-section";
import { TicketPermissionsSection } from "@/components/dashboard/settings/ticket-permissions-section";
export const metadata = { title: "Organization · Settings" };

const TABS = [
	{ key: "details",     label: "Details" },
	{ key: "schedule",    label: "Schedule" },
	{ key: "permissions", label: "Permissions" },
	{ key: "tickets",     label: "Tickets" },
	{ key: "members",     label: "Recover Accounts" },
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
				{tab === "details"     && <><OrgJoinQrSection /><OrgDeletionSection /></>}
				{tab === "schedule"    && <WorkScheduleAdminSection />}
				{tab === "permissions" && <AdminPermissionsSection />}
				{tab === "tickets"     && <TicketPermissionsSection />}
				{tab === "members"     && <DeactivatedEmployeesSection />}
			</div>
		</div>
	);
}
