"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { TimeDateRange } from "@/components/dashboard/time-manager/time-date-range";
import { formatDurationMs, startOfMonthDateStr, todayDateStr } from "@/lib/utils/format";
import { TrendingUp, Download, FileText, Search, FileDown } from "lucide-react";
import { exportAllPdf, exportEmployeePdf } from "@/lib/utils/export-pdf";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

// ── CSV helpers ───────────────────────────────────────────────────────────────

function downloadCsv(content: string, filename: string) {
	const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement("a");
	a.href = url; a.download = filename; a.click();
	URL.revokeObjectURL(url);
}

function csvRow(cells: (string | number)[]) {
	return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
}

function exportAllCsv(data: PerformanceEntry[], from: string, to: string) {
	const header = csvRow(["Employee", "Email", "Completed", "In Progress", "Total Tasks", "Completion Rate", "Avg Days to Complete", "Time Logged"]);
	const rows = data.map((e) => csvRow([
		e.user.name ?? "",
		e.user.email,
		e.tasks_completed,
		e.tasks_in_progress,
		e.tasks_total,
		`${Math.round(e.completion_rate * 100)}%`,
		e.avg_days_to_complete > 0 ? `${e.avg_days_to_complete}d` : "",
		e.time_this_period_ms > 0 ? formatDurationMs(e.time_this_period_ms) : "",
	]));
	downloadCsv([header, ...rows].join("\n"), `report-all-${from}-to-${to}.csv`);
}

async function exportEmployeePdfReport(userId: string, from: string, to: string) {
	const result = await APIService.performance.employeeReport(userId, from, to);
	exportEmployeePdf(result as any, from, to);
}

async function exportEmployeeCsv(userId: string, from: string, to: string) {
	const result = await APIService.performance.employeeReport(userId, from, to);
	const { employee, tickets, timeEntries, totalMs, completed } = result as any;

	const lines: string[] = [];

	// Summary block
	lines.push(csvRow(["Report for", employee.name ?? employee.email, employee.email]));
	lines.push(csvRow(["Period", from, to]));
	lines.push(csvRow(["Tickets Completed", completed]));
	lines.push(csvRow(["Total Time Logged", totalMs > 0 ? formatDurationMs(totalMs) : "—"]));
	lines.push("");

	// Tickets
	lines.push(csvRow(["Tickets"]));
	lines.push(csvRow(["Title", "Type", "Status", "Priority", "Due Date", "Started", "Completed"]));
	for (const t of tickets) {
		lines.push(csvRow([
			t.title,
			t.ticket_type ?? "",
			t.status,
			t.priority ?? "",
			t.due_date ? new Date(t.due_date).toLocaleDateString() : "",
			t.started_at ? new Date(t.started_at).toLocaleDateString() : "",
			t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "",
		]));
	}
	lines.push("");

	// Time entries
	lines.push(csvRow(["Time Entries"]));
	lines.push(csvRow(["Date", "Start", "End", "Duration", "Linked Ticket", "Auto-closed"]));
	for (const e of timeEntries) {
		const start = new Date(e.start_time);
		const end   = e.end_time ? new Date(e.end_time) : null;
		const durationMs = end ? end.getTime() - start.getTime() : 0;
		const linkedTicket = tickets.find((t: any) => t.id === e.ticket_id);
		lines.push(csvRow([
			start.toLocaleDateString(),
			start.toLocaleTimeString(),
			end ? end.toLocaleTimeString() : "",
			durationMs > 0 ? formatDurationMs(durationMs) : "",
			linkedTicket?.title ?? e.title ?? "",
			e.auto_closed ? "Yes" : "No",
		]));
	}

	downloadCsv(lines.join("\n"), `report-${(employee.name ?? employee.email).replace(/\s+/g, "-")}-${from}-to-${to}.csv`);
}

// ── Generate Report Modal ─────────────────────────────────────────────────────

interface GenerateReportModalProps {
	open: boolean;
	onClose: () => void;
	employees: PerformanceEntry[];
	defaultFrom: string;
	defaultTo: string;
	allData: PerformanceEntry[];
}

