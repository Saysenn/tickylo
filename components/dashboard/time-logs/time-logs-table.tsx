"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, TicketCheck, Timer, AlertTriangle, Square, Radio } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import APIService from "@/lib/infra/api";
import { formatDate, formatTime, formatDurationBetween, formatDuration, todayDateStr, daysAgoDateStr } from "@/lib/utils/format";
import type { TimeEntryPage } from "@/components/dashboard/time-tracker/types";
import { Skeleton } from "@/components/ui/skeleton";

interface ActiveEntry {
	id: string;
	start_time: string;
	end_time: null;
	title: string | null;
	ticket_id: string | null;
	user: { id: string; name: string | null; email: string };
	ticket?: { id: string; title: string; ticket_type: string } | null;
}

interface ClosedEntry {
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

function LiveTimer({ startTime }: { startTime: string }) {
	const [elapsed, setElapsed] = useState("");
	useEffect(() => {
		const tick = () => setElapsed(formatDuration(Date.now() - new Date(startTime).getTime()));
		tick();
		const iv = setInterval(tick, 1000);
		return () => clearInterval(iv);
	}, [startTime]);
	return <span className="font-mono font-bold text-mint tabular-nums">{elapsed}</span>;
}

export function TimeLogsTable() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const tzOffset = new Date().getTimezoneOffset();
	const [page, setPage] = useState(1);
	const [from, setFrom] = useState(daysAgoDateStr(30));
	const [to, setTo] = useState(todayDateStr());
	const [flaggedOnly, setFlaggedOnly] = useState(false);
	const [applied, setApplied] = useState({ from: daysAgoDateStr(30), to: todayDateStr(), flaggedOnly: false });

	const [activePage, setActivePage] = useState(1);
	const ACTIVE_PAGE_SIZE = 3;

	const { data: activeEntries = [], isLoading: isLoadingActive } = useQuery<ActiveEntry[]>({
		queryKey: ["time-active-all"],
		queryFn: () => APIService.time.activeAll(),
		refetchInterval: 30_000,
	});

	const { data, isLoading } = useQuery<TimeEntryPage>({
		queryKey: ["time-logs", applied.from, applied.to, applied.flaggedOnly, page],
		queryFn: () => APIService.time.list(page, 20, applied.from, applied.to, tzOffset, undefined, applied.flaggedOnly),
	});

