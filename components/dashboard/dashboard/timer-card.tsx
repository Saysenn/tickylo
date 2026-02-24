"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { formatDuration } from "@/lib/utils/format";
import { Clock, Square } from "lucide-react";
import type { TimeEntry } from "@/components/dashboard/time-tracker/types";

export function TimerCard() {
	const { data: activeEntry, isLoading } = useQuery<TimeEntry | null>({
		queryKey: ["time", "active"],
		queryFn: () => APIService.time.active(),
		refetchOnWindowFocus: true,
		staleTime: 0,
	});

	const [elapsed, setElapsed] = useState("00:00:00");

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

	return (
		<Link
			href="/dashboard/time-tracker"
			className="rounded-2xl p-5 flex flex-col justify-between min-h-[160px] transition-all cursor-pointer border border-mint/20 shadow-[0_0_40px_rgba(128,237,153,0.12)] hover:shadow-[0_0_65px_rgba(128,237,153,0.28)] hover:border-mint/40"
			style={{ background: "linear-gradient(135deg, #1a2e1a 0%, #0d1a0d 100%)" }}
		>
			<div className="flex items-center justify-between">
				<p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
					Time Tracker
				</p>
				{activeEntry && (
					<span className="relative flex h-2 w-2">
						<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
						<span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
					</span>
				)}
			</div>

			{isLoading ? (
				<div className="flex-1 flex items-center justify-center">
					<div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
				</div>
			) : activeEntry ? (
				<>
					<div className="mt-4">
						<p className="text-4xl font-bold font-mono tabular-nums text-white tracking-tight">
							{elapsed}
						</p>
						{activeEntry.title && (
							<p className="text-sm text-white/50 mt-1 truncate">
								{activeEntry.title}
							</p>
						)}
					</div>

					<div className="flex items-center gap-2 mt-4">
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
							<Square className="w-3.5 h-3.5 fill-white text-white" />
						</div>
						<span className="text-xs text-white/50">Click to manage</span>
					</div>
				</>
			) : (
				<>
					<div className="mt-4 flex items-center gap-3">
						<div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center">
							<Clock className="w-5 h-5 text-mint" />
						</div>
						<div>
							<p className="text-white font-medium text-sm">Not clocked in</p>
							<p className="text-white/40 text-xs">Click to start tracking</p>
						</div>
					</div>
				</>
			)}
		</Link>
	);
}
