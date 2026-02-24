"use client";

import { formatDurationMs, formatDayLabel } from "@/lib/utils/format";
import type { TimeSummaryDay } from "./types";

interface TimeDayBarsProps {
	days: TimeSummaryDay[];
}

export function TimeDayBars({ days }: TimeDayBarsProps) {
	if (days.length === 0) {
		return (
			<p className="text-sm text-ink-3 py-6 text-center">
				No time entries for this period.
			</p>
		);
	}

	const maxMs = Math.max(...days.map((d) => d.totalMs), 1);

	return (
		<div className="rounded-lg border bg-background p-5 space-y-2">
			<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-4">
				Daily breakdown
			</p>
			{days.map((day) => {
				const pct = day.totalMs === 0 ? 0 : (day.totalMs / maxMs) * 100;
				return (
					<div key={day.date} className="flex items-center gap-3 text-sm">
						<span className="w-32 shrink-0 text-ink-3 text-xs">
							{formatDayLabel(day.date)}
						</span>
						<div className="flex-1 h-5 bg-accent rounded-full overflow-hidden">
							<div
								className="h-full bg-mint/70 rounded-full transition-all duration-300"
								style={{ width: `${pct}%` }}
							/>
						</div>
						<span className="w-20 shrink-0 text-right text-ink-3 text-xs">
							{day.totalMs > 0 ? formatDurationMs(day.totalMs) : "—"}
						</span>
					</div>
				);
			})}
		</div>
	);
}
