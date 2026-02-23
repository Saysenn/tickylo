"use client";

import { cn } from "@/lib/utils/cn";

interface TimeViewToggleProps {
	view: "week" | "month";
	onChange: (view: "week" | "month") => void;
}

export function TimeViewToggle({ view, onChange }: TimeViewToggleProps) {
	return (
		<div className="inline-flex rounded-lg border border-border bg-accent/30 p-1 gap-1">
			{(["week", "month"] as const).map((v) => (
				<button
					key={v}
					onClick={() => onChange(v)}
					className={cn(
						"px-4 py-1.5 text-sm rounded-md font-medium transition-colors capitalize",
						view === v
							? "bg-background text-ink shadow-sm"
							: "text-ink-3 hover:text-ink",
					)}
				>
					{v === "week" ? "This week" : "This month"}
				</button>
			))}
		</div>
	);
}
