import { EmployeeReportsSection } from "@/components/dashboard/reports/employee-reports-section";

export default function ReportsPage() {
	return (
		<div className="relative w-full space-y-8">
			<div
				className="fixed inset-0 -z-10 pointer-events-none"
				style={{
					background: `
						radial-gradient(ellipse at 12% 8%, rgba(128, 237, 153, 0.20) 0%, transparent 42%),
						radial-gradient(ellipse at 88% 85%, rgba(128, 237, 153, 0.14) 0%, transparent 42%)
					`,
				}}
			/>

			<div>
				<h1 className="text-2xl font-bold text-ink">Reports</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Generate and manage employee performance reports.
				</p>
			</div>

			<EmployeeReportsSection />
		</div>
	);
}
