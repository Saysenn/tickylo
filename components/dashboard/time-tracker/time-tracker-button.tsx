"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Square } from "lucide-react";
import APIService from "@/services/api";
import { Button } from "@/components/ui/button";
import { TimeOutDialog } from "./time-out-dialog";
import type { TimeEntry } from "./types";

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

export function TimeTrackerButton() {
	const queryClient = useQueryClient();
	const [elapsed, setElapsed] = useState("00:00:00");
	const [dialogOpen, setDialogOpen] = useState(false);

	// Fetch active session on mount + refetch on window focus
	const { data: activeEntry, isLoading } = useQuery<TimeEntry | null>({
		queryKey: ["time", "active"],
		queryFn: () => APIService.time.active(),
		refetchOnWindowFocus: true,
		staleTime: 0,
	});

	// Live counter — ticks every second, reconstructs from DB start_time (survives refresh)
	useEffect(() => {
		if (!activeEntry) {
			setElapsed("00:00:00");
			return;
		}
		const tick = () => {
			const ms = Date.now() - new Date(activeEntry.start_time).getTime();
			setElapsed(formatDuration(ms));
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [activeEntry]);

	const { mutateAsync: startTimer, isPending: isStarting } = useMutation({
		mutationFn: () => APIService.time.start(),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["time", "active"] }),
	});

	const { mutateAsync: stopTimer, isPending: isStopping } = useMutation({
		mutationFn: (data: { title?: string; description?: string }) =>
			APIService.time.stop(activeEntry!.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["time", "active"] });
			queryClient.invalidateQueries({ queryKey: ["time"] });
			setDialogOpen(false);
		},
	});

	// Don't render anything until we know the active state (avoids layout shift)
	if (isLoading) return null;

	if (activeEntry) {
		return (
			<>
				<div className="flex items-center gap-2">
					{/* Pulsing red dot */}
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-destructive" />
					</span>

					<span className="text-xs font-mono font-medium text-ink-2 tabular-nums">
						{elapsed}
					</span>

					<Button
						size="sm"
						variant="outline"
						className="h-7 px-2.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
						onClick={() => setDialogOpen(true)}
						isLoading={isStopping}
					>
						<Square className="w-3 h-3 fill-current" />
						Time Out
					</Button>
				</div>

				<TimeOutDialog
					open={dialogOpen}
					isPending={isStopping}
					onConfirm={(data) => stopTimer(data)}
					onCancel={() => setDialogOpen(false)}
				/>
			</>
		);
	}

	return (
		<Button
			size="sm"
			className="h-7 px-2.5 text-xs bg-mint hover:bg-mint-hover text-ink font-semibold gap-1.5 shadow-[0_2px_10px_rgba(128,237,153,0.3)]"
			onClick={() => startTimer()}
			isLoading={isStarting}
		>
			<Clock className="w-3 h-3" />
			Time In
		</Button>
	);
}
