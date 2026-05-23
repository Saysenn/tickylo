import { redirect } from "next/navigation";
import { getSessionOrg, isSessionOrg } from "@/lib/auth/get-session-org";
import { InvoiceSettingsSection } from "@/components/dashboard/settings/invoice-settings-section";

export const metadata = { title: "Invoices · Settings" };

export default async function InvoicesSettingsPage() {
	const session = await getSessionOrg();
	if (!isSessionOrg(session) || !session.isAdmin) redirect("/dashboard/settings/profile");

	return (
		<div>
			<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60 mb-5">Invoices</p>
			<InvoiceSettingsSection />
		</div>
	);
}
