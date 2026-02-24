import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/infra/prisma";
import { ok, errorResponse } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";

// GET /api/v1/dashboard — role-aware stats for the dashboard landing page
export async function GET(_req: NextRequest) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const isAdmin = (user.app_metadata?.role as string) === ROLES.ADMIN;

		// Last 7 days date range
		const today = new Date();
		today.setHours(23, 59, 59, 999);
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
		sevenDaysAgo.setHours(0, 0, 0, 0);

		if (isAdmin) {
			const [
				employeeCount,
				clockedInEntries,
				taskCounts,
				pendingLeaves,
				recentTasks,
				weeklyEntries,
			] = await Promise.all([
				// Total employee count (non-admin users)
				prisma.user.count({ where: { role: "employee" } }),
				// Who's currently clocked in
				prisma.timeEntry.findMany({
					where: { end_time: null },
					include: { user: { select: { id: true, name: true, email: true } } },
				}),
				// Task counts by status
				prisma.task.groupBy({ by: ["status"], _count: { id: true } }),
				// Pending leave count
				prisma.leave.count({ where: { status: "pending" } }),
				// Recent 5 tasks
				prisma.task.findMany({
					orderBy: { created_at: "desc" },
					take: 5,
					include: { assignee: { select: { id: true, name: true, email: true } } },
				}),
				// Weekly time entries for all users
				prisma.timeEntry.findMany({
					where: {
						start_time: { gte: sevenDaysAgo, lte: today },
						end_time: { not: null },
					},
					select: { start_time: true, end_time: true },
				}),
			]);

			// Fetch active task titles for clocked-in users
			const clockedInUserIds = clockedInEntries.map((e) => e.user_id);
			const activeTasks =
				clockedInUserIds.length > 0
					? await prisma.task.findMany({
							where: {
								user_id: { in: clockedInUserIds },
								status: "in_progress",
							},
							select: { user_id: true, title: true },
							orderBy: { started_at: "desc" },
						})
					: [];

			const activeTaskByUser: Record<string, string> = {};
			for (const t of activeTasks) {
				if (t.user_id && !activeTaskByUser[t.user_id]) {
					activeTaskByUser[t.user_id] = t.title;
				}
			}

			// Build weekly days array (last 7 days)
			const weeklyDays = buildWeeklyDays(sevenDaysAgo, weeklyEntries);

			const taskByStatus = Object.fromEntries(
				taskCounts.map((r) => [r.status, r._count.id]),
			);

			return ok({
				employees: { total: employeeCount },
				time: {
					clocked_in_count: clockedInEntries.length,
					clocked_in_users: clockedInEntries.map((e) => ({
						id: e.user.id,
						name: e.user.name,
						email: e.user.email,
						start_time: e.start_time.toISOString(),
						active_task_title: activeTaskByUser[e.user_id] ?? null,
					})),
				},
				tasks: {
					pending: taskByStatus.pending ?? 0,
					assigned: taskByStatus.assigned ?? 0,
					in_progress: taskByStatus.in_progress ?? 0,
					completed: taskByStatus.completed ?? 0,
				},
				leaves: { pending: pendingLeaves },
				weekly_days: weeklyDays,
				recent_tasks: recentTasks,
			});
		} else {
			// Employee view
			const weekStart = new Date();
			weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday
			weekStart.setHours(0, 0, 0, 0);

			const [activeEntry, myTaskCounts, pendingRequests, weeklyEntries, myTasks] =
				await Promise.all([
					prisma.timeEntry.findFirst({
						where: { user_id: user.id, end_time: null },
					}),
					prisma.task.groupBy({
						by: ["status"],
						where: { user_id: user.id },
						_count: { id: true },
					}),
					prisma.leave.count({
						where: { user_id: user.id, status: "pending" },
					}),
					prisma.timeEntry.findMany({
						where: {
							user_id: user.id,
							start_time: { gte: sevenDaysAgo, lte: today },
							end_time: { not: null },
						},
						select: { start_time: true, end_time: true },
					}),
					prisma.task.findMany({
						where: {
							user_id: user.id,
							status: { in: ["assigned", "in_progress"] },
						},
						orderBy: { updated_at: "desc" },
						take: 5,
					}),
				]);

			const thisWeekMs = weeklyEntries.reduce((acc, e) => {
				if (!e.end_time) return acc;
				return acc + (e.end_time.getTime() - e.start_time.getTime());
			}, 0);

			const taskByStatus = Object.fromEntries(
				myTaskCounts.map((r) => [r.status, r._count.id]),
			);

			const weeklyDays = buildWeeklyDays(sevenDaysAgo, weeklyEntries);

			return ok({
				time: {
					this_week_ms: thisWeekMs,
					active: activeEntry
						? {
								id: activeEntry.id,
								start_time: activeEntry.start_time.toISOString(),
								title: activeEntry.title ?? null,
							}
						: null,
				},
				tasks: {
					assigned: taskByStatus.assigned ?? 0,
					in_progress: taskByStatus.in_progress ?? 0,
					completed: taskByStatus.completed ?? 0,
				},
				requests: { pending: pendingRequests },
				weekly_days: weeklyDays,
				my_tasks: myTasks,
			});
		}
	} catch (err) {
		console.error("[dashboard:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}

// Build an array of {date, totalMs} for the last 7 days
function buildWeeklyDays(
	start: Date,
	entries: { start_time: Date; end_time: Date | null }[],
): { date: string; totalMs: number }[] {
	const days: { date: string; totalMs: number }[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(start);
		d.setDate(d.getDate() + i);
		const dateStr = d.toISOString().slice(0, 10);
		days.push({ date: dateStr, totalMs: 0 });
	}
	for (const entry of entries) {
		if (!entry.end_time) continue;
		const dateStr = entry.start_time.toISOString().slice(0, 10);
		const day = days.find((d) => d.date === dateStr);
		if (day) {
			day.totalMs += entry.end_time.getTime() - entry.start_time.getTime();
		}
	}
	return days;
}
