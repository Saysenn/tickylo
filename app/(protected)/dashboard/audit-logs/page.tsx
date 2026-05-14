import { AuditLogsTable } from "@/components/dashboard/audit-logs/audit-logs-table";

export default function AuditLogsPage() {
	return (
		<div className="relative w-full space-y-8">
			<div
				className="fixed inset-0 -z-10 pointer-events-none"
				style={{
					background: `
						radial-gradient(ellipse at 12% 8%, rgba(128, 237, 153, 0.16) 0%, transparent 42%),
						radial-gradient(ellipse at 88% 85%, rgba(128, 237, 153, 0.10) 0%, transparent 42%)
					`,
				}}
			/>

			<div>
				<h1 className="text-2xl font-bold text-ink">Ticket Logs</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Immutable record of all actions performed in your organization.
				</p>
			</div>

			<AuditLogsTable />
		</div>
	);
}
