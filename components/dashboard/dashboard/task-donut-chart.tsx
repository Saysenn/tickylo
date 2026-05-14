"use client";

import { PieChart, Pie, Cell } from "recharts";

interface TaskDonutChartProps {
	pending: number;
	assigned: number;
	in_progress: number;
	completed: number;
}

function LegendItem({
	color,
	label,
	count,
	dashed,
}: {
	color: string;
	label: string;
	count: number;
	dashed?: boolean;
}) {
	return (
		<div className="flex items-center gap-1.5">
			<span className={`w-2.5 h-2.5 rounded-full ${color} ${dashed ? "border border-dashed" : ""}`} />
			<span className="text-xs text-ink-3">{label}</span>
			<span className="text-xs font-medium text-ink">{count}</span>
		</div>
	);
}

export function TaskDonutChart({ pending, assigned, in_progress, completed }: TaskDonutChartProps) {
	const total = pending + assigned + in_progress + completed;
	const displayPct = total === 0 ? 0 : Math.round((completed / total) * 100);

	// Semicircle: cy at bottom edge so only the top half arc is visible
	const W = 200;
	const H = 110;

	// Avoid zero-value slices which collapse the arc rendering
	const safeData =
		total === 0
			? [{ value: 0.001 }, { value: 1 }]
			: completed >= total
				? [{ value: 1 }, { value: 0.001 }]
				: [{ value: completed }, { value: total - completed }];

	return (
		<div className="glass rounded-2xl p-5 flex flex-col hover:shadow-[0_8px_32px_rgba(128,237,153,0.15)] transition-shadow">
			<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">
				Task Progress
			</p>

			<div className="flex flex-col items-center">
				{/* Semicircle + center label overlay */}
				<div className="relative" style={{ width: W, height: H }}>
					<PieChart width={W} height={H}>
						<defs>
							<linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stopColor="#52d68a" />
								<stop offset="100%" stopColor="#80ED99" />
							</linearGradient>
						</defs>
						<Pie
							data={safeData}
							cx={W / 2}
							cy={H}
							startAngle={180}
							endAngle={0}
							innerRadius={58}
							outerRadius={76}
							dataKey="value"
							isAnimationActive
							animationDuration={800}
							animationEasing="ease-out"
							strokeWidth={0}
						>
							<Cell fill="url(#donutGrad)" />
							<Cell fill="rgba(128,237,153,0.12)" />
						</Pie>
					</PieChart>

					{/* Center text — sits inside the inner hole of the arc mouth */}
					<div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pointer-events-none">
						<span className="text-lg font-bold text-ink">{displayPct}%</span>
						<span className="text-[10px] text-ink-3">Completed</span>
					</div>
				</div>

				{/* Legend */}
				<div className="flex items-center gap-4 mt-3 flex-wrap justify-center">
					<LegendItem color="bg-mint" label="Completed" count={completed} />
					<LegendItem color="bg-mint/50" label="In Progress" count={in_progress} />
					<LegendItem
						color="bg-mint/15 border border-mint/25"
						label="Pending"
						count={pending + assigned}
						dashed
					/>
				</div>

				{total > 0 && (
					<p className="text-xs text-ink-3 mt-3">{total} total tasks</p>
				)}
			</div>
		</div>
	);
}
