"use client";

import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Badge } from "@/components/ui/badge";
import { EmployeeReportsSection } from "@/components/dashboard/reports/employee-reports-section";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const LEAVE_STATUS_STYLES: Record<string, string> = {
	pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	approved: "bg-green-500/15 text-green-700 border-green-500/20",
	rejected: "bg-red-500/15 text-red-700 border-red-500/20",
	cancelled: "bg-accent text-ink-3 border-border/40",
};

const TASK_STATUS_STYLES: Record<string, string> = {
	pending: "bg-accent text-ink-3 border-border/40",
	assigned: "bg-mint/10 text-mint border-mint/20",
	in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	completed: "bg-green-500/15 text-green-700 border-green-500/20",
};

interface StatCardProps {
	label: string;
	value: string | number;
	sub?: string;
	showActiveDot?: boolean;
	featured?: boolean;
	accentClass?: string; // border + text color tint for non-featured glass cards
}

function StatCard({
	label,
	value,
	sub,
	showActiveDot = false,
	featured = false,
	accentClass = "",
}: StatCardProps) {
	if (featured) {
		return (
			<div
				className="rounded-xl border border-mint/30 p-4 relative overflow-hidden shadow-[0_0_40px_rgba(128,237,153,0.22)] hover:shadow-[0_0_60px_rgba(128,237,153,0.35)] transition-shadow"
				style={{ background: "linear-gradient(135deg, #1c3a1c 0%, #143018 50%, #0d200d 100%)" }}
			>
				<div
					className="absolute inset-0 pointer-events-none"
					style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(128, 237, 153, 0.15) 0%, transparent 60%)" }}
				/>
				<div className="relative flex items-center gap-1.5 mb-1">
					<p className="text-xs uppercase tracking-wider text-white/60">{label}</p>
				</div>
				<p className="relative text-2xl font-bold text-white">{value}</p>
				{sub && <p className="relative text-xs mt-0.5 text-white/50">{sub}</p>}
			</div>
		);
	}

	return (
		<div className={cn("glass rounded-xl p-4 transition-shadow hover:shadow-[0_4px_20px_rgba(128,237,153,0.12)]", accentClass)}>
			<div className="flex items-center gap-1.5 mb-1">
				{showActiveDot && (
					<span className="relative flex h-2 w-2 shrink-0">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
					</span>
				)}
				<p className="text-xs uppercase tracking-wider text-ink-3">{label}</p>
			</div>
			<p className="text-2xl font-bold text-ink">{value}</p>
			{sub && <p className="text-xs mt-0.5 text-ink-3">{sub}</p>}
		</div>
	);
}

export default function ReportsPage() {
	const { data: report, isLoading } = useQuery<any>({
		queryKey: ["reports"],
		queryFn: () => APIService.reports.summary(),
	});

	return (
		<div className="relative w-full space-y-8">
			{/* Mint mesh gradient background */}
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
					Team-wide analytics and activity overview.
				</p>
			</div>

			{isLoading ? (
				<div className="flex items-center justify-center py-24">
					<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			) : report ? (
				<div className="space-y-8">
					{/* Employee Reports — full width, above all stats */}
					<EmployeeReportsSection />

					{/* Leave Stats */}
					<section className="space-y-3">
						<h2 className="font-semibold text-ink">Leave Requests</h2>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<StatCard
								label="Total"
								value={report.leaves.total}
								featured
							/>
							<StatCard
								label="Pending"
								value={report.leaves.pending}
								accentClass="border-yellow-400/30"
							/>
							<StatCard
								label="Approved"
								value={report.leaves.approved}
								accentClass="border-mint/30"
							/>
							<StatCard
								label="Rejected"
								value={report.leaves.rejected}
								accentClass="border-red-400/30"
							/>
						</div>
					</section>

					{/* Task Stats */}
					<section className="space-y-3">
						<h2 className="font-semibold text-ink">Tasks</h2>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<StatCard
								label="Total"
								value={report.tasks.total}
								featured
							/>
							<StatCard
								label="Unassigned"
								value={report.tasks.pending}
							/>
							<StatCard
								label="In Progress"
								value={report.tasks.in_progress}
								accentClass="border-yellow-400/30"
							/>
							<StatCard
								label="Completed"
								value={report.tasks.completed}
								accentClass="border-mint/30"
							/>
						</div>
					</section>

{/* Recent Leaves */}
					<section className="space-y-3">
						<h2 className="font-semibold text-ink">Recent Leave Requests</h2>
						{report.recent.leaves.length > 0 ? (
							<div className="glass rounded-xl overflow-x-auto">
								<table className="w-full text-sm min-w-[400px]">
									<thead>
										<tr className="border-b border-mint/10">
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
												Employee
											</th>
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
												Type
											</th>
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
												Dates
											</th>
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
												Status
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-mint/8">
										{report.recent.leaves.map((l: any) => (
											<tr key={l.id} className="hover:bg-mint/5">
												<td className="px-4 py-2">
													<p className="font-medium text-ink">
														{l.user?.name ?? "—"}
													</p>
													<p className="text-xs text-ink-3">{l.user?.email}</p>
												</td>
												<td className="px-4 py-2 capitalize">{l.type}</td>
												<td className="px-4 py-2 text-ink-3 text-xs hidden sm:table-cell">
													{formatDate(l.start)} → {formatDate(l.end)}
												</td>
												<td className="px-4 py-2">
													<Badge
														variant="outline"
														className={cn(
															"capitalize text-xs",
															LEAVE_STATUS_STYLES[l.status],
														)}
													>
														{l.status}
													</Badge>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="text-sm text-ink-3">No recent leave requests.</p>
						)}
					</section>

					{/* Recent Tasks */}
					<section className="space-y-3">
						<h2 className="font-semibold text-ink">Recent Tasks</h2>
						{report.recent.tasks.length > 0 ? (
							<div className="glass rounded-xl overflow-x-auto">
								<table className="w-full text-sm min-w-[400px]">
									<thead>
										<tr className="border-b border-mint/10">
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
												Title
											</th>
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
												Assignee
											</th>
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
												Status
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-mint/8">
										{report.recent.tasks.map((t: any) => (
											<tr key={t.id} className="hover:bg-mint/5">
												<td className="px-4 py-2 font-medium text-ink">
													{t.title}
												</td>
												<td className="px-4 py-2 text-ink-3 hidden sm:table-cell">
													{t.assignee?.name ?? t.assignee?.email ?? (
														<span className="text-xs">Unassigned</span>
													)}
												</td>
												<td className="px-4 py-2">
													<Badge
														variant="outline"
														className={cn(
															"text-xs",
															TASK_STATUS_STYLES[t.status],
														)}
													>
														{t.status.replace("_", " ")}
													</Badge>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<p className="text-sm text-ink-3">No recent tasks.</p>
						)}
					</section>
				</div>
			) : null}
		</div>
	);
}
