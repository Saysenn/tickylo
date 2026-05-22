import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { DepartmentsPageClient } from "@/components/dashboard/departments/departments-page-client";

export const metadata = { title: "Departments" };

export default async function DepartmentsPage() {
	const admin = await requireAdmin();
	if (!admin) redirect("/dashboard");

	const orgId = admin.app_metadata?.org_id as string | undefined;
	if (!orgId) redirect("/dashboard");

	const org = await prisma.organization.findUnique({
		where: { id: orgId },
		select: { departments_enabled: true, plan: true, is_internal: true },
	});

	if (!canAccess(org?.plan ?? "", org?.is_internal ?? false, "departments")) redirect("/dashboard?upgrade=departments");
	if (!org?.departments_enabled) redirect("/dashboard");

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-bold text-ink">Departments</h1>
				<p className="text-sm text-ink-3 mt-0.5">Manage departments, assign managers, and organise your team.</p>
			</div>
			<DepartmentsPageClient />
		</div>
	);
}
