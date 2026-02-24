"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ClipboardList } from "lucide-react";

interface TaskItem {
	id: string;
	title: string;
	status: string;
	priority?: string | null;
	due_date?: string | null;
	assignee?: { name: string | null; email: string } | null;
}

interface TasksListWidgetProps {
	tasks: TaskItem[];
	showNewButton?: boolean;
	title?: string;
}

const STATUS_STYLES: Record<string, string> = {
	pending: "bg-accent text-ink-3 border-border/40",
	assigned: "bg-mint/10 text-mint border-mint/20",
	in_progress: "bg-mint/20 text-mint border-mint/30",
	completed: "bg-mint/30 text-mint border-mint/40",
};

const STATUS_LABEL: Record<string, string> = {
	pending: "Unassigned",
	assigned: "Assigned",
	in_progress: "In Progress",
	completed: "Done",
};

// Deterministic dot color per task id — green family only
const DOT_COLORS = [
	"bg-mint",
	"bg-green-600",
	"bg-green-700",
	"bg-green-800",
	"bg-emerald-600",
	"bg-green-500",
	"bg-emerald-700",
];

export function TasksListWidget({
	tasks,
	showNewButton = false,
	title = "Recent Tasks",
}: TasksListWidgetProps) {
	return (
		<div className="glass rounded-2xl p-5 flex flex-col h-full hover:shadow-[0_8px_32px_rgba(128,237,153,0.15)] transition-shadow">
			<div className="flex items-center justify-between mb-4">
				<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
					{title}
				</p>
				{showNewButton && (
					<Link
						href="/dashboard/tasks"
						className="text-xs border border-mint/25 rounded-full px-3 py-1 text-ink-3 hover:bg-mint/10 hover:border-mint/50 hover:text-mint transition-colors"
					>
						+ New
					</Link>
				)}
			</div>

			{tasks.length === 0 ? (
				<div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
					<ClipboardList className="w-8 h-8 text-ink-3/40 mb-2" strokeWidth={1.5} />
					<p className="text-sm text-ink-3">No tasks yet.</p>
				</div>
			) : (
				<ul className="space-y-3 flex-1">
					{tasks.map((task, i) => {
						const dotColor = DOT_COLORS[i % DOT_COLORS.length];
						return (
							<li key={task.id}>
								<Link
									href={`/dashboard/tasks/${task.id}`}
									className="flex items-start gap-3 group"
								>
									<span
										className={cn(
											"mt-1 w-2 h-2 rounded-full shrink-0",
											dotColor,
										)}
									/>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-ink group-hover:text-mint transition-colors truncate">
											{task.title}
										</p>
										<div className="flex items-center gap-2 mt-0.5">
											{task.assignee && (
												<span className="text-xs text-ink-3 truncate">
													{task.assignee.name ?? task.assignee.email}
												</span>
											)}
											{task.due_date && (
												<span className="text-xs text-ink-3">
													Due {formatDate(task.due_date)}
												</span>
											)}
										</div>
									</div>
									<Badge
										variant="outline"
										className={cn("text-[10px] shrink-0", STATUS_STYLES[task.status])}
									>
										{STATUS_LABEL[task.status] ?? task.status}
									</Badge>
								</Link>
							</li>
						);
					})}
				</ul>
			)}

			<Link
				href="/dashboard/tasks"
				className="mt-4 text-xs text-ink-3 hover:text-mint transition-colors text-center"
			>
				View all tasks →
			</Link>
		</div>
	);
}
