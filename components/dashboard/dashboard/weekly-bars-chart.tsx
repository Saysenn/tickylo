"use client";

import { formatDurationMs } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { todayDateStr } from "@/lib/utils/format";

interface WeeklyDay {
	date: string; // YYYY-MM-DD
	totalMs: number;
}

interface WeeklyBarsChartProps {
	days: WeeklyDay[];
	title?: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function WeeklyBarsChart({ days, title = "Weekly Activity" }: WeeklyBarsChartProps) {
	const maxMs = Math.max(...days.map((d) => d.totalMs), 1);
	const today = todayDateStr();

	return (
		<div className="glass rounded-2xl p-5 h-full flex flex-col hover:shadow-[0_8px_32px_rgba(128,237,153,0.15)] transition-shadow">
			<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-6">
				{title}
			</p>

			<div className="flex items-end justify-between gap-2 flex-1 min-h-0">
				{days.map((day) => {
					const pct = day.totalMs === 0 ? 0 : (day.totalMs / maxMs) * 100;
					const isToday = day.date === today;
					const dayOfWeek = new Date(day.date + "T00:00:00").getDay();
					const dayLabel = DAY_LABELS[dayOfWeek];

					return (
						<div
							key={day.date}
							className="flex flex-col items-center gap-2 flex-1 group"
						>
							{/* Tooltip */}
							<div className="relative w-full flex justify-center">
								{day.totalMs > 0 && (
									<span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-ink-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-mint/15">
										{formatDurationMs(day.totalMs)}
									</span>
								)}
							</div>

							{/* Bar track */}
							<div className="flex-1 w-full flex items-end" style={{ minHeight: "120px" }}>
								{day.totalMs === 0 ? (
									// Empty day — dashed outlined pill
									<div
										className="w-full rounded-full border-2 border-dashed border-mint/20"
										style={{ height: "18%" }}
									/>
								) : isToday ? (
									// Today — vibrant gradient with glow
									<div
										className="w-full rounded-full transition-all duration-500"
										style={{
											height: `${Math.max(pct, 8)}%`,
											background: "linear-gradient(180deg, #80ED99 0%, #52d68a 100%)",
											boxShadow: "0 0 16px rgba(128, 237, 153, 0.45)",
										}}
									/>
								) : (
									// Past days — softer mint
									<div
										className="w-full rounded-full transition-all duration-500 bg-mint/35 group-hover:bg-mint/55"
										style={{ height: `${Math.max(pct, 8)}%` }}
									/>
								)}
							</div>

							{/* Day label */}
							<span
								className={cn(
									"text-[11px] font-medium",
									isToday ? "text-mint font-semibold" : "text-ink-3",
								)}
							>
								{dayLabel}
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
