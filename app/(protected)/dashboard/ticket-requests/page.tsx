import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { TicketRequestsTable } from "@/components/dashboard/ticket-requests/ticket-requests-table";

export const metadata = { title: "Ticket Requests" };

export default async function TicketRequestsPage() {
	const admin = await requireAdmin();
	if (!admin) redirect("/dashboard");

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Ticket Requests</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Review and action pending reopen, transfer, and due date change requests.
				</p>
			</div>
			<TicketRequestsTable />
		</div>
	);
}
