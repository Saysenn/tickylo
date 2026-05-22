import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { TimeLogsTable } from "@/components/dashboard/time-logs/time-logs-table";
import { PageTour } from "@/components/dashboard/page-tour";
import type { DriveStep } from "driver.js";

const TIME_LOGS_STEPS: DriveStep[] = [
	{
		element: "#tour-time-logs-page",
		popover: {
			title: "Time Logs",
			description: "A full history of all time entries across the team. Admins can edit or remove incorrect entries.",
		},
	},
];

export const metadata = { title: "Time Logs" };

export default async function TimeLogsPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	if (user.app_metadata?.role !== "admin") redirect("/dashboard");
	const orgId = user.app_metadata?.org_id as string | undefined;
	const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true, is_internal: true } }) : null;
	if (!org || !canAccess(org.plan, org.is_internal, "audit_logs")) redirect("/dashboard?upgrade=audit_logs");

	return (
		<div id="tour-time-logs-page" className="space-y-6">
			<Suspense><PageTour tourKey="time-logs" steps={TIME_LOGS_STEPS} /></Suspense>
			<div>
				<h1 className="text-2xl font-bold text-ink">Time Logs</h1>
				<p className="text-ink-3 mt-1 text-sm">All time entries across your organization.</p>
			</div>
			<TimeLogsTable />
		</div>
	);
}
