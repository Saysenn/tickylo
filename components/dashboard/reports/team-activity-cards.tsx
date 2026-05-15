"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const LEAVE_STATUS_STYLES: Record<string, string> = {
	pending:   "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	approved:  "bg-green-500/15 text-green-700 border-green-500/20",
	rejected:  "bg-red-500/15 text-red-700 border-red-500/20",
	cancelled: "bg-accent text-ink-3 border-border/40",
};

const TASK_STATUS_STYLES: Record<string, string> = {
	pending:     "bg-accent text-ink-3 border-border/40",
	assigned:    "bg-mint/10 text-mint border-mint/20",
	in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	completed:   "bg-green-500/15 text-green-700 border-green-500/20",
};

export function TeamActivityCards() {
	return <RecentTasksCard />;
}

export function RecentTasksCard() {
	const { data: report, isLoading } = useQuery<any>({
		queryKey: ["reports"],
		queryFn: () => APIService.reports.summary(),
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-10">
				<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
			</div>
		);
	}

	if (!report) return null;

	return (
		<div className="glass rounded-2xl flex flex-col overflow-hidden">
			<div className="px-5 pt-5 pb-4 border-b border-mint/10">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-semibold text-ink">Recent Tasks</h2>
						<p className="text-xs text-ink-3 mt-0.5">All-time summary</p>
					</div>
					<Link href="/dashboard/tickets" className="text-xs font-medium text-mint hover:text-mint/70 transition-colors">
						View all →
					</Link>
				</div>
			</div>
			<div className="flex-1 overflow-x-auto">
				{report.recent.tasks.length > 0 ? (
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-mint/8">
								<th className="text-left px-5 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Title</th>
								<th className="text-left px-3 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Assignee</th>
								<th className="text-right px-5 py-2 text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Status</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-mint/6">
							{report.recent.tasks.map((t: any) => (
								<tr key={t.id} className="hover:bg-mint/5 transition-colors">
									<td className="px-5 py-2.5">
										<p className="text-xs font-medium text-ink truncate max-w-[140px]">{t.title}</p>
									</td>
									<td className="px-3 py-2.5 text-xs text-ink-3 truncate max-w-[100px]">
										{t.assignee?.name ?? t.assignee?.email ?? "Unassigned"}
									</td>
									<td className="px-5 py-2.5 text-right">
										<Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TASK_STATUS_STYLES[t.status])}>
											{t.status.replace("_", " ")}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				) : (
					<p className="px-5 py-6 text-xs text-ink-3">No tasks yet.</p>
				)}
			</div>
		</div>
	);
}
