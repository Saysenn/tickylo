"use client";

import { Label } from "@/components/ui/label";
import {
	todayDateStr,
	daysAgoDateStr,
	startOfMonthDateStr,
} from "@/lib/utils/format";

export interface DatePreset {
	label: string;
	from: () => string;
	to: () => string;
}

interface TimeDateRangeProps {
	from: string;
	to: string;
	onChange: (from: string, to: string) => void;
	presets?: DatePreset[];
}

const PRESETS = [
	{ label: "Today", from: () => todayDateStr(), to: () => todayDateStr() },
	{ label: "Last 7 days", from: () => daysAgoDateStr(6), to: () => todayDateStr() },
	{ label: "This month", from: () => startOfMonthDateStr(), to: () => todayDateStr() },
	{ label: "Last 30 days", from: () => daysAgoDateStr(29), to: () => todayDateStr() },
	{ label: "Last 90 days", from: () => daysAgoDateStr(89), to: () => todayDateStr() },
];

export function TimeDateRange({ from, to, onChange, presets = PRESETS }: TimeDateRangeProps) {
	return (
		<div className="flex flex-wrap items-end gap-3">
			{/* Preset buttons */}
			<div className="flex flex-wrap gap-1.5">
				{presets.map((p) => {
					const pFrom = p.from();
					const pTo = p.to();
					const active = from === pFrom && to === pTo;
					return (
						<button
							key={p.label}
							onClick={() => onChange(pFrom, pTo)}
							className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
								active
									? "bg-mint/20 border-mint/40 text-ink font-medium"
									: "border-border text-ink-3 hover:text-ink hover:border-ink-3"
							}`}
						>
							{p.label}
						</button>
					);
				})}
			</div>

			{/* Custom range */}
			<div className="flex items-end gap-2">
				<div className="space-y-1">
					<Label className="text-xs text-ink-3">From</Label>
					<input
						type="date"
						value={from}
						max={to}
						onChange={(e) => onChange(e.target.value, to)}
						className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
					/>
				</div>
				<div className="space-y-1">
					<Label className="text-xs text-ink-3">To</Label>
					<input
						type="date"
						value={to}
						min={from}
						max={todayDateStr()}
						onChange={(e) => onChange(from, e.target.value)}
						className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
					/>
				</div>
			</div>
		</div>
	);
}
