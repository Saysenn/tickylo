import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { canAccess } from "@/lib/utils/plan-gate";
import { InvoicesClient } from "@/components/dashboard/invoices/invoices-client";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	if (user.app_metadata?.role !== "admin") redirect("/dashboard");

	const orgId = user.app_metadata?.org_id as string | undefined;
	const org = orgId ? await prisma.organization.findUnique({
		where: { id: orgId },
		select: { plan: true, is_internal: true, invoices_enabled: true, name: true, logo_url: true },
	}) : null;

	if (!org || !canAccess(org.plan, org.is_internal, "reports")) redirect("/dashboard?upgrade=reports");
	if (!org.invoices_enabled) redirect("/dashboard");

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Invoices</h1>
				<p className="text-ink-3 mt-1 text-sm">Generate and manage client invoices.</p>
			</div>
			<InvoicesClient orgName={org.name} orgLogoUrl={org.logo_url} />
		</div>
	);
}
