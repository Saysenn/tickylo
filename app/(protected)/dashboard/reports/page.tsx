import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { PerformanceTable } from "@/components/dashboard/performance/performance-table";
import { PageTour } from "@/components/dashboard/page-tour";
import type { DriveStep } from "driver.js";

const REPORTS_STEPS: DriveStep[] = [
	{
		element: "#tour-reports-page",
		popover: {
			title: "Reports",
			description: "Filter by date, employee, or client then export to Excel. Use this for client billing, payroll review, and performance tracking.",
		},
	},
];

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	if (user.app_metadata?.role !== "admin") redirect("/dashboard");
	const orgId = user.app_metadata?.org_id as string | undefined;
	const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true, is_internal: true } }) : null;
	if (!org || !canAccess(org.plan, org.is_internal, "reports")) redirect("/dashboard?upgrade=reports");

	return (
		<div id="tour-reports-page" className="w-full space-y-6">
			<Suspense><PageTour tourKey="reports" steps={REPORTS_STEPS} /></Suspense>
			<div>
				<h1 className="text-2xl font-bold text-ink">Reports</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Task completion rates, time logged, and employee productivity metrics.
				</p>
			</div>

			<PerformanceTable />
		</div>
	);
}
