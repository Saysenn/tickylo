"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock, TicketCheck, Timer, AlertTriangle } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import APIService from "@/lib/infra/api";
import { formatDate, formatTime, formatDurationBetween, todayDateStr, daysAgoDateStr } from "@/lib/utils/format";
import type { TimeEntryPage } from "@/components/dashboard/time-tracker/types";

interface TimeEntry {
	id: string;
	start_time: string;
	end_time: string | null;
	title: string | null;
	ticket_id: string | null;
	auto_closed: boolean;
	flagged: boolean;
	user: { id: string; name: string | null; email: string };
	ticket?: { id: string; title: string; ticket_type: string } | null;
}

export function TimeLogsTable() {
	const router = useRouter();
	const tzOffset = new Date().getTimezoneOffset();
	const [page, setPage] = useState(1);
	const [from, setFrom] = useState(daysAgoDateStr(30));
	const [to, setTo] = useState(todayDateStr());
	const [flaggedOnly, setFlaggedOnly] = useState(false);
	const [applied, setApplied] = useState({ from: daysAgoDateStr(30), to: todayDateStr(), flaggedOnly: false });

	const { data, isLoading } = useQuery<TimeEntryPage>({
		queryKey: ["time-logs", applied.from, applied.to, applied.flaggedOnly, page],
		queryFn: () => APIService.time.list(page, 20, applied.from, applied.to, tzOffset, undefined, applied.flaggedOnly),
	});

	const entries = (data?.data ?? []) as unknown as TimeEntry[];
	const totalPages = data?.totalPages ?? 1;

	const apply = () => {
		setPage(1);
		setApplied({ from, to, flaggedOnly });
	};

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap items-end gap-3">
				<div className="space-y-1">
					<p className="text-xs text-ink-3">From</p>
					<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-sm w-36" />
				</div>
				<div className="space-y-1">
					<p className="text-xs text-ink-3">To</p>
					<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-sm w-36" />
				</div>
				<button
					type="button"
					onClick={() => setFlaggedOnly((v) => !v)}
					className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium border transition-colors ${
						flaggedOnly
							? "bg-orange-500/15 border-orange-500/30 text-orange-600"
							: "bg-background border-border text-ink-3 hover:bg-accent/50"
					}`}
				>
					<AlertTriangle className="w-3.5 h-3.5" />
					Flagged only
				</button>
				<Button size="sm" className="h-8 bg-mint hover:bg-mint/90 text-ink" onClick={apply}>
					Apply
				</Button>
			</div>

			{/* Table */}
			<div className="rounded-lg border bg-background">
				<div className="px-5 py-3.5 border-b flex items-center justify-between">
					<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Entries</p>
					{entries.length > 0 && (
						<span className="text-xs text-ink-3">{entries.length} shown</span>
					)}
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-10">
						<div className="w-4 h-4 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
					</div>
				) : entries.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10 text-center">
						<Clock className="w-7 h-7 text-ink-3/30 mb-2" strokeWidth={1.5} />
						<p className="text-sm text-ink-3">No entries in this period</p>
					</div>
				) : (
					<ul className="divide-y">
						{entries.map((entry) => {
							const isTicket = !!entry.ticket_id;
							return (
								<li
									key={entry.id}
									onClick={() => isTicket && router.push(`/dashboard/tickets/${entry.ticket_id}`)}
									className={`flex items-center gap-3 px-5 py-3 transition-colors group ${isTicket ? "hover:bg-accent/30 cursor-pointer" : ""}`}
								>
									<div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isTicket ? "bg-mint/15" : "bg-accent"}`}>
										{isTicket
											? <TicketCheck className="w-3.5 h-3.5 text-mint" />
											: <Timer className="w-3.5 h-3.5 text-ink-3" />
										}
									</div>

									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5">
											<p className="text-sm font-medium text-ink truncate">
												{entry.title ?? entry.ticket?.title ?? <span className="italic font-normal text-ink-3">General timer</span>}
											</p>
										</div>
										<div className="flex items-center gap-2 mt-0.5 flex-wrap">
											<span className="text-xs text-ink-3 font-medium">{entry.user.name ?? entry.user.email}</span>
											<span className="text-ink-3/40 text-xs">·</span>
											<span className="text-xs text-ink-3">{formatDate(entry.start_time)}</span>
											<span className="text-ink-3/40 text-xs">·</span>
											<span className="text-xs text-ink-3">{formatTime(entry.start_time)} → {entry.end_time ? formatTime(entry.end_time) : "ongoing"}</span>
										</div>
									</div>

									<div className="flex flex-col items-end gap-1 shrink-0">
										<span className="text-xs font-semibold text-ink">
											{entry.end_time ? formatDurationBetween(entry.start_time, entry.end_time) : "—"}
										</span>
										<div className="flex gap-1">
											{entry.auto_closed && (
												<span className="text-[10px] font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
													Auto-closed
												</span>
											)}
											{entry.flagged && (
												<span className="text-[10px] font-medium text-red-600 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
													Flagged
												</span>
											)}
										</div>
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
			</div>
		</div>
	);
}
