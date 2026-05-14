"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Send, FileText, CalendarDays, X, ChevronDown, Trash2 } from "lucide-react";
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
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
	DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
	formatInitials, todayDateStr, startOfMonthDateStr,
	startOfLastMonthDateStr, endOfLastMonthDateStr, daysAgoDateStr,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Pagination } from "@/components/ui/pagination";

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
	const [page,        setPage]        = useState(1);
	const [search,      setSearch]      = useState("");
	const [status,      setStatus]      = useState("all");
	const [bulkAction,  setBulkAction]  = useState<"regenerate" | "remove" | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const [period,     setPeriod]     = useState("this_month");
	const [customFrom, setCustomFrom] = useState(startOfMonthDateStr());
	const [customTo,   setCustomTo]   = useState(todayDateStr());

	const [generateDialog, setGenerateDialog] = useState<{
		open: boolean;
		employee: Employee | null;
		bulk?: boolean;
		bulkEmployees?: Employee[];
	}>({ open: false, employee: null });

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
		if (status === "generated") return false;
		if (!search.trim()) return true;
		const q = search.toLowerCase();
		return (e.name ?? "").toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
	});

	const selectMode  = bulkAction !== null;
	const allSelected = filtered.length > 0 && filtered.every((e) => selectedIds.has(e.id));
	const someSelected = selectedIds.size > 0;

	const toggleAll = () => {
		if (allSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(filtered.map((e) => e.id)));
		}
	};

	const toggleRow = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	};

	const clearSelection = () => {
		setSelectedIds(new Set());
		setBulkAction(null);
	};

	const openBulkGenerate = () => {
		const bulkEmployees = filtered.filter((e) => selectedIds.has(e.id));
		setGenerateDialog({ open: true, employee: null, bulk: true, bulkEmployees });
	};

	return (
		<section className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap items-end gap-3">
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

			{/* Below filters row */}
			<div className="flex items-center justify-between">
				<p className="text-xs text-ink-3">
					Generating reports for:{" "}
					<span className="text-ink font-medium">
						{period !== "custom" ? periodLabel(period) : `${resolvedFrom} → ${resolvedTo}`}
					</span>
				</p>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className={cn(
								"flex items-center gap-2 h-8 px-3 rounded-md border text-xs font-medium transition-colors",
								selectMode
									? "border-mint/40 bg-mint/10 text-mint"
									: "border-border text-ink-3 hover:text-ink hover:border-ink-3/40 bg-background",
							)}
						>
							Bulk actions
							<ChevronDown className="w-3.5 h-3.5" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-48 p-1">
						<DropdownMenuItem
							className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md cursor-pointer"
							onClick={() => { setBulkAction("regenerate"); setSelectedIds(new Set()); }}
						>
							<FileText className="w-3.5 h-3.5 text-ink-3 shrink-0" />
							<span>Regenerate reports</span>
						</DropdownMenuItem>
						<DropdownMenuItem
							className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md cursor-pointer text-destructive focus:text-destructive"
							onClick={() => { setBulkAction("remove"); setSelectedIds(new Set()); }}
						>
							<Trash2 className="w-3.5 h-3.5 shrink-0" />
							<span>Remove reports</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="flex items-center justify-center py-16">
					<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			) : (
				<div className="space-y-3">
					<div className="rounded-lg border overflow-x-auto">
						<table className="w-full min-w-[580px] text-sm">
							<thead>
								<tr className="border-b bg-accent/30">
									{selectMode && (
										<th className="w-10 px-3 py-2.5">
											<input
												type="checkbox"
												checked={allSelected}
												onChange={toggleAll}
												className="rounded border-border accent-mint cursor-pointer"
											/>
										</th>
									)}
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Employee</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Last Report</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Period</th>
									<th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{filtered.length === 0 ? (
									<tr>
										<td colSpan={selectMode ? 5 : 4} className="px-4 py-8 text-center text-xs text-ink-3">
											No employees found.
										</td>
									</tr>
								) : filtered.map((emp) => {
									const isSelected = selectedIds.has(emp.id);
									return (
										<tr key={emp.id} className={cn("transition-colors", isSelected && selectMode ? "bg-mint/5" : "hover:bg-accent/20")}>
											{selectMode && (
												<td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
													<input
														type="checkbox"
														checked={isSelected}
														onChange={() => toggleRow(emp.id)}
														className="rounded border-border accent-mint cursor-pointer"
													/>
												</td>
											)}
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
														onClick={() => setGenerateDialog({ open: true, employee: emp, bulk: false })}>
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
									);
								})}
							</tbody>
						</table>
					</div>

					<Pagination
						page={page}
						totalPages={totalPages}
						onPrev={() => setPage((p) => p - 1)}
						onNext={() => setPage((p) => p + 1)}
						onGoTo={setPage}
					/>
				</div>
			)}

			{/* Bulk action bar */}
			{selectMode && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-mint/30 bg-background shadow-[0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-sm">
					<span className="text-xs font-medium text-ink">
						{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select employees"}
					</span>
					<div className="w-px h-4 bg-border" />
					{bulkAction === "regenerate" && (
						<Button size="sm" className="h-7 text-xs gap-1.5"
							disabled={!someSelected}
							onClick={openBulkGenerate}>
							<FileText className="w-3 h-3" />
							Regenerate Reports
						</Button>
					)}
					{bulkAction === "remove" && (
						<Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5"
							disabled={!someSelected}>
							Remove Reports
						</Button>
					)}
					<button
						type="button"
						onClick={clearSelection}
						className="p-1 rounded text-ink-3 hover:text-ink hover:bg-accent/60 transition-colors"
						title="Cancel"
					>
						<X className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* Generate Report Dialog — single or bulk */}
			<DialogRoot open={generateDialog.open} onOpenChange={(open) => setGenerateDialog((prev) => ({ ...prev, open }))}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Generate Report{generateDialog.bulk ? "s" : ""}</DialogTitle>
						<DialogDescription>
							{generateDialog.bulk
								? `Generating for ${generateDialog.bulkEmployees?.length ?? 0} selected employee${(generateDialog.bulkEmployees?.length ?? 0) !== 1 ? "s" : ""}`
								: <>For: <span className="font-medium text-ink">{generateDialog.employee?.name ?? generateDialog.employee?.email}</span></>
							}
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						{/* Bulk employee list preview */}
						{generateDialog.bulk && generateDialog.bulkEmployees && (
							<div className="rounded-lg border divide-y max-h-36 overflow-y-auto">
								{generateDialog.bulkEmployees.map((emp) => (
									<div key={emp.id} className="flex items-center gap-2.5 px-3 py-2">
										<Avatar className="w-6 h-6 shrink-0">
											<AvatarImage src={emp.avatar_url ?? undefined} />
											<AvatarFallback className="text-[10px] bg-mint/15 text-ink-2">
												{formatInitials(emp.name, emp.email)}
											</AvatarFallback>
										</Avatar>
										<div className="min-w-0">
											<p className="text-xs font-medium text-ink truncate">{emp.name ?? emp.email}</p>
											{emp.name && <p className="text-[10px] text-ink-3 truncate">{emp.email}</p>}
										</div>
									</div>
								))}
							</div>
						)}

						{/* Period summary */}
						<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mint/8 border border-mint/20">
							<CalendarDays className="w-3.5 h-3.5 text-mint shrink-0" />
							<p className="text-xs text-ink">
								<span className="font-medium">{periodLabel(period)}</span>
								<span className="text-ink-3 ml-1">({resolvedFrom} → {resolvedTo})</span>
							</p>
						</div>

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
							<Button size="sm" disabled>
								{generateDialog.bulk ? `Generate ${generateDialog.bulkEmployees?.length ?? 0} Reports` : "Generate Report"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>
		</section>
	);
}