function GenerateReportModal({ open, onClose, employees, defaultFrom, defaultTo, allData }: GenerateReportModalProps) {
	const [selectedUser, setSelectedUser] = useState("all");
	const [from, setFrom] = useState(defaultFrom);
	const [to, setTo] = useState(defaultTo);
	const [format, setFormat] = useState<"csv" | "pdf">("csv");
	const [isGenerating, setIsGenerating] = useState(false);

	const handleGenerate = async () => {
		setIsGenerating(true);
		try {
			if (format === "csv") {
				if (selectedUser === "all") exportAllCsv(allData, from, to);
				else await exportEmployeeCsv(selectedUser, from, to);
			} else {
				if (selectedUser === "all") exportAllPdf(allData, from, to);
				else await exportEmployeePdfReport(selectedUser, from, to);
			}
			onClose();
		} finally {
			setIsGenerating(false);
		}
	};

	return (
		<DialogRoot open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Generate Report</DialogTitle>
					<DialogDescription>Select an employee, date range, and format.</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 pt-1">
					<div className="space-y-1.5">
						<Label className="text-xs">Employee</Label>
						<Combobox
							options={[
								{ value: "all", label: "All employees" },
								...employees.map((e) => ({ value: e.user.id, label: e.user.name ?? e.user.email })),
							]}
							value={selectedUser}
							onChange={setSelectedUser}
							placeholder="Select employee…"
							searchPlaceholder="Search employee…"
							emptyText="No employees found."
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label className="text-xs">From</Label>
							<input
								type="date"
								value={from}
								onChange={(e) => setFrom(e.target.value)}
								className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
							/>
						</div>
						<div className="space-y-1.5">
							<Label className="text-xs">To</Label>
							<input
								type="date"
								value={to}
								onChange={(e) => setTo(e.target.value)}
								className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
							/>
						</div>
					</div>

					{/* Format toggle */}
					<div className="space-y-1.5">
						<Label className="text-xs">Format</Label>
						<div className="flex rounded-md border border-border overflow-hidden text-sm">
							<button
								type="button"
								onClick={() => setFormat("csv")}
								className={`flex-1 py-1.5 text-center text-xs font-medium transition-colors ${format === "csv" ? "bg-mint text-ink" : "bg-background text-ink-3 hover:bg-accent"}`}
							>
								CSV
							</button>
							<button
								type="button"
								onClick={() => setFormat("pdf")}
								className={`flex-1 py-1.5 text-center text-xs font-medium transition-colors ${format === "pdf" ? "bg-mint text-ink" : "bg-background text-ink-3 hover:bg-accent"}`}
							>
								PDF
							</button>
						</div>
					</div>

					<div className="flex justify-end gap-2 pt-1">
						<Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
						<Button
							size="sm"
							className="gap-1.5 bg-mint hover:bg-mint/90 text-ink"
							disabled={isGenerating}
							isLoading={isGenerating}
							onClick={handleGenerate}
						>
							<Download className="w-3.5 h-3.5" />
							Download {format.toUpperCase()}
						</Button>
					</div>
				</div>
			</DialogContent>
		</DialogRoot>
	);
}

// ── Main Table ────────────────────────────────────────────────────────────────

