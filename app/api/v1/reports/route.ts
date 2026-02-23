import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";

/**
 * GET /api/v1/reports
 * Admin-only aggregate stats for the team
 */
export async function GET() {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const now = new Date();
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [
			leaveCounts,
			taskCounts,
			timeThisMonth,
			recentLeaves,
			recentTasks,
		] = await Promise.all([
			// Leave counts by status
			prisma.leave.groupBy({
				by: ["status"],
				_count: { id: true },
			}),
			// Task counts by status
			prisma.task.groupBy({
				by: ["status"],
				_count: { id: true },
			}),
			// Total time worked this month (all users)
			prisma.timeEntry.findMany({
				where: {
					start_time: { gte: startOfMonth },
					end_time: { not: null },
				},
				select: { start_time: true, end_time: true, user_id: true },
			}),
			// Recent leave requests (last 5)
			prisma.leave.findMany({
				orderBy: { created_at: "desc" },
				take: 5,
				include: { user: { select: { id: true, name: true, email: true } } },
			}),
			// Recent tasks (last 5)
			prisma.task.findMany({
				orderBy: { created_at: "desc" },
				take: 5,
				include: {
					assignee: { select: { id: true, name: true, email: true } },
				},
			}),
		]);

		// Aggregate time stats
		const totalTimeMs = timeThisMonth.reduce((acc, entry) => {
			if (!entry.end_time) return acc;
			return acc + (entry.end_time.getTime() - entry.start_time.getTime());
		}, 0);

		// Per-user time breakdown
		const byUser: Record<string, number> = {};
		for (const entry of timeThisMonth) {
			if (!entry.end_time) continue;
			const ms = entry.end_time.getTime() - entry.start_time.getTime();
			byUser[entry.user_id] = (byUser[entry.user_id] ?? 0) + ms;
		}

		// Shape leave and task counts into maps
		const leaveByStatus = Object.fromEntries(
			leaveCounts.map((r) => [r.status, r._count.id]),
		);
		const taskByStatus = Object.fromEntries(
			taskCounts.map((r) => [r.status, r._count.id]),
		);

		return ok({
			leaves: {
				pending: leaveByStatus.pending ?? 0,
				approved: leaveByStatus.approved ?? 0,
				rejected: leaveByStatus.rejected ?? 0,
				cancelled: leaveByStatus.cancelled ?? 0,
				total: leaveCounts.reduce((a, r) => a + r._count.id, 0),
			},
			tasks: {
				pending: taskByStatus.pending ?? 0,
				assigned: taskByStatus.assigned ?? 0,
				in_progress: taskByStatus.in_progress ?? 0,
				completed: taskByStatus.completed ?? 0,
				total: taskCounts.reduce((a, r) => a + r._count.id, 0),
			},
			time: {
				totalMsThisMonth: totalTimeMs,
				activeUsers: Object.keys(byUser).length,
			},
			recent: {
				leaves: recentLeaves,
				tasks: recentTasks,
			},
		});
	} catch (err) {
		console.error("[reports:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
