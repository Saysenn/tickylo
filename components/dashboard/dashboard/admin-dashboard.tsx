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
import { Users, BarChart2, ClipboardList, Ticket } from "lucide-react";
import { usePlan } from "@/providers/org-settings-provider";
import { canAccess } from "@/lib/utils/plan-gate";

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
			entry_title: string | null;
		}[];
	};
	tasks: {
		pending: number;
		assigned: number;
		in_progress: number;
		completed: number;
	};
	ticket_requests: { pending: number };
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
	const { plan, is_internal } = usePlan();
	const gate = (feature: Parameters<typeof canAccess>[2]) => canAccess(plan, is_internal, feature);

	if (isLoading || !data) {
		return (
			<div className="flex items-center justify-center py-32">
				<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Row 1 — KPI Cards */}
			<div id="tour-dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard
					label="Total Employees"
					value={data.employees.total}
					subtext="on your team"
					icon={Users}
					href="/dashboard/employees"
					featured
				/>
				<StatCard
					label="Open Tickets"
					value={data.tasks.pending + data.tasks.assigned + data.tasks.in_progress}
					subtext="not yet completed"
					icon={Ticket}
					href="/dashboard/tickets"
				/>
				<StatCard
					label="Reports"
					value={gate("performance") ? data.tasks.completed : "—"}
					subtext="tasks completed"
					icon={BarChart2}
					href="/dashboard/performance"
					locked={!gate("performance")}
				/>
				<StatCard
					label="Ticket Requests"
					value={data.ticket_requests.pending}
					subtext="pending review"
					icon={ClipboardList}
					href="/dashboard/ticket-requests"
				/>
			</div>

			{/* Row 2 — Weekly chart + Team activity */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-2" style={{ minHeight: "220px" }}>
					<WeeklyBarsChart days={data.weekly_days} title="Team Activity This Week" />
				</div>
				{gate("time_manager") && <TeamActivityWidget users={data.time.clocked_in_users} />}
			</div>

			{/* Row 3 — Recent tasks + Donut + Timer */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<TasksListWidget
					tasks={data.recent_tasks}
					showNewButton
					title="Recent Tasks"
				/>
				<TaskDonutChart
					pending={data.tasks.pending}
					assigned={data.tasks.assigned}
					in_progress={data.tasks.in_progress}
					completed={data.tasks.completed}
				/>
				<div id="tour-dashboard-timer"><TimerCard /></div>
			</div>

			{/* Row 4 — Workload chart */}
			{gate("employees") && <WorkloadChart />}
		</div>
	);
}
