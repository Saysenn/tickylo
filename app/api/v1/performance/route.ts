import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";

// GET /api/v1/performance?from=YYYY-MM-DD&to=YYYY-MM-DD
// Admin-only per-employee performance metrics derived from Task + TimeEntry
export async function GET(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { searchParams } = new URL(request.url);
		const fromParam = searchParams.get("from");
		const toParam = searchParams.get("to");

		const from = fromParam ? new Date(fromParam + "T00:00:00") : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
		const to = toParam ? new Date(toParam + "T23:59:59.999") : new Date();

		// Fetch all employees
		const employees = await prisma.user.findMany({
			where: { role: "employee" },
			select: { id: true, name: true, email: true },
			orderBy: { name: "asc" },
		});

		if (employees.length === 0) return ok([]);

		const userIds = employees.map((e) => e.id);

		// Fetch tasks and time entries in parallel
		const [tasks, timeEntries] = await Promise.all([
			prisma.task.findMany({
				where: {
					user_id: { in: userIds },
					created_at: { gte: from, lte: to },
				},
				select: {
					user_id: true,
					status: true,
					started_at: true,
					completed_at: true,
				},
			}),
			prisma.timeEntry.findMany({
				where: {
					user_id: { in: userIds },
					start_time: { gte: from, lte: to },
					end_time: { not: null },
				},
				select: { user_id: true, start_time: true, end_time: true },
			}),
		]);

		// Aggregate per user
		const result = employees.map((emp) => {
			const empTasks = tasks.filter((t) => t.user_id === emp.id);
			const empTime = timeEntries.filter((t) => t.user_id === emp.id);

			const tasks_completed = empTasks.filter((t) => t.status === "completed").length;
			const tasks_in_progress = empTasks.filter((t) => t.status === "in_progress").length;
			const tasks_total = empTasks.length;
			const completion_rate = tasks_total > 0 ? tasks_completed / tasks_total : 0;

			// Average days to complete (only tasks with both timestamps)
			const completedWithDuration = empTasks.filter(
				(t) => t.status === "completed" && t.started_at && t.completed_at,
			);
			const avg_days_to_complete =
				completedWithDuration.length > 0
					? completedWithDuration.reduce((acc, t) => {
							const ms = t.completed_at!.getTime() - t.started_at!.getTime();
							return acc + ms / (1000 * 60 * 60 * 24);
						}, 0) / completedWithDuration.length
					: 0;

			const time_this_period_ms = empTime.reduce((acc, e) => {
				if (!e.end_time) return acc;
				return acc + (e.end_time.getTime() - e.start_time.getTime());
			}, 0);

			return {
				user: { id: emp.id, name: emp.name, email: emp.email },
				tasks_completed,
				tasks_in_progress,
				tasks_total,
				completion_rate: Math.round(completion_rate * 100) / 100,
				avg_days_to_complete: Math.round(avg_days_to_complete * 10) / 10,
				time_this_period_ms,
			};
		});

		return ok(result);
	} catch (err) {
		console.error("[performance:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
