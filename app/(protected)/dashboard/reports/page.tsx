"use client";

import Link from "next/link";
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
					Employee performance, leave requests, and task activity — all in one place.
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

					{/* Leave + Tasks — side by side */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

						{/* ── Leave Requests card ── */}
						<div className="glass rounded-2xl flex flex-col overflow-hidden">
							{/* Header */}
							<div className="px-5 pt-5 pb-4 border-b border-mint/10">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="font-semibold text-ink">Leave Requests</h2>
										<p className="text-xs text-ink-3 mt-0.5">All-time summary</p>
									</div>
									<Link href="/dashboard/requests" className="text-xs font-medium text-mint hover:text-mint/70 transition-colors">
										View all →
									</Link>
								</div>
								{/* Stat badges — stretch equally */}
								<div className="flex items-center gap-2 mt-3">
									<div className="flex flex-1 flex-col items-center px-3 py-1.5 rounded-lg bg-ink/5">
										<span className="text-lg font-bold text-ink leading-none">{report.leaves.total}</span>
										<span className="text-[10px] text-ink-3 mt-0.5 uppercase tracking-wide">Total</span>
									</div>
									<div className="flex flex-1 flex-col items-center px-3 py-1.5 rounded-lg bg-yellow-500/8">
										<span className="text-lg font-bold text-yellow-700 leading-none">{report.leaves.pending}</span>
										<span className="text-[10px] text-yellow-600/70 mt-0.5 uppercase tracking-wide">Pending</span>
									</div>
									<div className="flex flex-1 flex-col items-center px-3 py-1.5 rounded-lg bg-mint/10">
										<span className="text-lg font-bold text-mint leading-none">{report.leaves.approved}</span>
										<span className="text-[10px] text-mint/60 mt-0.5 uppercase tracking-wide">Approved</span>
									</div>
									<div className="flex flex-1 flex-col items-center px-3 py-1.5 rounded-lg bg-red-500/8">
										<span className="text-lg font-bold text-red-600 leading-none">{report.leaves.rejected}</span>
										<span className="text-[10px] text-red-400/70 mt-0.5 uppercase tracking-wide">Rejected</span>
									</div>
								</div>
							</div>

							{/* Mini table */}
							<div className="flex-1 overflow-x-auto">
								{report.recent.leaves.length > 0 ? (
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b border-mint/8">
												<th className="text-left px-5 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Employee</th>
												<th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Type</th>
												<th className="text-right px-5 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-mint/6">
											{report.recent.leaves.map((l: any) => (
												<tr key={l.id} className="hover:bg-mint/5 transition-colors">
													<td className="px-5 py-2.5">
														<p className="text-xs font-medium text-ink truncate max-w-[140px]">{l.user?.name ?? "—"}</p>
													</td>
													<td className="px-3 py-2.5 text-xs text-ink-3 capitalize">{l.type}</td>
													<td className="px-5 py-2.5 text-right">
														<Badge variant="outline" className={cn("capitalize text-[10px] px-1.5 py-0", LEAVE_STATUS_STYLES[l.status])}>
															{l.status}
														</Badge>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								) : (
									<p className="px-5 py-6 text-xs text-ink-3">No leave requests yet.</p>
								)}
							</div>

						</div>

						{/* ── Tasks card ── */}
						<div className="glass rounded-2xl flex flex-col overflow-hidden">
							{/* Header */}
							<div className="px-5 pt-5 pb-4 border-b border-mint/10">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="font-semibold text-ink">Tasks</h2>
										<p className="text-xs text-ink-3 mt-0.5">All-time summary</p>
									</div>
									<Link href="/dashboard/tasks" className="text-xs font-medium text-mint hover:text-mint/70 transition-colors">
										View all →
									</Link>
								</div>
								{/* Stat badges — stretch equally */}
								<div className="flex items-center gap-2 mt-3">
									<div className="flex flex-1 flex-col items-center px-3 py-1.5 rounded-lg bg-ink/5">
										<span className="text-lg font-bold text-ink leading-none">{report.tasks.total}</span>
										<span className="text-[10px] text-ink-3 mt-0.5 uppercase tracking-wide">Total</span>
									</div>
									<div className="flex flex-1 flex-col items-center px-3 py-1.5 rounded-lg bg-ink/5">
										<span className="text-lg font-bold text-ink leading-none">{report.tasks.pending}</span>
										<span className="text-[10px] text-ink-3 mt-0.5 uppercase tracking-wide">Unassigned</span>
									</div>
									<div className="flex flex-1 flex-col items-center px-3 py-1.5 rounded-lg bg-yellow-500/8">
										<span className="text-lg font-bold text-yellow-700 leading-none">{report.tasks.in_progress}</span>
										<span className="text-[10px] text-yellow-600/70 mt-0.5 uppercase tracking-wide">In Progress</span>
									</div>
									<div className="flex flex-1 flex-col items-center px-3 py-1.5 rounded-lg bg-mint/10">
										<span className="text-lg font-bold text-mint leading-none">{report.tasks.completed}</span>
										<span className="text-[10px] text-mint/60 mt-0.5 uppercase tracking-wide">Done</span>
									</div>
								</div>
							</div>

							{/* Mini table */}
							<div className="flex-1 overflow-x-auto">
								{report.recent.tasks.length > 0 ? (
									<table className="w-full text-sm">
										<thead>
											<tr className="border-b border-mint/8">
												<th className="text-left px-5 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Title</th>
												<th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Assignee</th>
												<th className="text-right px-5 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Status</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-mint/6">
											{report.recent.tasks.map((t: any) => (
												<tr key={t.id} className="hover:bg-mint/5 transition-colors">
													<td className="px-5 py-2.5">
														<p className="text-xs font-medium text-ink truncate max-w-[140px]">{t.title}</p>
													</td>
													<td className="px-3 py-2.5 text-xs text-ink-3 truncate max-w-[100px]">
														{t.assignee?.name ?? t.assignee?.email ?? "Unassigned"}
													</td>
													<td className="px-5 py-2.5 text-right">
														<Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TASK_STATUS_STYLES[t.status])}>
															{t.status.replace("_", " ")}
														</Badge>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								) : (
									<p className="px-5 py-6 text-xs text-ink-3">No tasks yet.</p>
								)}
							</div>

						</div>

					</div>
				</div>
			) : null}
		</div>
	);
}
