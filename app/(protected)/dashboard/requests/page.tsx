import { Suspense } from "react";
import { RequestsTable } from "@/components/dashboard/requests/requests-table";

export const metadata = { title: "Requests" };

export default function RequestsPage() {
	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Requests</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Handle leave requests, approvals, and team submissions.
				</p>
			</div>
			<Suspense>
				<RequestsTable />
			</Suspense>
		</div>
	);
}
