import { Suspense } from "react";
import { TasksTable } from "@/components/dashboard/tasks/tasks-table";

export const metadata = { title: "Tasks" };

export default function TasksPage() {
	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Tasks</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Assign, track, and complete tasks across your team.
				</p>
			</div>
			<Suspense>
				<TasksTable />
			</Suspense>
		</div>
	);
}
