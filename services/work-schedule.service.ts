import { prisma } from "@/lib/infra/prisma";
import type { WorkSchedule } from "@/lib/generated/prisma";

export type { WorkSchedule };

export interface WorkScheduleInput {
	timezone: string;
	shift_start: string;
	shift_end: string;
	working_days: number[];
	daily_cap_h: number;
}

export async function getWorkSchedule(orgId: string): Promise<WorkSchedule | null> {
	return prisma.workSchedule.findUnique({ where: { org_id: orgId } });
}

export async function upsertWorkSchedule(orgId: string, data: WorkScheduleInput): Promise<WorkSchedule> {
	return prisma.workSchedule.upsert({
		where: { org_id: orgId },
		create: { org_id: orgId, ...data },
		update: data,
	});
}

/**
 * Given a schedule and a UTC "now", compute the shift_end moment in UTC for today
 * in the org's timezone — without any external library.
 */
export function getShiftEndUtc(schedule: WorkSchedule, now: Date = new Date()): Date {
	// Get today's date string in org timezone (YYYY-MM-DD)
	const localDate = new Intl.DateTimeFormat("en-CA", {
		timeZone: schedule.timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);

	// Compute UTC offset by comparing wall-clock time in org tz to UTC
	const localWall = new Date(now.toLocaleString("en-US", { timeZone: schedule.timezone }));
	const offsetMs = now.getTime() - localWall.getTime();

	// Build shift_end as a local datetime string, then shift to UTC
	const [h, m] = schedule.shift_end.split(":").map(Number);
	const localShiftEnd = new Date(
		`${localDate}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`,
	);
	return new Date(localShiftEnd.getTime() + offsetMs);
}

/**
 * Returns the day-of-week (0=Sun … 6=Sat) in the org's timezone for a given UTC time.
 */
export function getDayOfWeekInTz(date: Date, timezone: string): number {
	const dayStr = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		weekday: "short",
	}).format(date);
	return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(dayStr);
}
