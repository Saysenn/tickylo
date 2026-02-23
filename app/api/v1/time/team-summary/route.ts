import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";

/**
 * GET /api/v1/time/team-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&tz_offset=minutes
 * Admin only. Returns per-employee time stats for the given date range, using client-local timezone.
 */
export async function GET(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);

		const { searchParams } = new URL(request.url);
		const fromParam = searchParams.get("from");
		const toParam = searchParams.get("to");
		const tzOffsetParam = searchParams.get("tz_offset"); // in minutes
		const tzOffset = tzOffsetParam ? parseInt(tzOffsetParam, 10) : 0;

		// "local date midnight" → UTC timestamp (see summary route for formula derivation)
		const localMidnightUTC = (dateStr: string): number =>
			new Date(dateStr + "T00:00:00Z").getTime() + tzOffset * 60000;

		// UTC timestamp → local "YYYY-MM-DD"
		const toLocalDateKey = (date: Date): string =>
			new Date(date.getTime() - tzOffset * 60000).toISOString().slice(0, 10);

		let start: Date;
		let end: Date;

		if (fromParam && toParam) {
			start = new Date(localMidnightUTC(fromParam));
			end = new Date(localMidnightUTC(toParam) + 24 * 60 * 60 * 1000 - 1);
		} else {
			// Default: last 7 days in the client's local timezone
			const nowLocalMs = Date.now() - tzOffset * 60000;
			const todayKey = new Date(nowLocalMs).toISOString().slice(0, 10);
			end = new Date(localMidnightUTC(todayKey) + 24 * 60 * 60 * 1000 - 1);
			start = new Date(localMidnightUTC(todayKey) - 6 * 24 * 60 * 60 * 1000);
		}

		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			return errorResponse("Invalid date range", 400);
		}

		// Fetch all users in the system
		const users = await prisma.user.findMany({
			select: { id: true, name: true, email: true },
		});

		// Fetch all completed time entries in the range
		const entries = await prisma.timeEntry.findMany({
			where: {
				start_time: { gte: start },
				end_time: { lte: end, not: null },
			},
			select: {
				user_id: true,
				start_time: true,
				end_time: true,
			},
		});

		// Aggregate per user by local day
		const stats: Record<string, { totalMs: number; dates: Set<string> }> = {};
		for (const entry of entries) {
			if (!entry.end_time) continue;
			const ms = entry.end_time.getTime() - entry.start_time.getTime();
			const dateKey = toLocalDateKey(entry.start_time);
			if (!stats[entry.user_id]) {
				stats[entry.user_id] = { totalMs: 0, dates: new Set() };
			}
			stats[entry.user_id].totalMs += ms;
			stats[entry.user_id].dates.add(dateKey);
		}

		const employees = users
			.map((u) => ({
				id: u.id,
				name: u.name,
				email: u.email,
				totalMs: stats[u.id]?.totalMs ?? 0,
				daysWorked: stats[u.id]?.dates.size ?? 0,
			}))
			.sort((a, b) => b.totalMs - a.totalMs);

		const totalTeamMs = employees.reduce((sum, e) => sum + e.totalMs, 0);
		const activeCount = employees.filter((e) => e.totalMs > 0).length;

		return ok({
			from: fromParam ?? start.toISOString().slice(0, 10),
			to: toParam ?? end.toISOString().slice(0, 10),
			totalTeamMs,
			activeCount,
			employees,
		});
	} catch (err) {
		console.error("[time:team-summary:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
