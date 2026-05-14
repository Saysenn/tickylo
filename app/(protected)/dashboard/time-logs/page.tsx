import { TimeLogsTable } from "@/components/dashboard/time-logs/time-logs-table";

export const metadata = { title: "Time Logs" };

export default function TimeLogsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Time Logs</h1>
				<p className="text-ink-3 mt-1 text-sm">All time entries across your organization.</p>
			</div>
			<TimeLogsTable />
		</div>
	);
}
