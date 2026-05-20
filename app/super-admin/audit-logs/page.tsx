"use client";

import { AuditLogsTable } from "@/components/dashboard/audit-logs/audit-logs-table";
import APIService from "@/lib/infra/api";

export default function SuperAdminAuditLogsPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Audit Logs</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Platform-wide immutable record of all actions across all organizations.
				</p>
			</div>

			<AuditLogsTable
				fetchFn={(params) => APIService.superAdmin.getAuditLogs(params) as any}
				queryKey="super-admin-audit-logs"
			/>
		</div>
	);
}
