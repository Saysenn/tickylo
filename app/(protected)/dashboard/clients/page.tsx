import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientsTable } from "@/components/dashboard/clients/clients-table";

export const metadata = { title: "Clients" };

export default async function ClientsPage() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirect("/login");
	if (user.app_metadata?.role !== "admin") redirect("/dashboard");

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Clients</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Manage clients, billing rates, and discounts for invoice generation.
				</p>
			</div>
			<ClientsTable />
		</div>
	);
}
