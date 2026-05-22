import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { TimeManagerClient } from "./time-manager-client";

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
		<div>
			<TimeManagerClient />
		</div>
	);
}
