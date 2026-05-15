"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import APIService from "@/lib/infra/api";

export function TicketStatsCards() {
	const { data: report, isLoading } = useQuery<any>({
		queryKey: ["reports"],
		queryFn: () => APIService.reports.summary(),
	});

	if (isLoading || !report) {
		return (
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{[...Array(4)].map((_, i) => (
					<div key={i} className="glass rounded-xl p-5 animate-pulse">
						<div className="h-3 w-16 bg-ink/10 rounded mb-3" />
						<div className="h-8 w-10 bg-ink/10 rounded" />
					</div>
				))}
			</div>
		);
	}

	const cards = [
		{ label: "Total", value: report.tasks.total, color: "text-ink", link: "/dashboard/tickets" },
		{ label: "Unassigned", value: report.tasks.pending, color: "text-ink-3", link: "/dashboard/tickets?status=pending" },
		{ label: "In Progress", value: report.tasks.in_progress, color: "text-yellow-700", labelColor: "text-yellow-600/80", link: "/dashboard/tickets?status=in_progress" },
		{ label: "Completed", value: report.tasks.completed, color: "text-mint", labelColor: "text-mint/70", link: "/dashboard/tickets?status=completed" },
	];

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
			{cards.map((c) => (
				<Link key={c.label} href={c.link} className="glass rounded-xl p-5 hover:shadow-[0_4px_20px_rgba(128,237,153,0.12)] transition-shadow group">
					<p className={`text-xs font-medium uppercase tracking-wider mb-2 ${c.labelColor ?? "text-ink-3"}`}>
						{c.label}
					</p>
					<p className={`text-3xl font-bold ${c.color} group-hover:opacity-80 transition-opacity`}>
						{c.value}
					</p>
				</Link>
			))}
		</div>
	);
}