export function PerformanceTable() {
	const currentUserId = useAppSelector((s) => s.auth.user?.id);
	const [from,          setFrom]          = useState(startOfMonthDateStr());
	const [to,            setTo]            = useState(todayDateStr());
	const [searchInput,   setSearchInput]   = useState("");
	const [search,        setSearch]        = useState("");
	const [reportOpen,    setReportOpen]    = useState(false);
	const [rowGenerating, setRowGenerating] = useState<string | null>(null);
	const [rowPdfGenerating, setRowPdfGenerating] = useState<string | null>(null);

	const { data, isLoading, isError } = useQuery<PerformanceEntry[]>({
		queryKey: ["performance", from, to],
		queryFn: () => APIService.performance.list(from, to),
		staleTime: 120_000,
	});

	const submitSearch = () => setSearch(searchInput);

	const filtered = (data ?? []).filter((e) => {
		if (!search.trim()) return true;
		const q = search.toLowerCase();
		return (e.user.name ?? "").toLowerCase().includes(q) || e.user.email.toLowerCase().includes(q);
	});

	const handleRowExport = async (userId: string) => {
		setRowGenerating(userId);
		try { await exportEmployeeCsv(userId, from, to); }
		finally { setRowGenerating(null); }
	};

	const handleRowPdfExport = async (userId: string) => {
		setRowPdfGenerating(userId);
		try { await exportEmployeePdfReport(userId, from, to); }
		finally { setRowPdfGenerating(null); }
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<TimeDateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
				<div className="flex items-center gap-2 flex-wrap" suppressHydrationWarning>
					<input
						type="text"
						placeholder="Search employee…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submitSearch()}
						className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint w-44"
					/>
					<Button size="sm" className="h-8 w-8 p-0 bg-mint hover:bg-mint/90 text-ink" onClick={submitSearch} title="Search"><Search className="w-3.5 h-3.5" /></Button>
					<Button
						size="sm"
						className="gap-1.5 h-8 bg-mint hover:bg-mint/90 text-ink"
						onClick={() => setReportOpen(true)}
						disabled={!data || data.length === 0}
					>
						<FileText className="w-3.5 h-3.5" />
						Generate Report
					</Button>
				</div>
			</div>

			{isLoading && (
				<div className="flex items-center justify-center py-24">
					<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			)}
			{isError && (
				<div className="flex items-center justify-center py-24">
					<p className="text-sm text-ink-3">Failed to load performance data.</p>
				</div>
			)}
			{!isLoading && !isError && data?.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
						<TrendingUp className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No data for this period</h3>
					<p className="text-sm text-ink-3 max-w-xs">No employees have activity in the selected date range.</p>
				</div>
			)}

			{!isLoading && data && data.length > 0 && (
				<div className="rounded-lg border overflow-x-auto">
					<table className="w-full min-w-[700px] text-sm">
						<thead>
							<tr className="border-b bg-accent/30">
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Employee</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Completed</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">In Progress</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Total Tasks</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Completion Rate</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden lg:table-cell">Avg Days</th>
								<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Time Logged</th>
								<th className="w-20 px-4 py-2" />
							</tr>
						</thead>
						<tbody className="divide-y">
							{filtered.length === 0 ? (
								<tr>
									<td colSpan={8} className="px-4 py-8 text-center text-xs text-ink-3">No employees match your search.</td>
								</tr>
							) : filtered.map((entry) => {
								const pct  = Math.round(entry.completion_rate * 100);
								const name = entry.user.name ?? entry.user.email;
								const isMe = entry.user.id === currentUserId;

								return (
									<tr key={entry.user.id} className="hover:bg-accent/20 transition-colors group">
										<td className="px-4 py-2">
											<p className="text-xs font-medium text-ink">
												{name}
												{isMe && <span className="ml-1.5 text-[10px] font-normal text-ink-3">(You)</span>}
											</p>
											{entry.user.name && <p className="text-xs text-ink-3">{entry.user.email}</p>}
										</td>
										<td className="px-4 py-2 text-right font-medium text-mint">{entry.tasks_completed}</td>
										<td className="px-4 py-2 text-right text-mint/60">{entry.tasks_in_progress}</td>
										<td className="px-4 py-2 text-right text-ink-3">{entry.tasks_total}</td>
										<td className="px-4 py-2 text-right">
											<div className="flex items-center justify-end gap-2">
												<div className="w-16 h-1.5 rounded-full bg-accent overflow-hidden">
													<div className="h-full bg-mint rounded-full" style={{ width: `${pct}%` }} />
												</div>
												<span className="text-xs font-medium text-ink w-8 text-right">{pct}%</span>
											</div>
										</td>
										<td className="px-4 py-2 text-right text-ink-3 text-xs hidden lg:table-cell">
											{entry.avg_days_to_complete > 0 ? `${entry.avg_days_to_complete}d` : "—"}
										</td>
										<td className="px-4 py-2 text-right text-ink-3 text-xs">
											{entry.time_this_period_ms > 0 ? formatDurationMs(entry.time_this_period_ms) : "—"}
										</td>
										<td className="px-4 py-2 text-right">
											<div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
												<button
													type="button"
													title="Export CSV"
													disabled={rowGenerating === entry.user.id}
													onClick={() => handleRowExport(entry.user.id)}
													className="p-1 rounded hover:bg-accent text-ink-3 hover:text-ink disabled:opacity-40"
												>
													{rowGenerating === entry.user.id
														? <div className="w-3.5 h-3.5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
														: <Download className="w-3.5 h-3.5" />
													}
												</button>
												<button
													type="button"
													title="Export PDF"
													disabled={rowPdfGenerating === entry.user.id}
													onClick={() => handleRowPdfExport(entry.user.id)}
													className="p-1 rounded hover:bg-accent text-ink-3 hover:text-ink disabled:opacity-40"
												>
													{rowPdfGenerating === entry.user.id
														? <div className="w-3.5 h-3.5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
														: <FileDown className="w-3.5 h-3.5" />
													}
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

			<GenerateReportModal
				open={reportOpen}
				onClose={() => setReportOpen(false)}
				employees={data ?? []}
				defaultFrom={from}
				defaultTo={to}
				allData={data ?? []}
			/>
		</div>
	);
}
