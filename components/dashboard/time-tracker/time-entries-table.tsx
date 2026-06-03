"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, ExternalLink } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, formatTime, formatDurationBetween } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { TimeEntry, TimeEntryPage } from "./types";
import { SessionDetailModal } from "./session-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";

interface TimeEntriesTableProps {
	from?: string;
	to?: string;
}

const PAGE_SIZE = 10;

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

export function TimeEntriesTable({ from: fromProp, to: toProp }: TimeEntriesTableProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
	const tzOffset = new Date().getTimezoneOffset();

	const [detailEntry, setDetailEntry] = useState<TimeEntry | null>(null);

	const goToPage = (p: number) => router.push(`?page=${p}`);

	const from = fromProp ?? "";
	const to   = toProp   ?? "";

	const { data: result, isLoading, isError } = useQuery<TimeEntryPage>({
		queryKey: ["time-entries", page, from, to],
		queryFn: () => APIService.time.list(page, PAGE_SIZE, from || undefined, to || undefined, tzOffset),
		enabled: !!from && !!to,
	});

	const list       = result?.data       ?? [];
	const totalPages = result?.totalPages ?? 1;

	const handleEntryClick = (entry: TimeEntry) => {
		if (entry.ticket_id) {
			router.push(`/dashboard/tickets/${entry.ticket_id}`);
		} else {
			setDetailEntry(entry);
		}
	};

	return (
		<div className="space-y-4">
			{isLoading ? (
				<div className="divide-y rounded-lg border overflow-hidden">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex items-center gap-4 px-4 py-3">
							<Skeleton className="h-8 w-8 rounded-lg shrink-0" />
							<div className="flex-1 space-y-1.5 min-w-0">
								<Skeleton className="h-3.5 w-40" />
								<Skeleton className="h-3 w-28" />
							</div>
							<Skeleton className="h-3.5 w-16 shrink-0" />
						</div>
					))}
				</div>
			) : isError ? (
				<div className="flex items-center justify-center py-16">
					<p className="text-sm text-ink-3">Failed to load entries. Please try again.</p>
				</div>
			) : list.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
						<Clock className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No sessions</h3>
					<p className="text-sm text-ink-3 max-w-xs">No sessions found for this date range.</p>
				</div>
			) : (
				<div key={`${page}-${from}-${to}`} className="animate-fade-in space-y-4">
					<div className="rounded-lg border overflow-x-auto">
						<table className="w-full min-w-[640px] text-sm">
							<thead>
								<tr className="border-b bg-accent/30">
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Date</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Task</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Ticket</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Time In</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Time Out</th>
									<th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-3 uppercase tracking-wider">Duration</th>
								</tr>
							</thead>
							<tbody className="divide-y">
								{list.map((entry: TimeEntry) => (
									<tr
										key={entry.id}
										onClick={() => handleEntryClick(entry)}
										className="hover:bg-accent/20 transition-colors cursor-pointer"
									>
										<td className="px-4 py-2.5 text-xs text-ink-3 whitespace-nowrap">{formatDate(entry.start_time)}</td>
										<td className="px-4 py-2.5">
											<div className="flex items-center gap-1.5 group">
												<p className={cn(
													"text-xs font-medium truncate max-w-[200px]",
													entry.ticket_id ? "text-ink group-hover:text-mint transition-colors" : "text-ink",
												)}>
													{entry.title ?? <span className="text-ink-3 font-normal italic">No title</span>}
												</p>
												{entry.ticket_id && (
													<ExternalLink className="w-3 h-3 text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
												)}
											</div>
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
													<p className="text-[10px] text-ink-3/70 truncate max-w-[160px] mt-0.5">{entry.ticket.title}</p>
												</div>
											) : (
												<span className="text-xs text-ink-3">—</span>
											)}
										</td>
										<td className="px-4 py-2.5 text-xs text-ink-3 hidden sm:table-cell whitespace-nowrap">{formatTime(entry.start_time)}</td>
										<td className="px-4 py-2.5 text-xs text-ink-3 hidden sm:table-cell whitespace-nowrap">
											{entry.end_time ? formatTime(entry.end_time) : "—"}
										</td>
										<td className="px-4 py-2.5 text-xs font-semibold text-ink whitespace-nowrap">
											{entry.end_time ? formatDurationBetween(entry.start_time, entry.end_time) : <span className="text-mint animate-pulse">Live</span>}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<Pagination
						page={page}
						totalPages={totalPages}
						onPrev={() => goToPage(Math.max(1, page - 1))}
						onNext={() => goToPage(Math.min(totalPages, page + 1))}
						onGoTo={goToPage}
					/>
				</div>
			)}

			{detailEntry && (
				<SessionDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
			)}
		</div>
	);
}
