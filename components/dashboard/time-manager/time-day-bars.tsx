"use client";

import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	Cell,
	LabelList,
} from "recharts";
import { formatDurationMs, formatDayLabel } from "@/lib/utils/format";
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
	if (!active || !payload?.length || !payload[0].value) return null;
	return (
		<div className="bg-white/90 backdrop-blur-sm border border-mint/30 text-[11px] font-medium text-ink-2 px-2.5 py-1.5 rounded-lg shadow-sm space-y-0.5">
			<p className="text-ink-3">{label}</p>
			<p className="text-ink">{formatDurationMs(payload[0].value)}</p>
		</div>
	);
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
		label: formatDayLabel(d.date),
		totalMs: d.totalMs,
	}));

	const chartHeight = days.length * 38 + 16;

	return (
		<div className="rounded-lg border bg-background p-5">
			<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-4">
				Daily breakdown
			</p>
			<ResponsiveContainer width="100%" height={chartHeight}>
				<BarChart
					layout="vertical"
					data={data}
					margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
					barSize={16}
				>
					<XAxis type="number" hide domain={[0, "dataMax"]} />
					<YAxis
						type="category"
						dataKey="label"
						axisLine={false}
						tickLine={false}
						width={120}
						tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "system-ui,sans-serif" }}
					/>
					<Tooltip
						content={<CustomTooltip />}
						cursor={{ fill: "rgba(128,237,153,0.06)" }}
					/>
					<Bar dataKey="totalMs" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={700}>
						{data.map((entry, i) => (
							<Cell
								key={i}
								fill={entry.totalMs > 0 ? "rgba(128,237,153,0.6)" : "rgba(128,237,153,0.12)"}
							/>
						))}
						<LabelList
							dataKey="totalMs"
							position="right"
							formatter={(value) => {
								const ms = typeof value === "number" ? value : 0;
								return ms > 0 ? formatDurationMs(ms) : "—";
							}}
							style={{ fontSize: 11, fill: "#9ca3af", fontFamily: "system-ui,sans-serif" }}
						/>
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
