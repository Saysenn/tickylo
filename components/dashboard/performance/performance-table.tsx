"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { TimeDateRange } from "@/components/dashboard/time-manager/time-date-range";
import { formatDurationMs, startOfMonthDateStr, todayDateStr } from "@/lib/utils/format";
import { TrendingUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store/hooks";

interface PerformanceEntry {
	user: { id: string; name: string | null; email: string };
	tasks_completed: number;
	tasks_in_progress: number;
	tasks_total: number;
	completion_rate: number;
	avg_days_to_complete: number;
	time_this_period_ms: number;
}

function exportToCsv(data: PerformanceEntry[], from: string, to: string) {
	const header = ["Employee", "Email", "Completed", "In Progress", "Total Tasks", "Completion Rate", "Avg Days to Complete", "Time Logged"];
	const rows = data.map((e) => [
		e.user.name ?? "",
		e.user.email,
		e.tasks_completed,
		e.tasks_in_progress,
		e.tasks_total,
		`${Math.round(e.completion_rate * 100)}%`,
		e.avg_days_to_complete > 0 ? `${e.avg_days_to_complete}d` : "",
		e.time_this_period_ms > 0 ? formatDurationMs(e.time_this_period_ms) : "",
	]);

	const csv = [header, ...rows]
		.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
		.join("\n");

	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement("a");
	a.href     = url;
	a.download = `performance-${from}-to-${to}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export function PerformanceTable() {
	const currentUserId = useAppSelector((s) => s.auth.user?.id);
	const [from,   setFrom]   = useState(startOfMonthDateStr());
	const [to,     setTo]     = useState(todayDateStr());
	const [search, setSearch] = useState("");

	const { data, isLoading, isError } = useQuery<PerformanceEntry[]>({
		queryKey: ["performance", from, to],
		queryFn: () => APIService.performance.list(from, to),
	});

	const filtered = (data ?? []).filter((e) => {
		if (!search.trim()) return true;
		const q = search.toLowerCase();
		return (
			(e.user.name ?? "").toLowerCase().includes(q) ||
			e.user.email.toLowerCase().includes(q)
		);
	});

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end gap-3">
				<TimeDateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
				<input
					type="text"
					placeholder="Search employees..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint w-44"
				/>
			</div>
			{data && data.length > 0 && (
				<div>
					<Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => exportToCsv(data, from, to)}>
						<Download className="w-3.5 h-3.5" />
						Export CSV
					</Button>
				</div>
			)}

			{/* Loading */}
			{isLoading && (
				<div className="flex items-center justify-center py-24">
					<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			)}

			{/* Error */}
			{isError && (
				<div className="flex items-center justify-center py-24">
					<p className="text-sm text-ink-3">Failed to load performance data.</p>
				</div>
			)}

			{/* Empty */}
			{!isLoading && !isError && data?.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
						<TrendingUp className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No data for this period</h3>
					<p className="text-sm text-ink-3 max-w-xs">
						No employees have activity in the selected date range.
					</p>
				</div>
			)}

			{/* Table */}
			{!isLoading && data && data.length > 0 && (
				<div className="rounded-lg border overflow-x-auto">
					<table className="w-full min-w-[700px] text-sm">
						<thead>
							<tr className="border-b bg-accent/30">
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									Employee
								</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									Completed
								</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									In Progress
								</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									Total Tasks
								</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									Completion Rate
								</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden lg:table-cell">
									Avg Days
								</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									Time Logged
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{filtered.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-4 py-8 text-center text-xs text-ink-3">
										No employees match your search.
									</td>
								</tr>
							) : filtered.map((entry) => {
								const pct  = Math.round(entry.completion_rate * 100);
								const name = entry.user.name ?? entry.user.email;

								return (
									<tr key={entry.user.id} className="hover:bg-accent/20 transition-colors">
										<td className="px-4 py-2">
											<p className="text-xs font-medium text-ink">
												{name}
												{entry.user.id === currentUserId && (
													<span className="ml-1.5 text-[10px] font-normal text-ink-3">(You)</span>
												)}
											</p>
											{entry.user.name && (
												<p className="text-xs text-ink-3">{entry.user.email}</p>
											)}
										</td>
										<td className="px-4 py-2 text-right font-medium text-mint">
											{entry.tasks_completed}
										</td>
										<td className="px-4 py-2 text-right text-mint/60">
											{entry.tasks_in_progress}
										</td>
										<td className="px-4 py-2 text-right text-ink-3">
											{entry.tasks_total}
										</td>
										<td className="px-4 py-2 text-right">
											<div className="flex items-center justify-end gap-2">
												<div className="w-16 h-1.5 rounded-full bg-accent overflow-hidden">
													<div
														className="h-full bg-mint rounded-full"
														style={{ width: `${pct}%` }}
													/>
												</div>
												<span className="text-xs font-medium text-ink w-8 text-right">
													{pct}%
												</span>
											</div>
										</td>
										<td className="px-4 py-2 text-right text-ink-3 text-xs hidden lg:table-cell">
											{entry.avg_days_to_complete > 0
												? `${entry.avg_days_to_complete}d`
												: "—"}
										</td>
										<td className="px-4 py-2 text-right text-ink-3 text-xs">
											{entry.time_this_period_ms > 0
												? formatDurationMs(entry.time_this_period_ms)
												: "—"}
										</td>
									</tr>
								);
							})}
						</tbody>

					</table>
				</div>
			)}
		</div>
	);
}
