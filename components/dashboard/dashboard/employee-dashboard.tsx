"use client";

import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { StatCard } from "./stat-card";
import { WeeklyBarsChart } from "./weekly-bars-chart";
import { TaskDonutChart } from "./task-donut-chart";
import { TasksListWidget } from "./tasks-list-widget";
import { TimerCard } from "./timer-card";
import { formatDurationMs } from "@/lib/utils/format";
import { Clock, CheckSquare, ClipboardList } from "lucide-react";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

interface EmployeeDashboardData {
	time: {
		this_week_ms: number;
		active: { id: string; start_time: string; title: string | null } | null;
	};
	tasks: { assigned: number; in_progress: number; completed: number };
	ticket_requests: { pending: number };
	weekly_days: { date: string; totalMs: number }[];
	my_tasks: {
		id: string;
		title: string;
		status: string;
		priority?: string | null;
		due_date?: string | null;
	}[];
}

export function EmployeeDashboard() {
	const { data, isLoading } = useQuery<EmployeeDashboardData>({
		queryKey: ["dashboard"],
		queryFn: () => APIService.dashboard.get(),
	});

	if (isLoading || !data) {
		return <DashboardSkeleton />;
	}

	const activeTasks = data.tasks.assigned + data.tasks.in_progress;

	return (
		<div className="space-y-4">
			{/* Row 1 — KPI Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<StatCard
					label="Hours This Week"
					value={formatDurationMs(data.time.this_week_ms)}
					subtext={data.time.active ? "timer running" : "total logged"}
					icon={Clock}
					href="/dashboard/time-tracker"
					featured
					liveIndicator={!!data.time.active}
				/>
				<StatCard
					label="My Active Tasks"
					value={activeTasks}
					subtext={`${data.tasks.in_progress} in progress`}
					icon={CheckSquare}
					href="/dashboard/tickets"
				/>
				<StatCard
					label="My Requests"
					value={data.ticket_requests.pending}
					subtext="pending requests"
					icon={ClipboardList}
					href="/dashboard/requests"
				/>
			</div>

			{/* Row 2 — Weekly chart + My tasks */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-2" style={{ minHeight: "220px" }}>
					<WeeklyBarsChart days={data.weekly_days} title="My Activity This Week" />
				</div>
				<TasksListWidget
					tasks={data.my_tasks}
					title="My Tasks"
				/>
			</div>

			{/* Row 3 — Donut + Timer */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<TaskDonutChart
					pending={0}
					assigned={data.tasks.assigned}
					in_progress={data.tasks.in_progress}
					completed={data.tasks.completed}
				/>
				<TimerCard />
			</div>
		</div>
	);
}
