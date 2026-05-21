"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { formatDateTime, formatDurationMs } from "@/lib/utils/format";
import { Flag, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimeEntry {
	id: string;
	user_id: string;
	ticket_id: string | null;
	title: string | null;
	start_time: string;
	end_time: string | null;
	auto_closed: boolean;
	flagged: boolean;
	user?: { name: string | null; email: string };
	ticket?: { title: string } | null;
}

export function FlaggedEntriesPanel() {
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery<{ data: TimeEntry[] }>({
		queryKey: ["time-flagged"],
		queryFn: () => APIService.time.list(1, 50, undefined, undefined, undefined, undefined, true),
		staleTime: 30_000,
	});

	const { mutate: unflag, isPending } = useMutation({
		mutationFn: (id: string) => APIService.time.unflag(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["time-flagged"] });
		},
	});

	const entries = data?.data ?? [];

	if (isLoading) return (
		<div className="flex items-center justify-center py-16">
			<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
		</div>
	);

	if (entries.length === 0) return (
		<div className="flex flex-col items-center justify-center py-16 text-center gap-2">
			<CheckCircle2 className="w-8 h-8 text-mint" />
			<p className="text-sm font-medium text-ink">No flagged entries</p>
			<p className="text-xs text-ink-3">All timer entries look clean.</p>
		</div>
	);

	return (
		<div className="space-y-3">
			<p className="text-xs text-ink-3">
				These entries were auto-closed and flagged — either they exceeded the daily cap, ran past the max hours limit, or were force-stopped by an admin. Review and unflag once confirmed.
			</p>
			<div className="space-y-2">
				{entries.map((entry) => {
					const durationMs = entry.end_time
						? new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()
						: null;

					return (
						<div
							key={entry.id}
							className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-3 flex items-start justify-between gap-4"
						>
							<div className="space-y-1 min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<Flag className="w-3 h-3 text-warning shrink-0" />
									<span className="text-xs font-semibold text-ink truncate">
										{entry.user?.name ?? entry.user?.email ?? entry.user_id}
									</span>
									{entry.auto_closed && (
										<span className="text-[10px] bg-warning/15 text-warning-fg px-1.5 py-0.5 rounded font-medium">
											auto-closed
										</span>
									)}
								</div>
								<p className="text-[11px] text-ink-3">
									{entry.ticket ? `Ticket: ${entry.ticket.title}` : entry.title ?? "General timer"}
								</p>
								<p className="text-[11px] text-ink-3">
									{formatDateTime(entry.start_time)} → {entry.end_time ? formatDateTime(entry.end_time) : "still running"}
									{durationMs != null && (
										<span className="ml-2 font-semibold text-ink">{formatDurationMs(durationMs)}</span>
									)}
								</p>
							</div>
							<Button
								size="sm"
								variant="outline"
								className="shrink-0 h-7 text-xs"
								disabled={isPending}
								onClick={() => unflag(entry.id)}
							>
								Unflag
							</Button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
