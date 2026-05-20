import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { EmployeesTable } from "@/components/dashboard/employees/employees-table";

export const metadata = { title: "Employees" };

export default async function EmployeesPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	const orgId = user.app_metadata?.org_id as string | undefined;
	const org = orgId ? await prisma.organization.findUnique({ where: { id: orgId }, select: { plan: true, is_internal: true } }) : null;
	if (!org || !canAccess(org.plan, org.is_internal, "employees")) redirect("/dashboard?upgrade=employees");

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Employees</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Manage your workforce, roles, and departments.
				</p>
			</div>

			<Suspense>
				<EmployeesTable />
			</Suspense>
		</div>
	);
}
