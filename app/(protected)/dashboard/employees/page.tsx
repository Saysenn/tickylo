import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { EmployeesTable } from "@/components/dashboard/employees/employees-table";
import { EmployeesPageTabs } from "@/components/dashboard/employees/employees-page-tabs";

export const metadata = { title: "Employees" };

export default async function EmployeesPage({
	searchParams,
}: {
	searchParams: Promise<{ tab?: string }>;
}) {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	if (user.app_metadata?.role !== "admin") redirect("/dashboard");

	const orgId = user.app_metadata?.org_id as string | undefined;
	const org = orgId
		? await prisma.organization.findUnique({
				where:  { id: orgId },
				select: { plan: true, is_internal: true, seat_count: true },
		  })
		: null;

	if (!org || !canAccess(org.plan, org.is_internal, "employees")) redirect("/dashboard?upgrade=employees");

	const [{ tab = "active" }, activeCount] = await Promise.all([
		searchParams,
		prisma.user.count({ where: { org_id: orgId, deleted_at: null, role: { in: ["employee", "manager"] } } }),
	]);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Employees</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Manage your workforce, roles, and departments.
				</p>
			</div>

			<EmployeesPageTabs
				activeTab={tab}
				seatCount={org.seat_count}
				activeCount={activeCount}
			>
				{tab === "active" ? (
					<Suspense>
						<EmployeesTable />
					</Suspense>
				) : null}
			</EmployeesPageTabs>
		</div>
	);
}
