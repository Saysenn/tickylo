import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { TicketRequestsTable } from "@/components/dashboard/ticket-requests/ticket-requests-table";
import { PageTour } from "@/components/dashboard/page-tour";
import type { DriveStep } from "driver.js";

const TICKET_REQUESTS_STEPS: DriveStep[] = [
	{
		element: "#tour-requests-page",
		popover: {
			title: "Requests",
			description: "Your team submits transfer requests, reopen requests, and deadline extensions here. Approve or reject each one.",
		},
	},
];

export const metadata = { title: "Ticket Requests" };

export default async function TicketRequestsPage() {
	const admin = await requireAdmin();
	if (!admin) redirect("/dashboard");

	return (
		<div id="tour-requests-page" className="w-full space-y-6">
			<Suspense><PageTour tourKey="ticket-requests" steps={TICKET_REQUESTS_STEPS} /></Suspense>
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
