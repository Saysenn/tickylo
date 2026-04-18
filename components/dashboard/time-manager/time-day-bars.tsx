"use client";

import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
	CartesianGrid,
} from "recharts";
import { formatDurationMs } from "@/lib/utils/format";
import type { TimeSummaryDay } from "./types";

interface TimeDayBarsProps {
	days: TimeSummaryDay[];
}

interface TooltipPayloadItem {
	value: number;
}

function CustomTooltip({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: TooltipPayloadItem[];
	label?: string;
}) {
	if (!active || !payload?.length) return null;
	const ms = payload[0].value ?? 0;
	return (
		<div className="bg-background border border-border text-[11px] font-medium px-2.5 py-1.5 rounded-lg shadow-md space-y-0.5">
			<p className="text-ink-3">{label}</p>
			<p className="text-ink font-semibold">{ms > 0 ? formatDurationMs(ms) : "No sessions"}</p>
		</div>
	);
}

function shortDayLabel(dateStr: string, total: number): string {
	const d = new Date(dateStr + "T00:00:00");
	// For wider ranges show just month+day; for 7-day show weekday abbr
	if (total <= 10) {
		return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
	}
	return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function msToHoursFloat(ms: number): number {
	return ms / 1000 / 60 / 60;
}

function hoursTickFormatter(value: number): string {
	if (value === 0) return "0";
	if (value < 1) return `${Math.round(value * 60)}m`;
	return `${value}h`;
}

export function TimeDayBars({ days }: TimeDayBarsProps) {
	if (days.length === 0) {
		return (
			<p className="text-sm text-ink-3 py-6 text-center">
				No time entries for this period.
			</p>
		);
	}

	const data = days.map((d) => ({
		label: shortDayLabel(d.date, days.length),
		totalMs: d.totalMs,
		hours: msToHoursFloat(d.totalMs),
	}));

	const maxHours = Math.max(...data.map((d) => d.hours), 0.5);
	// Round up to nearest 0.5h for a clean Y axis
	const yMax = Math.ceil(maxHours * 2) / 2;

	return (
		<div className="rounded-lg border bg-background p-5">
			<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-4">
				Daily breakdown
			</p>
			<ResponsiveContainer width="100%" height={200}>
				<BarChart
					data={data}
					margin={{ top: 4, right: 4, bottom: 0, left: -8 }}
					barSize={days.length <= 10 ? 28 : 14}
				>
					<CartesianGrid vertical={false} stroke="rgba(0,0,0,0.05)" strokeDasharray="3 3" />
					<XAxis
						dataKey="label"
						axisLine={false}
						tickLine={false}
						tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "system-ui,sans-serif" }}
						interval={days.length > 20 ? Math.floor(days.length / 10) : 0}
					/>
					<YAxis
						tickFormatter={hoursTickFormatter}
						axisLine={false}
						tickLine={false}
						tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "system-ui,sans-serif" }}
						domain={[0, yMax]}
						width={32}
					/>
					<Tooltip
						content={<CustomTooltip />}
						cursor={{ fill: "rgba(128,237,153,0.08)", radius: 4 }}
					/>
					<Bar dataKey="hours" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={600}>
						{data.map((entry, i) => (
							<Cell
								key={i}
								fill={entry.hours > 0 ? "rgba(128,237,153,0.75)" : "rgba(128,237,153,0.12)"}
							/>
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
