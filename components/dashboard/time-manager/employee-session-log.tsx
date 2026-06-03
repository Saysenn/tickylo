"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, TicketCheck, Timer, ExternalLink } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import APIService from "@/lib/infra/api";
import { formatDate, formatTime, formatDurationBetween } from "@/lib/utils/format";
import { SessionDetailModal } from "@/components/dashboard/time-tracker/session-detail-modal";
import type { TimeEntry, TimeEntryPage } from "@/components/dashboard/time-tracker/types";
import { Skeleton } from "@/components/ui/skeleton";

const TICKET_TYPE_LABEL: Record<string, string> = {
	incident:      "Incident",
	change:        "RFC",
	request:       "Request",
	internal_task: "Internal",
};

const TICKET_TYPE_STYLES: Record<string, string> = {
	incident:      "bg-red-500/10 text-red-600 border-red-500/20",
	change:        "bg-orange-500/10 text-orange-600 border-orange-500/20",
	request:       "bg-blue-500/10 text-blue-600 border-blue-500/20",
	internal_task: "bg-accent text-ink-3 border-border/40",
};

interface Props {
	userId: string;
	from: string;
	to: string;
}

export function EmployeeSessionLog({ userId, from, to }: Props) {
	const router = useRouter();
	const tzOffset = new Date().getTimezoneOffset();
	const [detailEntry, setDetailEntry] = useState<TimeEntry | null>(null);
	const [page, setPage] = useState(1);

	const { data, isLoading } = useQuery<TimeEntryPage>({
		queryKey: ["employee-sessions", userId, from, to, page],
		queryFn: () => APIService.time.list(page, 20, from, to, tzOffset, userId),
		enabled: !!userId && !!from && !!to,
	});

	const entries = data?.data ?? [];
	const totalPages = data?.totalPages ?? 1;

	const handleClick = (entry: TimeEntry) => {
		if (entry.ticket_id) {
			router.push(`/dashboard/tickets/${entry.ticket_id}`);
		} else {
			setDetailEntry(entry);
		}
	};

	return (
		<div className="rounded-lg border bg-background">
			<div className="px-5 py-3.5 border-b flex items-center justify-between">
				<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Session Log</p>
				{entries.length > 0 && (
					<span className="text-xs text-ink-3">{entries.length} session{entries.length !== 1 ? "s" : ""}</span>
				)}
			</div>

			{isLoading ? (
				<ul className="divide-y">
					{Array.from({ length: 4 }).map((_, i) => (
						<li key={i} className="flex items-center gap-3 px-5 py-3">
							<Skeleton className="h-7 w-7 rounded-lg shrink-0" />
							<div className="flex-1 space-y-1.5 min-w-0">
								<Skeleton className="h-3.5 w-36" />
								<Skeleton className="h-3 w-24" />
							</div>
							<Skeleton className="h-3.5 w-14 shrink-0" />
						</li>
					))}
				</ul>
			) : entries.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-10 text-center">
					<Clock className="w-7 h-7 text-ink-3/30 mb-2" strokeWidth={1.5} />
					<p className="text-sm text-ink-3">No sessions in this period</p>
				</div>
			) : (
				<ul className="divide-y">
					{entries.map((entry) => {
						const isTicket = !!entry.ticket_id;
						return (
							<li
								key={entry.id}
								onClick={() => handleClick(entry)}
								className="flex items-center gap-3 px-5 py-3 hover:bg-accent/30 cursor-pointer transition-colors group"
							>
								{/* Icon */}
								<div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isTicket ? "bg-mint/15" : "bg-accent"}`}>
									{isTicket
										? <TicketCheck className="w-3.5 h-3.5 text-mint" />
										: <Timer className="w-3.5 h-3.5 text-ink-3" />
									}
								</div>

								{/* Main info */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5">
										<p className="text-sm font-medium text-ink truncate group-hover:text-mint transition-colors">
											{entry.title ?? <span className="italic font-normal text-ink-3">General timer</span>}
										</p>
										{isTicket && <ExternalLink className="w-3 h-3 text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
									</div>
									<div className="flex items-center gap-2 mt-0.5">
										<span className="text-xs text-ink-3">{formatDate(entry.start_time)}</span>
										<span className="text-ink-3/40 text-xs">·</span>
										<span className="text-xs text-ink-3">{formatTime(entry.start_time)} → {entry.end_time ? formatTime(entry.end_time) : "ongoing"}</span>
										{entry.ticket && (
											<>
												<span className="text-ink-3/40 text-xs">·</span>
												<span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${TICKET_TYPE_STYLES[entry.ticket.ticket_type] ?? "bg-accent text-ink-3 border-border/40"}`}>
													{TICKET_TYPE_LABEL[entry.ticket.ticket_type] ?? entry.ticket.ticket_type}
												</span>
											</>
										)}
									</div>
								</div>

								{/* Duration + auto-close badge */}
								<div className="flex flex-col items-end gap-0.5 shrink-0">
									<span className="text-xs font-semibold text-ink">
										{entry.end_time
											? formatDurationBetween(entry.start_time, entry.end_time)
											: <span className="text-mint animate-pulse text-xs">Live</span>
										}
									</span>
									{entry.auto_closed && (
										<span className="text-[10px] font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
											Auto-closed
										</span>
									)}
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<Pagination
				page={page}
				totalPages={totalPages}
				onPrev={() => setPage((p) => p - 1)}
				onNext={() => setPage((p) => p + 1)}
				onGoTo={setPage}
			/>

			{detailEntry && (
				<SessionDetailModal entry={detailEntry} onClose={() => setDetailEntry(null)} />
			)}
		</div>
	);
}
