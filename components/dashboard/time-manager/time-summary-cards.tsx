"use client";

import { formatDurationMs } from "@/lib/utils/format";
import type { TimeSummary } from "./types";

interface TimeSummaryCardsProps {
	summary: TimeSummary;
	rangeLabel?: string;
}

export function TimeSummaryCards({ summary, rangeLabel }: TimeSummaryCardsProps) {
	const avgMs = summary.daysWorked > 0 ? Math.round(summary.totalMs / summary.daysWorked) : 0;

	return (
		<div className="grid grid-cols-3 gap-4">
			{/* Featured — dark gradient */}
			<div
				className="rounded-xl border border-mint/30 p-5 relative overflow-hidden shadow-[0_0_40px_rgba(128,237,153,0.22)] hover:shadow-[0_0_60px_rgba(128,237,153,0.35)] transition-shadow"
				style={{ background: "linear-gradient(135deg, #1c3a1c 0%, #143018 50%, #0d200d 100%)" }}
			>
				<div
					className="absolute inset-0 pointer-events-none"
					style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(128, 237, 153, 0.15) 0%, transparent 60%)" }}
				/>
				<p className="relative text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
					Total time
					{rangeLabel && (
						<span className="normal-case font-normal ml-1 opacity-70">({rangeLabel})</span>
					)}
				</p>
				<p className="relative text-3xl font-bold text-white">
					{formatDurationMs(summary.totalMs)}
				</p>
			</div>

			{/* Glass — Avg per day */}
			<div className="glass rounded-xl p-5 hover:shadow-[0_4px_20px_rgba(128,237,153,0.12)] transition-shadow">
				<p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2">
					Avg per day
				</p>
				<p className="text-3xl font-bold text-ink">
					{formatDurationMs(avgMs)}
				</p>
			</div>

			{/* Glass — Days worked */}
			<div className="glass rounded-xl p-5 hover:shadow-[0_4px_20px_rgba(128,237,153,0.12)] transition-shadow">
				<p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2">
					Days worked
				</p>
				<p className="text-3xl font-bold text-ink">
					{summary.daysWorked}
					<span className="text-base font-normal text-ink-3 ml-1">
						{summary.daysWorked === 1 ? "day" : "days"}
					</span>
				</p>
			</div>
		</div>
	);
}
