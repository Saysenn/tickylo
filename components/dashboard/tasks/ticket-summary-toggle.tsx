"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import APIService from "@/lib/infra/api";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";

export function TicketSummaryToggle() {
	const [open, setOpen] = useState(false);

	const { data: stats } = useQuery<any>({
		queryKey: ["task-stats"],
		queryFn: () => APIService.tasks.stats(),
		enabled: open,
		staleTime: 30_000,
	});

	const cards = stats
		? [
				{ label: "Total", value: stats.total, color: "text-ink", labelColor: "text-ink-3", href: "/dashboard/tickets" },
				{ label: "Unassigned", value: stats.pending, color: "text-ink-3", labelColor: "text-ink-3/70", href: "/dashboard/tickets?status=pending" },
				{ label: "In Progress", value: stats.in_progress, color: "text-yellow-700", labelColor: "text-yellow-600/80", href: "/dashboard/tickets?status=in_progress" },
				{ label: "On Hold", value: stats.on_hold, color: "text-orange-600", labelColor: "text-orange-500/80", href: "/dashboard/tickets?status=on_hold" },
				{ label: "Resolved", value: stats.completed, color: "text-mint", labelColor: "text-mint/70", href: "/dashboard/tickets?status=completed" },
		  ]
		: null;

	return (
		<div>
			{/* Toggle button */}
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink transition-colors"
			>
				<BarChart2 className="w-3.5 h-3.5" />
				<span>{open ? "Hide summary" : "Show summary"}</span>
				{open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
			</button>

			{/* Collapsible cards */}
			<div
				className={cn(
					"grid grid-cols-2 sm:grid-cols-5 gap-3 overflow-hidden transition-all duration-300 ease-in-out",
					open ? "max-h-40 opacity-100 mt-3" : "max-h-0 opacity-0 pointer-events-none",
				)}
			>
				{cards
					? cards.map((c) => (
							<Link
								key={c.label}
								href={c.href}
								className="glass rounded-xl px-4 py-3 hover:shadow-[0_4px_16px_rgba(128,237,153,0.12)] transition-shadow group"
							>
								<p className={cn("text-[10px] font-medium uppercase tracking-wider mb-1.5", c.labelColor)}>{c.label}</p>
								<p className={cn("text-2xl font-bold", c.color)}>{c.value}</p>
							</Link>
					  ))
					: open && (
							<div className="col-span-5 flex items-center gap-3 py-4">
								{Array.from({ length: 5 }).map((_, i) => (
									<div key={i} className="space-y-1 text-center">
										<Skeleton className="h-2.5 w-12 mx-auto" />
										<Skeleton className="h-6 w-8 mx-auto" />
									</div>
								))}
							</div>
					  )}
			</div>
		</div>
	);
}
