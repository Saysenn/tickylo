"use client";

import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const LEAVE_STATUS_STYLES: Record<string, string> = {
	pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	approved: "bg-green-500/15 text-green-700 border-green-500/20",
	rejected: "bg-red-500/15 text-red-700 border-red-500/20",
	cancelled: "bg-accent text-ink-3 border-border/40",
};

const TASK_STATUS_STYLES: Record<string, string> = {
	pending: "bg-accent text-ink-3 border-border/40",
	assigned: "bg-blue-500/15 text-blue-700 border-blue-500/20",
	in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	completed: "bg-green-500/15 text-green-700 border-green-500/20",
};

// Accent presets
const ACCENT_STRONG = "bg-mint/20 border-mint/40";
const ACCENT_GREEN = "bg-green-500/10 border-green-500/20";
const ACCENT_YELLOW = "bg-yellow-500/15 border-yellow-500/20";
const ACCENT_RED = "bg-red-500/15 border-red-500/20";
const ACCENT_GRAY = "bg-gray-200/50 border-border/40";

interface StatCardProps {
	label: string;
	value: string | number;
	sub?: string;
	accent?: string;
	showActiveDot?: boolean;
}

function StatCard({
	label,
	value,
	sub,
	accent = ACCENT_GREEN,
	showActiveDot = false,
}: StatCardProps) {
	const isStrong = accent === ACCENT_STRONG;
	return (
		<div className={`rounded-lg border p-4 ${accent}`}>
			<div className="flex items-center gap-1.5 mb-1">
				{showActiveDot && (
					<span className="relative flex h-2 w-2 shrink-0">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-600 opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-green-600" />
					</span>
				)}
				<p
					className={cn(
						"text-xs uppercase tracking-wider",
						isStrong ? "text-ink/60" : "text-ink-3",
					)}
				>
					{label}
				</p>
			</div>
			<p
				className={cn("text-2xl font-bold", isStrong ? "text-ink" : "text-ink")}
			>
				{value}
			</p>
			{sub && (
				<p
					className={cn(
						"text-xs mt-0.5",
						isStrong ? "text-ink/60" : "text-ink-3",
					)}
				>
					{sub}
				</p>
			)}
		</div>
	);
}

export default function ReportsPage() {
	const { data: report, isLoading } = useQuery<any>({
		queryKey: ["reports"],
		queryFn: () => APIService.reports.summary(),
	});

	return (
		<div className="w-full space-y-8">
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
					{/* Leave Stats */}
					<section className="space-y-3">
						<h2 className="font-semibold text-ink">Leave Requests</h2>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
							<StatCard
								label="Total"
								value={report.leaves.total}
								accent={ACCENT_STRONG}
							/>
							<StatCard
								label="Pending"
								value={report.leaves.pending}
								accent={ACCENT_YELLOW}
							/>
							<StatCard
								label="Approved"
								value={report.leaves.approved}
								accent={ACCENT_GREEN}
							/>
							<StatCard
								label="Rejected"
								value={report.leaves.rejected}
								accent={ACCENT_RED}
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
								accent={ACCENT_STRONG}
							/>
							<StatCard
								label="Unassigned"
								value={report.tasks.pending}
								accent={ACCENT_GRAY}
							/>
							<StatCard
								label="In Progress"
								value={report.tasks.in_progress}
								accent={ACCENT_YELLOW}
							/>
							<StatCard
								label="Completed"
								value={report.tasks.completed}
								accent={ACCENT_GREEN}
							/>
						</div>
					</section>

					{/* Time Stats */}
					<section className="space-y-3">
						<h2 className="font-semibold text-ink">Time (This Month)</h2>
						<div className="grid grid-cols-2 gap-3">
							<StatCard
								label="Total team hours"
								value={formatDuration(report.time.totalMsThisMonth)}
								sub="Across all tracked sessions"
								accent={ACCENT_STRONG}
							/>
							<StatCard
								label="Active members"
								value={report.time.activeUsers}
								sub="Members with time entries this month"
								accent={ACCENT_GREEN}
								showActiveDot
							/>
						</div>
					</section>

					{/* Recent Leaves */}
					<section className="space-y-3">
						<h2 className="font-semibold text-ink">Recent Leave Requests</h2>
						{report.recent.leaves.length > 0 ? (
							<div className="rounded-lg border overflow-x-auto">
								<table className="w-full text-sm min-w-[400px]">
									<thead>
										<tr className="border-b bg-accent/30">
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
									<tbody className="divide-y">
										{report.recent.leaves.map((l: any) => (
											<tr key={l.id} className="hover:bg-accent/10">
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
							<div className="rounded-lg border overflow-x-auto">
								<table className="w-full text-sm min-w-[400px]">
									<thead>
										<tr className="border-b bg-accent/30">
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
									<tbody className="divide-y">
										{report.recent.tasks.map((t: any) => (
											<tr key={t.id} className="hover:bg-accent/10">
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
