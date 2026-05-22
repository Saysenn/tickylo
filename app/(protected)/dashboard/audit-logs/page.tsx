import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { AuditLogsTable } from "@/components/dashboard/audit-logs/audit-logs-table";
import { PageTour } from "@/components/dashboard/page-tour";
import type { DriveStep } from "driver.js";

const AUDIT_LOGS_STEPS: DriveStep[] = [
	{
		element: "#tour-ticket-logs-page",
		popover: {
			title: "Ticket Logs",
			description: "Every change to every ticket is recorded here — who did what and when. Useful for accountability and dispute resolution.",
		},
	},
];

export default async function AuditLogsPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	if (user.app_metadata?.role !== "admin") redirect("/dashboard");
	const orgId = user.app_metadata?.org_id as string | undefined;
	const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true, is_internal: true } }) : null;
	if (!org || !canAccess(org.plan, org.is_internal, "audit_logs")) redirect("/dashboard?upgrade=audit_logs");
	return (
		<div id="tour-ticket-logs-page" className="relative w-full space-y-8">
			<Suspense><PageTour tourKey="ticket-logs" steps={AUDIT_LOGS_STEPS} /></Suspense>
			<div
				className="fixed inset-0 -z-10 pointer-events-none"
				style={{
					background: `
						radial-gradient(ellipse at 12% 8%, rgba(128, 237, 153, 0.16) 0%, transparent 42%),
						radial-gradient(ellipse at 88% 85%, rgba(128, 237, 153, 0.10) 0%, transparent 42%)
					`,
				}}
			/>

			<div>
				<h1 className="text-2xl font-bold text-ink">Ticket Logs</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Immutable record of all actions performed in your organization.
				</p>
			</div>

			<AuditLogsTable />
		</div>
	);
}
