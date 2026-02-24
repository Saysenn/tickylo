import { PerformanceTable } from "@/components/dashboard/performance/performance-table";

export const metadata = { title: "Performance" };

export default function PerformancePage() {
	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Performance</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Task completion rates, time logged, and employee productivity metrics.
				</p>
			</div>

			<PerformanceTable />
		</div>
	);
}