	const { mutate: forceStop, variables: stoppingId } = useMutation({
		mutationFn: (id: string) => APIService.time.forceStop(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["time-active-all"] });
			queryClient.invalidateQueries({ queryKey: ["time-logs"] });
		},
	});

	const entries = (data?.data ?? []) as unknown as ClosedEntry[];
	const totalPages = data?.totalPages ?? 1;

	const apply = () => {
		setPage(1);
		setApplied({ from, to, flaggedOnly });
	};

	return (
		<div className="space-y-4">

			{/* Live Now */}
			<div className="rounded-lg border bg-background">
				<div className="px-5 py-3.5 border-b flex items-center gap-2">
					<Radio className="w-3.5 h-3.5 text-mint" />
					<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Live Now</p>
					{activeEntries.length > 0 && (
						<span className="ml-auto text-xs font-semibold text-mint bg-mint/10 px-2 py-0.5 rounded-full">
							{activeEntries.length} active
						</span>
					)}
				</div>

				{isLoadingActive ? (
					<ul className="divide-y">
						{Array.from({ length: 3 }).map((_, i) => (
							<li key={i} className="flex items-center gap-3 px-5 py-2.5">
								<Skeleton className="h-6 w-6 rounded-lg shrink-0" />
								<div className="flex-1 space-y-1 min-w-0">
									<Skeleton className="h-3.5 w-32" />
									<Skeleton className="h-3 w-48" />
								</div>
								<Skeleton className="h-4 w-12 shrink-0" />
							</li>
						))}
					</ul>
				) : activeEntries.length === 0 ? (
					<div className="flex items-center justify-center py-6 gap-2 text-ink-3">
						<Clock className="w-4 h-4 opacity-30" strokeWidth={1.5} />
						<p className="text-sm">No active timers right now</p>
					</div>
				) : (
					<>
						<ul className="divide-y">
							{activeEntries.slice((activePage - 1) * ACTIVE_PAGE_SIZE, activePage * ACTIVE_PAGE_SIZE).map((entry) => (
								<li key={entry.id} className="flex items-center gap-3 px-5 py-2.5">
									<div className="relative w-6 h-6 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
										<Timer className="w-3 h-3 text-mint" />
										<span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-mint animate-ping" />
										<span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-mint" />
									</div>

									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium text-ink truncate">
											{entry.user.name ?? entry.user.email}
										</p>
										<p className="text-[11px] text-ink-3 truncate">
											{entry.ticket?.title ?? entry.title ?? "General timer"}
											{" · "}started {formatTime(entry.start_time)}
										</p>
									</div>

									<LiveTimer startTime={entry.start_time} />

									<Button
										size="sm"
										variant="ghost"
										className="h-6 gap-1 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
										disabled={stoppingId === entry.id}
										isLoading={stoppingId === entry.id}
										onClick={() => forceStop(entry.id)}
									>
										<Square className="w-2.5 h-2.5 fill-current" />
										Stop
									</Button>
								</li>
							))}
						</ul>
						<Pagination
							page={activePage}
							totalPages={Math.ceil(activeEntries.length / ACTIVE_PAGE_SIZE) || 1}
							onPrev={() => setActivePage((p) => p - 1)}
							onNext={() => setActivePage((p) => p + 1)}
							onGoTo={setActivePage}
						/>
					</>
				)}
			</div>

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

			{/* Closed entries table */}
			<div className="rounded-lg border bg-background">
				<div className="px-5 py-3.5 border-b flex items-center justify-between">
					<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Entries</p>
					{entries.length > 0 && (
						<span className="text-xs text-ink-3">{entries.length} shown</span>
					)}
				</div>

				{isLoading ? (
					<ul className="divide-y">
						{Array.from({ length: 6 }).map((_, i) => (
							<li key={i} className="flex items-center gap-3 px-5 py-3">
								<Skeleton className="h-8 w-8 rounded-lg shrink-0" />
								<div className="flex-1 space-y-1.5 min-w-0">
									<Skeleton className="h-3.5 w-40" />
									<Skeleton className="h-3 w-56" />
								</div>
								<Skeleton className="h-3.5 w-16 shrink-0" />
							</li>
						))}
					</ul>
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
									className={`flex items-center gap-3 px-5 py-2.5 transition-colors group ${isTicket ? "hover:bg-accent/30 cursor-pointer" : ""}`}
								>
									<div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isTicket ? "bg-mint/15" : "bg-accent"}`}>
										{isTicket
											? <TicketCheck className="w-3 h-3 text-mint" />
											: <Timer className="w-3 h-3 text-ink-3" />
										}
									</div>

									<div className="flex-1 min-w-0">
										<p className="text-xs font-medium text-ink truncate">
											{entry.title ?? entry.ticket?.title ?? <span className="italic font-normal text-ink-3">General timer</span>}
										</p>
										<div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
											<span className="text-[11px] text-ink-3 font-medium">{entry.user.name ?? entry.user.email}</span>
											<span className="text-ink-3/40 text-[11px]">·</span>
											<span className="text-[11px] text-ink-3">{formatDate(entry.start_time)}</span>
											<span className="text-ink-3/40 text-[11px]">·</span>
											<span className="text-[11px] text-ink-3">{formatTime(entry.start_time)} → {entry.end_time ? formatTime(entry.end_time) : "ongoing"}</span>
										</div>
									</div>

									<div className="flex flex-col items-end gap-0.5 shrink-0">
										<span className="text-[11px] font-semibold text-ink">
											{entry.end_time ? formatDurationBetween(entry.start_time, entry.end_time) : "—"}
										</span>
										<div className="flex gap-1">
											{entry.auto_closed && (
												<span className="text-[10px] font-medium text-orange-500 bg-orange-500/10 border border-orange-500/20 px-1.5 py-0.5 rounded">
													Auto-closed
												</span>
											)}
											{entry.flagged && (
												<span className="text-[10px] font-medium text-destructive bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded">
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
