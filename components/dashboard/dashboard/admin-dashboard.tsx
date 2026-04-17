"use client";

import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { StatCard } from "./stat-card";
import { WeeklyBarsChart } from "./weekly-bars-chart";
import { TaskDonutChart } from "./task-donut-chart";
import { TeamActivityWidget } from "./team-activity-widget";
import { TasksListWidget } from "./tasks-list-widget";
import { TimerCard } from "./timer-card";
import { WorkloadChart } from "@/components/dashboard/tasks/workload-chart";
import { Users, CheckSquare, ClipboardList } from "lucide-react";

interface AdminDashboardData {
	employees: { total: number };
	time: {
		clocked_in_count: number;
		clocked_in_users: {
			id: string;
			name: string | null;
			email: string;
			start_time: string;
			active_task_title: string | null;
		}[];
	};
	tasks: {
		pending: number;
		assigned: number;
		in_progress: number;
		completed: number;
	};
	leaves: { pending: number };
	weekly_days: { date: string; totalMs: number }[];
	recent_tasks: {
		id: string;
		title: string;
		status: string;
		due_date: string | null;
		assignee: { name: string | null; email: string } | null;
	}[];
}

export function AdminDashboard() {
	const { data, isLoading } = useQuery<AdminDashboardData>({
		queryKey: ["dashboard"],
		queryFn: () => APIService.dashboard.get(),
	});

	if (isLoading || !data) {
		return (
			<div className="flex items-center justify-center py-32">
				<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
			</div>
		);
	}

	const openTasks = data.tasks.assigned + data.tasks.in_progress;

	return (
		<div className="space-y-4">
			{/* Row 1 — KPI Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					label="Total Employees"
					value={data.employees.total}
					subtext="on your team"
					icon={Users}
					href="/dashboard/employees"
					featured
				/>
				<StatCard
					label="Clocked In Now"
					value={data.time.clocked_in_count}
					subtext={data.time.clocked_in_count > 0 ? "currently working" : "no one active"}
					liveIndicator={data.time.clocked_in_count > 0}
					href="/dashboard/time-manager"
				/>
				<StatCard
					label="Open Tasks"
					value={openTasks}
					subtext={`${data.tasks.in_progress} in progress`}
					icon={CheckSquare}
					href="/dashboard/tasks"
				/>
				<StatCard
					label="Pending Approvals"
					value={data.leaves.pending}
					subtext="leave requests"
					icon={ClipboardList}
					href="/dashboard/requests"
				/>
			</div>

			{/* Row 2 — Weekly chart + Tasks list */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-2" style={{ minHeight: "220px" }}>
					<WeeklyBarsChart days={data.weekly_days} title="Team Activity This Week" />
				</div>
				<TasksListWidget
					tasks={data.recent_tasks}
					showNewButton
					title="Recent Tasks"
				/>
			</div>

			{/* Row 3 — Team activity + Donut + Timer */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<TeamActivityWidget users={data.time.clocked_in_users} />
				<TaskDonutChart
					pending={data.tasks.pending}
					assigned={data.tasks.assigned}
					in_progress={data.tasks.in_progress}
					completed={data.tasks.completed}
				/>
				<TimerCard />
			</div>

			{/* Row 4 — Workload chart */}
			<WorkloadChart />
		</div>
	);
}
