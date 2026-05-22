import { Suspense } from "react";
import { TicketsTable } from "@/components/dashboard/tasks/tasks-table";
import { PageTour } from "@/components/dashboard/page-tour";
import type { DriveStep } from "driver.js";

export const metadata = { title: "Tickets" };

const TICKETS_STEPS: DriveStep[] = [
	{
		element: "#tour-tickets-page",
		popover: {
			title: "Tickets",
			description: "This is your main work queue. Create tickets, assign them to team members, filter by status, and track every task from open to completed.",
		},
	},
];

export default function TicketsPage() {
	return (
		<div id="tour-tickets-page" className="w-full space-y-6">
			<Suspense><PageTour tourKey="tickets" steps={TICKETS_STEPS} /></Suspense>
			<div>
				<h1 className="text-2xl font-bold text-ink">Tickets</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Create, assign, and track work across your team.
				</p>
			</div>
			<Suspense>
				<TicketsTable />
			</Suspense>
		</div>
	);
}
