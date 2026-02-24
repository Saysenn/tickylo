"use client";

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { todayDateStr, formatDurationMs } from "@/lib/utils/format";

interface WeeklyDay {
	date: string; // YYYY-MM-DD
	totalMs: number;
}

interface WeeklyBarsChartProps {
	days: WeeklyDay[];
	title?: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getLabel(date: string) {
	return DAY_LABELS[new Date(date + "T00:00:00").getDay()];
}

interface TooltipPayloadItem {
	value: number;
}

function CustomTooltip({
	active,
	payload,
}: {
	active?: boolean;
	payload?: TooltipPayloadItem[];
}) {
	if (!active || !payload?.length || !payload[0].value) return null;
	return (
		<div className="bg-white/90 backdrop-blur-sm border border-mint/30 text-[11px] font-medium text-ink-2 px-2.5 py-1.5 rounded-lg shadow-sm">
			{formatDurationMs(payload[0].value)}
		</div>
	);
}

interface DotProps {
	cx?: number;
	cy?: number;
	payload?: { date: string; totalMs: number; isToday: boolean };
}

function CustomDot({ cx, cy, payload }: DotProps) {
	if (cx === undefined || cy === undefined || !payload) return <g />;
	if (!payload.totalMs) return <g />;

	if (payload.isToday) {
		return (
			<g>
				<circle cx={cx} cy={cy} r={10} fill="rgba(128,237,153,0.15)" />
				<circle
					cx={cx}
					cy={cy}
					r={5}
					fill="#80ED99"
					stroke="white"
					strokeWidth={1.5}
					style={{ filter: "drop-shadow(0 0 6px rgba(128,237,153,0.8))" }}
				/>
			</g>
		);
	}

	return <circle cx={cx} cy={cy} r={3.5} fill="#52d68a" stroke="white" strokeWidth={1} />;
}

interface TickProps {
	x?: string | number;
	y?: string | number;
	payload?: { value: string };
	isToday?: boolean;
}

function CustomTick({ x, y, payload, isToday }: TickProps) {
	if (!payload) return <g />;
	return (
		<text
			x={x}
			y={typeof y === "number" ? y + 12 : 12}
			textAnchor="middle"
			fontSize={11}
			fontWeight={isToday ? 600 : 400}
			fill={isToday ? "#80ED99" : "#9ca3af"}
			fontFamily="system-ui,-apple-system,sans-serif"
		>
			{payload.value}
		</text>
	);
}

export function WeeklyBarsChart({ days, title = "Weekly Activity" }: WeeklyBarsChartProps) {
	const today = todayDateStr();

	const data = days.map((d) => ({
		...d,
		label: getLabel(d.date),
		isToday: d.date === today,
	}));

	return (
		<div className="glass rounded-2xl p-5 h-full flex flex-col hover:shadow-[0_8px_32px_rgba(128,237,153,0.15)] transition-shadow">
			<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-3">
				{title}
			</p>

			<div className="flex-1 min-h-0" style={{ minHeight: "140px" }}>
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 20, right: 24, bottom: 0, left: 8 }}>
						<defs>
							<linearGradient id="wlcLine" x1="0" y1="0" x2="1" y2="0">
								<stop offset="0%" stopColor="#52d68a" />
								<stop offset="100%" stopColor="#80ED99" />
							</linearGradient>
							<linearGradient id="wlcArea" x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="rgba(128,237,153,0.22)" />
								<stop offset="100%" stopColor="rgba(128,237,153,0)" />
							</linearGradient>
						</defs>

						<XAxis
							dataKey="label"
							axisLine={false}
							tickLine={false}
							interval={0}
							tick={(props: TickProps) => {
								const isToday = data.find((d) => d.label === props.payload?.value)?.isToday;
								return <CustomTick {...props} isToday={isToday} />;
							}}
						/>

						<Tooltip
							content={<CustomTooltip />}
							cursor={{ stroke: "rgba(128,237,153,0.2)", strokeWidth: 1, strokeDasharray: "4 2" }}
						/>

						<Area
							type="monotone"
							dataKey="totalMs"
							stroke="url(#wlcLine)"
							strokeWidth={2}
							fill="url(#wlcArea)"
							dot={(props: DotProps) => <CustomDot {...props} />}
							activeDot={{ r: 5, fill: "#80ED99", stroke: "white", strokeWidth: 1.5 }}
							isAnimationActive
							animationDuration={1400}
							animationEasing="ease-in-out"
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

// Re-export name alias so existing imports that reference "WeeklyBarsChart" keep working
export { WeeklyBarsChart as WeeklyLineChart };
