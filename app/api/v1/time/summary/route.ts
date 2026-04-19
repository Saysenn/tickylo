import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";

/**
 * GET /api/v1/time/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&tz_offset=<minutes>
 *
 * tz_offset = client's Date.getTimezoneOffset() (UTC − local, in minutes).
 * e.g. UTC+8 → tz_offset = -480  |  UTC-5 → tz_offset = 300
 *
 * Converts local date boundaries to UTC, queries the DB, then groups
 * results by local date so day labels match what the user sees.
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);
		const fromParam = searchParams.get("from");
		const toParam = searchParams.get("to");
		// getTimezoneOffset() = UTC − local (minutes). UTC+8 → -480, UTC-5 → 300
		const tzOffset = parseInt(searchParams.get("tz_offset") ?? "0", 10);

		// "local date midnight" → UTC timestamp.
		// Using "T00:00:00Z" gives a stable UTC midnight reference regardless of
		// the server's local timezone, then we shift by tzOffset.
		// UTC+8 example: "2026-02-23T00:00Z" + (-480 * 60000) = 2026-02-22T16:00Z ✓
		const localMidnightUTC = (dateStr: string): number =>
			new Date(dateStr + "T00:00:00Z").getTime() + tzOffset * 60000;

		// UTC timestamp → local "YYYY-MM-DD"
		// UTC+8 example: 2026-02-22T19:00Z → subtract -480min → 2026-02-23T03:00Z → "2026-02-23" ✓
		const toLocalDateKey = (date: Date): string =>
			new Date(date.getTime() - tzOffset * 60000).toISOString().slice(0, 10);

		let start: Date;
		let end: Date;
		let resolvedFrom: string;
		let resolvedTo: string;

		if (fromParam && toParam) {
			start = new Date(localMidnightUTC(fromParam));
			end = new Date(localMidnightUTC(toParam) + 24 * 60 * 60 * 1000 - 1);
			resolvedFrom = fromParam;
			resolvedTo = toParam;
		} else {
			// Default: last 7 days in the client's local timezone
			const nowLocalMs = Date.now() - tzOffset * 60000;
			const todayKey = new Date(nowLocalMs).toISOString().slice(0, 10);
			end = new Date(localMidnightUTC(todayKey) + 24 * 60 * 60 * 1000 - 1);
			start = new Date(localMidnightUTC(todayKey) - 6 * 24 * 60 * 60 * 1000);
			resolvedFrom = toLocalDateKey(start);
			resolvedTo = todayKey;
		}

		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			return errorResponse("Invalid date range", 400);
		}
		if (end < start) return errorResponse("End date must be after start date", 400);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		const userIdParam = searchParams.get("user_id");
		const targetUserId = isAdmin && userIdParam ? userIdParam : user.id;

		const orgId = user.app_metadata?.org_id as string | undefined;
		const entries = await prisma.timeEntry.findMany({
			where: {
				...(orgId ? { org_id: orgId } : {}),
				user_id: targetUserId,
				start_time: { gte: start },
				end_time: { lte: end, not: null },
			},
			orderBy: { start_time: "asc" },
		});

		// Group by LOCAL day
		const byDay: Record<string, number> = {};
		for (const entry of entries) {
			if (!entry.end_time) continue;
			const dateKey = toLocalDateKey(entry.start_time);
			const ms = entry.end_time.getTime() - entry.start_time.getTime();
			byDay[dateKey] = (byDay[dateKey] ?? 0) + ms;
		}

		// Build full day range so gaps show as 0
		const days: { date: string; totalMs: number }[] = [];
		const cursor = new Date(localMidnightUTC(resolvedFrom));
		const endLoopMs = localMidnightUTC(resolvedTo) + 24 * 60 * 60 * 1000;

		while (cursor.getTime() < endLoopMs) {
			const key = toLocalDateKey(cursor);
			days.push({ date: key, totalMs: byDay[key] ?? 0 });
			cursor.setDate(cursor.getDate() + 1);
		}

		const totalMs = days.reduce((acc, d) => acc + d.totalMs, 0);
		const daysWorked = days.filter((d) => d.totalMs > 0).length;

		return ok({ from: resolvedFrom, to: resolvedTo, totalMs, daysWorked, days });
	} catch (err) {
		console.error("[time:summary:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
