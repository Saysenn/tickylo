import { Suspense } from "react";
import { TicketsTable } from "@/components/dashboard/tasks/tasks-table";

export const metadata = { title: "Tickets" };

export default function TicketsPage() {
	return (
		<div className="w-full space-y-6">
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
