"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
	Merge, Trash2, Pencil, Check, X, Clock,
	Download, Clock3, ExternalLink, ChevronLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TimeDateRange } from "@/components/dashboard/time-manager/time-date-range";
import {
	formatDate, formatTime, formatDurationBetween, formatDurationMs,
	todayDateStr, daysAgoDateStr,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { TimeEntry, TimeEntryPage } from "@/components/dashboard/time-tracker/types";
import { SessionDetailModal } from "@/components/dashboard/time-tracker/session-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 15;

const TICKET_TYPE_STYLES: Record<string, string> = {
	incident:      "bg-red-500/10 text-red-600 border-red-500/20",
	change:        "bg-orange-500/10 text-orange-600 border-orange-500/20",
	request:       "bg-blue-500/10 text-blue-600 border-blue-500/20",
	internal_task: "bg-accent text-ink-3 border-border/40",
};

const TICKET_TYPE_LABEL: Record<string, string> = {
	incident:      "Incident",
	change:        "RFC",
	request:       "Request",
	internal_task: "Internal",
};

// ─── Merge dialog ──────────────────────────────────────────────────────────────
function MergeTitleDialog({ count, defaultTitle, onConfirm, onCancel, isPending }: {
	count: number; defaultTitle: string;
	onConfirm: (title: string) => void; onCancel: () => void; isPending: boolean;
}) {
	const [title, setTitle] = useState(defaultTitle);
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
				<div>
					<p className="text-sm font-semibold text-ink">Merge {count} sessions</p>
					<p className="text-xs text-ink-3 mt-1">Their durations will be combined into a single entry.</p>
				</div>
				<div className="space-y-1.5">
					<label className="text-xs font-medium text-ink-3">Title for merged entry</label>
					<input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus
						className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint" />
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
					<Button size="sm" disabled={isPending} isLoading={isPending} onClick={() => onConfirm(title.trim() || defaultTitle)}>Merge</Button>
				</div>
			</div>
		</div>
	);
}

