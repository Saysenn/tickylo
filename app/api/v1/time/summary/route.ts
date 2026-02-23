import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { errorResponse, ok } from "@/lib/utils/response";
import { ROLES } from "@/configs/rbac.config";

/**
 * GET /api/v1/time/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&tz_offset=minutes
 * Returns time entries grouped by day with totals for the given range, in client-local time.
 * Defaults to last 7 days if no params provided.
 */
export async function GET(request: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = new URL(request.url);
		const fromParam = searchParams.get("from");
		const toParam = searchParams.get("to");
		const tzOffsetParam = searchParams.get("tz_offset"); // in minutes
		const tzOffset = tzOffsetParam ? parseInt(tzOffsetParam, 10) : 0;

		const now = new Date();

		// Convert local date string to UTC for DB query
		const localDateToUTC = (dateStr: string) => {
			const d = new Date(dateStr + "T00:00:00");
			d.setMinutes(d.getMinutes() - tzOffset);
			return d;
		};

		let start: Date;
		let end: Date;

		if (fromParam && toParam) {
			start = localDateToUTC(fromParam);
			end = localDateToUTC(toParam);
			end.setHours(23, 59, 59, 999);
		} else {
			// Default last 7 days
			const nowLocal = new Date(now);
			nowLocal.setMinutes(nowLocal.getMinutes() - tzOffset);

			start = new Date(nowLocal);
			start.setDate(nowLocal.getDate() - 6);
			start.setHours(0, 0, 0, 0);

			end = new Date(nowLocal);
			end.setHours(23, 59, 59, 999);
		}

		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			return errorResponse("Invalid date range", 400);
		}

		if (end < start)
			return errorResponse("End date must be after start date", 400);

		const isAdmin = user.app_metadata?.role === ROLES.ADMIN;
		const userIdParam = searchParams.get("user_id");
		const targetUserId = isAdmin && userIdParam ? userIdParam : user.id;

		const entries = await prisma.timeEntry.findMany({
			where: {
				user_id: targetUserId,
				start_time: { gte: start },
				end_time: { lte: end, not: null },
			},
			orderBy: { start_time: "asc" },
		});

		// Helper to convert UTC entry to local date key
		const toLocalDateKey = (date: Date) => {
			const local = new Date(date);
			local.setMinutes(local.getMinutes() + tzOffset);
			return local.toISOString().slice(0, 10);
		};

		// Group entries by local day
		const byDay: Record<string, number> = {};
		for (const entry of entries) {
			if (!entry.end_time) continue;
			const dateKey = toLocalDateKey(entry.start_time);
			const ms = entry.end_time.getTime() - entry.start_time.getTime();
			byDay[dateKey] = (byDay[dateKey] ?? 0) + ms;
		}

		// Build full date range so gaps show as 0
		const days: { date: string; totalMs: number }[] = [];
		const cursor = new Date(start);
		cursor.setMinutes(cursor.getMinutes() + tzOffset); // shift to local
		cursor.setHours(0, 0, 0, 0);

		const endDay = new Date(end);
		endDay.setMinutes(endDay.getMinutes() + tzOffset); // shift to local
		endDay.setHours(0, 0, 0, 0);

		while (cursor <= endDay) {
			const key = cursor.toISOString().slice(0, 10);
			days.push({ date: key, totalMs: byDay[key] ?? 0 });
			cursor.setDate(cursor.getDate() + 1);
		}

		const totalMs = days.reduce((acc, d) => acc + d.totalMs, 0);
		const daysWorked = days.filter((d) => d.totalMs > 0).length;

		return ok({
			from: fromParam ?? start.toISOString().slice(0, 10),
			to: toParam ?? end.toISOString().slice(0, 10),
			totalMs,
			daysWorked,
			days,
		});
	} catch (err) {
		console.error("[time:summary:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
