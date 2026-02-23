"use client";

import { msToHours, avgHours } from "@/lib/utils/format";
import type { TimeSummary } from "./types";

interface TimeSummaryCardsProps {
	summary: TimeSummary;
}

interface CardProps {
	label: string;
	value: string;
	unit: string;
}

function StatCard({ label, value, unit }: CardProps) {
	return (
		<div className="rounded-lg border bg-background p-5">
			<p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2">
				{label}
			</p>
			<p className="text-3xl font-bold text-ink">
				{value}
				<span className="text-base font-normal text-ink-3 ml-1">{unit}</span>
			</p>
		</div>
	);
}

export function TimeSummaryCards({ summary }: TimeSummaryCardsProps) {
	return (
		<div className="grid grid-cols-3 gap-4">
			<StatCard
				label="Total hours"
				value={msToHours(summary.totalMs)}
				unit="hrs"
			/>
			<StatCard
				label="Avg per day"
				value={avgHours(summary.totalMs, summary.daysWorked)}
				unit="hrs"
			/>
			<StatCard
				label="Days worked"
				value={String(summary.daysWorked)}
				unit={summary.daysWorked === 1 ? "day" : "days"}
			/>
		</div>
	);
}