// ─── Edit times dialog ─────────────────────────────────────────────────────────
function toLocalDatetimeInput(iso: string): string {
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditTimesDialog({ entry, onConfirm, onCancel, isPending }: {
	entry: TimeEntry; onConfirm: (s: string, e: string) => void; onCancel: () => void; isPending: boolean;
}) {
	const [start, setStart] = useState(toLocalDatetimeInput(entry.start_time));
	const [end,   setEnd]   = useState(toLocalDatetimeInput(entry.end_time!));
	const [err,   setErr]   = useState<string | null>(null);

	const submit = () => {
		const s = new Date(start), e = new Date(end);
		if (isNaN(s.getTime()) || isNaN(e.getTime())) { setErr("Invalid date/time"); return; }
		if (e <= s) { setErr("End time must be after start time"); return; }
		onConfirm(new Date(start).toISOString(), new Date(end).toISOString());
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
			<div className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4">
				<div>
					<p className="text-sm font-semibold text-ink">Edit session times</p>
					<p className="text-xs text-ink-3 mt-1 truncate">{entry.title ?? "Untitled session"}</p>
				</div>
				<div className="space-y-3">
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-ink-3">Start time</label>
						<input type="datetime-local" value={start} onChange={(e) => { setStart(e.target.value); setErr(null); }}
							className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint" />
					</div>
					<div className="space-y-1.5">
						<label className="text-xs font-medium text-ink-3">End time</label>
						<input type="datetime-local" value={end} onChange={(e) => { setEnd(e.target.value); setErr(null); }}
							className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint" />
					</div>
					{err && <p className="text-xs text-destructive">{err}</p>}
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
					<Button size="sm" disabled={isPending} isLoading={isPending} onClick={submit}>Save</Button>
				</div>
			</div>
		</div>
	);
}

// ─── CSV export ────────────────────────────────────────────────────────────────
function exportToCsv(entries: TimeEntry[], from: string, to: string) {
	const header = ["Date", "Title", "Ticket", "Time In", "Time Out", "Duration"];
	const rows = entries.map((e) => [
		formatDate(e.start_time), e.title ?? "", e.ticket?.title ?? "",
		formatTime(e.start_time),
		e.end_time ? formatTime(e.end_time) : "",
		e.end_time ? formatDurationBetween(e.start_time, e.end_time) : "",
	]);
	const csv = [header, ...rows]
		.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
		.join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url  = URL.createObjectURL(blob);
	const a    = document.createElement("a");
	a.href = url; a.download = `my-time-${from}-to-${to}.csv`; a.click();
	URL.revokeObjectURL(url);
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ManageTimePage() {
	const queryClient = useQueryClient();
	const router      = useRouter();
	const tzOffset    = new Date().getTimezoneOffset();

	const [from, setFrom] = useState(daysAgoDateStr(29));
	const [to,   setTo]   = useState(todayDateStr());
	const [page, setPage] = useState(1);

	const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
	const [editingId,      setEditingId]      = useState<string | null>(null);
	const [editTitle,      setEditTitle]      = useState("");
	const [editTimesEntry, setEditTimesEntry] = useState<TimeEntry | null>(null);
	const [detailEntry,    setDetailEntry]    = useState<TimeEntry | null>(null);
	const [mergeOpen,      setMergeOpen]      = useState(false);
	const [error,          setError]          = useState<string | null>(null);
	const editInputRef = useRef<HTMLInputElement>(null);

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["time-manage"] });
		setSelectedIds(new Set());
	};

	const { data: result, isLoading } = useQuery<TimeEntryPage>({
		queryKey: ["time-manage", page, from, to],
		queryFn: () => APIService.time.list(page, PAGE_SIZE, from, to, tzOffset),
	});

	const { mutateAsync: updateEntry,  isPending: isUpdating }     = useMutation({
		mutationFn: ({ id, title }: { id: string; title: string }) => APIService.time.update(id, { title }),
		onSuccess: () => { invalidate(); setEditingId(null); },
		onError: (err) => setError(isAxiosError(err) ? (err.response?.data?.error ?? "Failed to update") : "Error"),
	});
	const { mutateAsync: updateTimes,  isPending: isUpdatingTimes } = useMutation({
		mutationFn: ({ id, start_time, end_time }: { id: string; start_time: string; end_time: string }) =>
			APIService.time.update(id, { start_time, end_time }),
		onSuccess: () => { invalidate(); setEditTimesEntry(null); },
		onError: (err) => setError(isAxiosError(err) ? (err.response?.data?.error ?? "Failed to update times") : "Error"),
	});
	const { mutateAsync: deleteEntry,  isPending: isDeleting }      = useMutation({
		mutationFn: (id: string) => APIService.time.remove(id),
		onSuccess: invalidate,
		onError: (err) => setError(isAxiosError(err) ? (err.response?.data?.error ?? "Failed to delete") : "Error"),
	});
	const { mutateAsync: bulkDelete,   isPending: isBulkDeleting }  = useMutation({
		mutationFn: (ids: string[]) => APIService.time.bulkDelete(ids),
		onSuccess: invalidate,
		onError: (err) => setError(isAxiosError(err) ? (err.response?.data?.error ?? "Failed to delete") : "Error"),
	});
	const { mutateAsync: mergeEntries, isPending: isMerging }       = useMutation({
		mutationFn: ({ ids, title }: { ids: string[]; title: string }) => APIService.time.merge(ids, title),
		onSuccess: () => { invalidate(); setMergeOpen(false); },
		onError: (err) => setError(isAxiosError(err) ? (err.response?.data?.error ?? "Failed to merge") : "Error"),
	});

	const list       = result?.data       ?? [];
	const totalPages = result?.totalPages ?? 1;
	const totalMs    = list.filter((e) => e.end_time)
		.reduce((sum, e) => sum + (new Date(e.end_time!).getTime() - new Date(e.start_time).getTime()), 0);

	const defaultMergeTitle = list.find((e) => selectedIds.has(e.id))?.title ?? "Merged session";

	const toggleRow = (id: string) => setSelectedIds((prev) => {
		const next = new Set(prev);
		next.has(id) ? next.delete(id) : next.add(id);
		return next;
	});
	const toggleAll = () => {
		const ids = list.filter((e) => e.end_time).map((e) => e.id);
		setSelectedIds((prev) => prev.size === ids.length ? new Set() : new Set(ids));
	};
	const startEdit = (entry: TimeEntry) => {
		setEditingId(entry.id);
		setEditTitle(entry.title ?? "");
		setTimeout(() => editInputRef.current?.focus(), 0);
	};
	const saveEdit = async (id: string) => {
		if (!editTitle.trim()) { setEditingId(null); return; }
		await updateEntry({ id, title: editTitle.trim() });
	};

	return (
		<div className="space-y-6">
			<button
				type="button"
				onClick={() => router.push("/dashboard/time-tracker")}
				className="flex items-center gap-1 text-xs text-ink-3 hover:text-ink transition-colors"
			>
				<ChevronLeft className="w-3.5 h-3.5" />
				Back to Time Tracker
			</button>

			<div>
				<h1 className="text-2xl font-bold text-ink">Manage My Time</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Edit sessions, fix times, delete entries, and merge duplicate sessions.
				</p>
			</div>

			{/* Toolbar */}
			<div className="flex flex-wrap items-end gap-3 justify-between">
				<TimeDateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); setPage(1); }} />
				<div className="flex items-center gap-2">
					{list.length > 0 && (
						<Button variant="outline" size="sm" className="gap-1.5 h-8"
							onClick={() => exportToCsv(list.filter((e) => e.end_time), from, to)}>
							<Download className="w-3.5 h-3.5" />Export CSV
						</Button>
					)}
					{selectedIds.size >= 2 && (
						<Button size="sm" className="gap-1.5 bg-mint hover:bg-mint-hover text-ink font-semibold"
							onClick={() => setMergeOpen(true)}>
							<Merge className="w-3.5 h-3.5" />Merge {selectedIds.size}
						</Button>
					)}
					{selectedIds.size >= 1 && (
						<Button size="sm" variant="outline"
							className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
							disabled={isBulkDeleting} isLoading={isBulkDeleting}
							onClick={() => bulkDelete([...selectedIds])}>
							<Trash2 className="w-3.5 h-3.5" />Delete {selectedIds.size}
						</Button>
					)}
				</div>
			</div>

			{error && (
				<p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-3 py-2">
					{error}
					<button type="button" className="ml-2 underline" onClick={() => setError(null)}>Dismiss</button>
				</p>
			)}

			{isLoading ? (
				<div className="rounded-lg border overflow-hidden divide-y">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4 px-4 py-3.5">
							<div className="flex items-center gap-2 flex-1 min-w-0">
								<Skeleton className="h-8 w-8 rounded-full shrink-0" />
								<div className="space-y-1.5 min-w-0">
									<Skeleton className="h-3.5 w-32" />
									<Skeleton className="h-3 w-24" />
								</div>
							</div>
							<Skeleton className="h-3.5 w-28 shrink-0" />
							<Skeleton className="h-3.5 w-16 shrink-0" />
							<Skeleton className="h-7 w-16 rounded-lg shrink-0" />
						</div>
					))}
				</div>
			) : list.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
						<Clock className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No entries</h3>
					<p className="text-sm text-ink-3 max-w-xs">No completed sessions found for this date range.</p>
				</div>
			) : (
				<div className="space-y-4">
					<div className="rounded-lg border overflow-x-auto">
						<table className="w-full min-w-[640px] text-sm">
							<thead>
								<tr className="border-b bg-accent/30">
									<th className="w-8 px-3 py-2.5">
										<input type="checkbox"
											checked={selectedIds.size === list.filter((e) => e.end_time).length && list.filter((e) => e.end_time).length > 0}
											onChange={toggleAll}
											className="rounded border-border accent-mint cursor-pointer" />
									</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Date</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Title</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Ticket</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Time In</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Time Out</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Duration</th>
									<th className="w-20 px-3 py-2.5" />
								</tr>
							</thead>
							<tbody className="divide-y">
								{list.map((entry: TimeEntry) => {
									const isEditing  = editingId === entry.id;
									const isSelected = selectedIds.has(entry.id);
									return (
										<tr key={entry.id}
											onClick={() => {
												if (isEditing) return;
												if (entry.ticket_id) router.push(`/dashboard/tickets/${entry.ticket_id}`);
												else setDetailEntry(entry);
											}}
											className={cn(
												"transition-colors cursor-pointer",
												isSelected ? "bg-mint/5" : "hover:bg-accent/20",
												!entry.end_time && "opacity-60",
											)}
										>
											<td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
												{entry.end_time && (
													<input type="checkbox" checked={isSelected} onChange={() => toggleRow(entry.id)}
														className="rounded border-border accent-mint cursor-pointer" />
												)}
											</td>
											<td className="px-4 py-2.5 text-xs text-ink-3 whitespace-nowrap">{formatDate(entry.start_time)}</td>
											<td className="px-4 py-2.5 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
												{isEditing ? (
													<div className="flex items-center gap-1.5">
														<input ref={editInputRef} type="text" value={editTitle}
															onChange={(e) => setEditTitle(e.target.value)}
															onKeyDown={(e) => {
																if (e.key === "Enter") saveEdit(entry.id);
																if (e.key === "Escape") setEditingId(null);
															}}
															maxLength={200}
															className="flex-1 h-7 rounded border border-mint/50 bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-mint" />
														<button type="button" onClick={() => saveEdit(entry.id)} disabled={isUpdating}
															className="p-1 rounded text-success-fg hover:bg-success/10">
															<Check className="w-3.5 h-3.5" />
														</button>
														<button type="button" onClick={() => setEditingId(null)}
															className="p-1 rounded text-ink-3 hover:bg-accent">
															<X className="w-3.5 h-3.5" />
														</button>
													</div>
												) : (
													<div className="flex items-center gap-1.5 group">
														<span className="text-xs font-medium text-ink truncate max-w-[220px]">
															{entry.title ?? <span className="text-ink-3 italic font-normal">No title</span>}
														</span>
														{entry.ticket_id && (
															<ExternalLink className="w-3 h-3 text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
														)}
														{entry.end_time && (
															<button type="button" onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
																className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-ink-3 hover:text-ink transition-opacity">
																<Pencil className="w-3 h-3" />
															</button>
														)}
													</div>
												)}
												{entry.ticket && (
													<p className="text-[10px] text-ink-3/60 truncate max-w-[220px] mt-0.5">{entry.ticket.title}</p>
												)}
											</td>
											<td className="px-4 py-2.5 hidden md:table-cell">
												{entry.ticket ? (
													<div>
														<span className={cn(
															"inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
															TICKET_TYPE_STYLES[entry.ticket.ticket_type] ?? "bg-accent text-ink-3 border-border/40",
														)}>
															{TICKET_TYPE_LABEL[entry.ticket.ticket_type] ?? entry.ticket.ticket_type}
														</span>
														<p className="text-[10px] text-ink-3/60 truncate max-w-[140px] mt-0.5">{entry.ticket.title}</p>
													</div>
												) : (
													<span className="text-xs text-ink-3">—</span>
												)}
											</td>
											<td className="px-4 py-2.5 text-xs text-ink-3 hidden sm:table-cell whitespace-nowrap">{formatTime(entry.start_time)}</td>
											<td className="px-4 py-2.5 text-xs text-ink-3 hidden sm:table-cell whitespace-nowrap">
												{entry.end_time ? formatTime(entry.end_time) : <span className="text-mint text-[10px] animate-pulse">Active</span>}
											</td>
											<td className="px-4 py-2.5 text-xs font-semibold text-ink whitespace-nowrap">
												{entry.end_time ? formatDurationBetween(entry.start_time, entry.end_time) : "—"}
											</td>
											<td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
												{entry.end_time && (
													<div className="flex items-center gap-0.5">
														<button type="button" onClick={() => setEditTimesEntry(entry)}
															className="p-1.5 rounded text-ink-3 hover:text-ink hover:bg-accent/60 transition-colors" title="Edit times">
															<Clock3 className="w-3.5 h-3.5" />
														</button>
														<button type="button" onClick={() => deleteEntry(entry.id)} disabled={isDeleting}
															className="p-1.5 rounded text-ink-3 hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete entry">
															<Trash2 className="w-3.5 h-3.5" />
														</button>
													</div>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
							{totalMs > 0 && (
								<tfoot>
									<tr className="border-t bg-accent/20">
										<td colSpan={6} className="px-4 py-2 text-xs text-ink-3 text-right font-medium">
											Total ({list.filter((e) => e.end_time).length} sessions)
										</td>
										<td className="px-4 py-2 text-xs font-bold text-ink whitespace-nowrap">{formatDurationMs(totalMs)}</td>
										<td />
									</tr>
								</tfoot>
							)}
						</table>
					</div>

					{selectedIds.size > 0 && (
						<p className="text-xs text-ink-3 text-center">
							{selectedIds.size} session{selectedIds.size > 1 ? "s" : ""} selected
							{selectedIds.size >= 2 ? " — merge or delete them above" : " — select one more to enable merge"}
						</p>
					)}

					<Pagination page={page} totalPages={totalPages}
						onPrev={() => setPage((p) => Math.max(1, p - 1))}
						onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
						onGoTo={setPage} />
				</div>
			)}

			{mergeOpen && (
				<MergeTitleDialog count={selectedIds.size} defaultTitle={defaultMergeTitle} isPending={isMerging}
					onCancel={() => setMergeOpen(false)}
					onConfirm={(title) => mergeEntries({ ids: [...selectedIds], title })} />
			)}
			{editTimesEntry && (
				<EditTimesDialog entry={editTimesEntry} isPending={isUpdatingTimes}
					onCancel={() => setEditTimesEntry(null)}
					onConfirm={(s, e) => updateTimes({ id: editTimesEntry.id, start_time: s, end_time: e })} />
			)}
			{detailEntry && (
				<SessionDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
			)}
		</div>
	);
}
