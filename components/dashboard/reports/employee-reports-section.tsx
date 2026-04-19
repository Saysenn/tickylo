"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Send, FileText, CalendarDays } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
	SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
	DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
	formatInitials, todayDateStr, startOfMonthDateStr,
	startOfLastMonthDateStr, endOfLastMonthDateStr, daysAgoDateStr,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface Employee {
	id: string;
	email: string;
	name: string | null;
	avatar_url?: string | null;
	role: string;
}

const PERIOD_PRESETS = [
	{ value: "this_month",   label: "This month",   from: () => startOfMonthDateStr(),     to: () => todayDateStr() },
	{ value: "last_month",   label: "Last month",   from: () => startOfLastMonthDateStr(), to: () => endOfLastMonthDateStr() },
	{ value: "last_30_days", label: "Last 30 days", from: () => daysAgoDateStr(29),        to: () => todayDateStr() },
	{ value: "last_90_days", label: "Last 90 days", from: () => daysAgoDateStr(89),        to: () => todayDateStr() },
	{ value: "custom",       label: "Custom range", from: () => startOfMonthDateStr(),     to: () => todayDateStr() },
];

function periodLabel(preset: string): string {
	return PERIOD_PRESETS.find((p) => p.value === preset)?.label ?? "This month";
}

export function EmployeeReportsSection() {
	const [page,   setPage]   = useState(1);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState("all");

	// Period state — drives the Generate dialog dates
	const [period,    setPeriod]    = useState("this_month");
	const [customFrom, setCustomFrom] = useState(startOfMonthDateStr());
	const [customTo,   setCustomTo]   = useState(todayDateStr());

	const [generateDialog, setGenerateDialog] = useState<{ open: boolean; employee: Employee | null }>({
		open: false, employee: null,
	});

	// Resolve from/to from selected period
	const { resolvedFrom, resolvedTo } = useMemo(() => {
		if (period === "custom") return { resolvedFrom: customFrom, resolvedTo: customTo };
		const preset = PERIOD_PRESETS.find((p) => p.value === period)!;
		return { resolvedFrom: preset.from(), resolvedTo: preset.to() };
	}, [period, customFrom, customTo]);

	const { data, isLoading } = useQuery({
		queryKey: ["employees-list-reports", page],
		queryFn: () => APIService.employees.list(page, 10),
	});

	const employees: Employee[] = (data?.data ?? []).filter((e: Employee) => e.role !== "admin");
	const totalPages: number = data?.totalPages ?? 1;

	const filtered = employees.filter((e) => {
		// status filter — "generated" always empty until backend supports it
		if (status === "generated") return false;
		if (!search.trim()) return true;
		const q = search.toLowerCase();
		return (e.name ?? "").toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
	});

	return (
		<section className="space-y-4">
			{/* Toolbar row 1 — period + status */}
			<div className="flex flex-wrap items-end gap-3">
				{/* Period preset */}
				<div className="space-y-1">
					<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Report period</p>
					<SelectRoot value={period} onValueChange={setPeriod}>
						<SelectTrigger className="h-8 w-40 text-sm">
							<CalendarDays className="w-3.5 h-3.5 text-ink-3 shrink-0" />
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{PERIOD_PRESETS.map((p) => (
								<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
							))}
						</SelectContent>
					</SelectRoot>
				</div>

				{/* Custom date pickers */}
				{period === "custom" && (
					<>
						<div className="space-y-1">
							<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">From</p>
							<input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
								className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint" />
						</div>
						<div className="space-y-1">
							<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">To</p>
							<input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
								className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint" />
						</div>
					</>
				)}

				{/* Status filter */}
				<div className="space-y-1">
					<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Status</p>
					<SelectRoot value={status} onValueChange={setStatus}>
						<SelectTrigger className="h-8 w-36 text-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All employees</SelectItem>
							<SelectItem value="no_report">No report yet</SelectItem>
							<SelectItem value="generated">Generated</SelectItem>
						</SelectContent>
					</SelectRoot>
				</div>

				{/* Search */}
				<div className="space-y-1">
					<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Search</p>
					<input
						type="text"
						placeholder="Search employees..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint w-44"
					/>
				</div>

				<p className="text-sm text-ink-3 whitespace-nowrap self-end pb-1">
					{filtered.length} {filtered.length === 1 ? "employee" : "employees"}
				</p>
			</div>

			{/* Active period hint */}
			<p className="text-xs text-ink-3">
				Generating reports for:{" "}
				<span className="text-ink font-medium">
					{period !== "custom" ? periodLabel(period) : `${resolvedFrom} → ${resolvedTo}`}
				</span>
			</p>

			{/* Table */}
			{isLoading ? (
				<div className="flex items-center justify-center py-16">
					<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			) : (
				<div className="space-y-3">
					<div className="rounded-lg border overflow-x-auto">
						<table className="w-full min-w-[560px] text-sm">
							<thead>
								<tr className="border-b bg-accent/30">
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Employee</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Last Report</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Period</th>
									<th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{filtered.length === 0 ? (
									<tr>
										<td colSpan={4} className="px-4 py-8 text-center text-xs text-ink-3">
											No employees found.
										</td>
									</tr>
								) : filtered.map((emp) => (
									<tr key={emp.id} className="hover:bg-accent/20 transition-colors">
										<td className="px-4 py-2.5">
											<div className="flex items-center gap-3">
												<Avatar className="w-8 h-8 shrink-0">
													<AvatarImage src={emp.avatar_url ?? undefined} />
													<AvatarFallback className="text-xs bg-mint/15 text-ink-2">
														{formatInitials(emp.name, emp.email)}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="text-xs font-medium text-ink truncate">{emp.name ?? "—"}</p>
													<p className="text-xs text-ink-3 truncate">{emp.email}</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-2.5">
											<Badge variant="outline" className="text-[10px] text-ink-3 border-border/40 bg-accent/30">
												No report yet
											</Badge>
										</td>
										<td className="px-4 py-2.5 hidden sm:table-cell">
											<span className="text-xs text-ink-3">{periodLabel(period)}</span>
										</td>
										<td className="px-4 py-2.5">
											<div className="flex items-center justify-end gap-1.5">
												<Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
													onClick={() => setGenerateDialog({ open: true, employee: emp })}>
													<FileText className="w-3 h-3" />
													Generate
												</Button>
												<Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" disabled>
													<Eye className="w-3 h-3" />
													View
												</Button>
												<Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled title="Send report">
													<Send className="w-3.5 h-3.5" />
												</Button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{totalPages > 1 && (
						<div className="flex items-center justify-between text-xs text-ink-3">
							<span>Page {page} of {totalPages}</span>
							<div className="flex gap-1">
								<button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
									className="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-accent/30">
									Prev
								</button>
								<button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}
									className="px-2 py-1 rounded border border-border disabled:opacity-40 hover:bg-accent/30">
									Next
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Generate Report Dialog */}
			<DialogRoot open={generateDialog.open} onOpenChange={(open) => setGenerateDialog((prev) => ({ ...prev, open }))}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Generate Report</DialogTitle>
						<DialogDescription>
							For: <span className="font-medium text-ink">{generateDialog.employee?.name ?? generateDialog.employee?.email}</span>
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{/* Period summary */}
						<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mint/8 border border-mint/20">
							<CalendarDays className="w-3.5 h-3.5 text-mint shrink-0" />
							<p className="text-xs text-ink">
								<span className="font-medium">{periodLabel(period)}</span>
								<span className="text-ink-3 ml-1">({resolvedFrom} → {resolvedTo})</span>
							</p>
						</div>

						{/* Allow overriding dates inside dialog */}
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<Label htmlFor="report-from">From</Label>
								<Input id="report-from" type="date" value={resolvedFrom}
									onChange={(e) => { setPeriod("custom"); setCustomFrom(e.target.value); }}
									className="h-8" />
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="report-to">To</Label>
								<Input id="report-to" type="date" value={resolvedTo}
									onChange={(e) => { setPeriod("custom"); setCustomTo(e.target.value); }}
									className="h-8" />
							</div>
						</div>

						<p className="text-xs text-ink-3 bg-accent/40 rounded-lg px-3 py-2 border border-border/40">
							Report generation is coming soon. This will compile task completion, time logged, and leave data into a shareable PDF report.
						</p>
						<div className="flex justify-end gap-2">
							<Button size="sm" variant="ghost" onClick={() => setGenerateDialog({ open: false, employee: null })}>Cancel</Button>
							<Button size="sm" disabled>Generate Report</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>
		</section>
	);
}
