"use client";

import { formatDurationMs } from "@/lib/utils/format";
import type { TimeSummary } from "./types";

interface TimeSummaryCardsProps {
	summary: TimeSummary;
}

interface CardProps {
	label: string;
	value: string;
	unit?: string;
}

function StatCard({ label, value, unit }: CardProps) {
	return (
		<div className="rounded-lg border bg-background p-5">
			<p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2">
				{label}
			</p>
			<p className="text-3xl font-bold text-ink">
				{value}
				{unit && <span className="text-base font-normal text-ink-3 ml-1">{unit}</span>}
			</p>
		</div>
	);
}

export function TimeSummaryCards({ summary }: TimeSummaryCardsProps) {
	const avgMs = summary.daysWorked > 0 ? Math.round(summary.totalMs / summary.daysWorked) : 0;
	return (
		<div className="grid grid-cols-3 gap-4">
			<StatCard
				label="Total time"
				value={formatDurationMs(summary.totalMs)}
			/>
			<StatCard
				label="Avg per day"
				value={formatDurationMs(avgMs)}
			/>
			<StatCard
				label="Days worked"
				value={String(summary.daysWorked)}
				unit={summary.daysWorked === 1 ? "day" : "days"}
			/>
		</div>
	);
}
