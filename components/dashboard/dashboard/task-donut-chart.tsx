"use client";

interface TaskDonutChartProps {
	pending: number;
	assigned: number;
	in_progress: number;
	completed: number;
}

export function TaskDonutChart({ pending, assigned, in_progress, completed }: TaskDonutChartProps) {
	const total = pending + assigned + in_progress + completed;
	const pct = total === 0 ? 0 : completed / total;
	const displayPct = Math.round(pct * 100);

	// Semicircle SVG parameters
	const r = 70;
	const cx = 100;
	const cy = 100;
	// Arc from left (180°) to right (0°), going through top (270° = 12 o'clock)
	// Using a path for the semicircle arc
	const arcLength = Math.PI * r; // half circumference
	const offset = arcLength * (1 - pct);

	return (
		<div className="glass rounded-2xl p-5 flex flex-col hover:shadow-[0_8px_32px_rgba(128,237,153,0.15)] transition-shadow">
			<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-2">
				Task Progress
			</p>

			<div className="flex flex-col items-center">
				{/* SVG Semicircle */}
				<div className="relative">
					<svg
						viewBox="0 0 200 110"
						className="w-48 h-24"
						aria-hidden="true"
					>
						<defs>
							<linearGradient id="mintArcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stopColor="#52d68a" />
								<stop offset="100%" stopColor="#80ED99" />
							</linearGradient>
						</defs>
						{/* Background track */}
						<path
							d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
							fill="none"
							stroke="rgba(128, 237, 153, 0.12)"
							strokeWidth="16"
							strokeLinecap="round"
						/>
						{/* Foreground arc — gradient */}
						<path
							d={`M ${cx - r},${cy} A ${r},${r} 0 0,1 ${cx + r},${cy}`}
							fill="none"
							stroke="url(#mintArcGradient)"
							strokeWidth="16"
							strokeLinecap="round"
							strokeDasharray={arcLength}
							strokeDashoffset={offset}
							style={{ transition: "stroke-dashoffset 0.6s ease" }}
						/>
					</svg>

					{/* Center text */}
					<div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
						<span className="text-2xl font-bold text-ink">{displayPct}%</span>
						<span className="text-[10px] text-ink-3">Completed</span>
					</div>
				</div>

				{/* Legend */}
				<div className="flex items-center gap-4 mt-3 flex-wrap justify-center">
					<LegendItem color="bg-mint" label="Completed" count={completed} />
					<LegendItem color="bg-mint/50" label="In Progress" count={in_progress} />
					<LegendItem color="bg-mint/15 border border-mint/25" label="Pending" count={pending + assigned} dashed />
				</div>

				{/* Total */}
				{total > 0 && (
					<p className="text-xs text-ink-3 mt-3">{total} total tasks</p>
				)}
			</div>
		</div>
	);
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
			<span
				className={`w-2.5 h-2.5 rounded-full ${color} ${dashed ? "border border-dashed" : ""}`}
			/>
			<span className="text-xs text-ink-3">{label}</span>
			<span className="text-xs font-medium text-ink">{count}</span>
		</div>
	);
}
