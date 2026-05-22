import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { TimeManagerClient } from "./time-manager-client";
import { PageTour } from "@/components/dashboard/page-tour";
import type { DriveStep } from "driver.js";

const TIME_MANAGER_STEPS: DriveStep[] = [
	{
		element: "#tour-time-manager-page",
		popover: {
			title: "Team Overview",
			description: "See every team member's logged hours side by side. Spot who's overloaded and who has capacity.",
		},
	},
];

export const metadata = { title: "Team Overview" };

export default async function TimeManagerPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	if (user.app_metadata?.role !== "admin") redirect("/dashboard");
	const orgId = user.app_metadata?.org_id as string | undefined;
	const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true, is_internal: true } }) : null;
	if (!org || !canAccess(org.plan, org.is_internal, "time_manager")) redirect("/dashboard?upgrade=time_manager");
	return (
		<div id="tour-time-manager-page">
			<Suspense><PageTour tourKey="time-manager" steps={TIME_MANAGER_STEPS} /></Suspense>
			<TimeManagerClient />
		</div>
	);
}
