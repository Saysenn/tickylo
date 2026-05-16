import { prisma } from "@/lib/infra/prisma";
import type { WorkSchedule } from "@/lib/generated/prisma";

export type { WorkSchedule };

export interface WorkScheduleInput {
	timezone: string;
	shift_start: string;
	shift_end: string;
	working_days: number[];
	daily_cap_h: number;
	max_timer_hours: number | null;
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

/** Returns true when shift_end crosses midnight (e.g. start=20:00 end=05:00). */
export function isOvernightShift(schedule: WorkSchedule): boolean {
	return schedule.shift_end <= schedule.shift_start;
}

/**
 * Given a schedule and a UTC "now", compute the shift_end moment in UTC.
 * For overnight shifts (shift_end < shift_start) the end falls on the next
 * calendar day in the org's timezone, so we add one day to the base date.
 */
export function getShiftEndUtc(schedule: WorkSchedule, now: Date = new Date()): Date {
	const overnight = isOvernightShift(schedule);

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

	const [h, m] = schedule.shift_end.split(":").map(Number);
	const baseDate = new Date(`${localDate}T00:00:00`);

	// For overnight shifts the end time is on the *next* calendar day
	if (overnight) baseDate.setDate(baseDate.getDate() + 1);

	const localShiftEnd = new Date(
		baseDate.getFullYear() + "-" +
		String(baseDate.getMonth() + 1).padStart(2, "0") + "-" +
		String(baseDate.getDate()).padStart(2, "0") + "T" +
		String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":00",
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

/**
 * Returns the day-of-week that the shift *started* on.
 * For overnight shifts the shift started the day before shift_end.
 */
export function getShiftStartDayInTz(schedule: WorkSchedule, shiftEndUtc: Date): number {
	if (!isOvernightShift(schedule)) {
		return getDayOfWeekInTz(shiftEndUtc, schedule.timezone);
	}
	// Shift started one calendar day before shift_end
	const dayBefore = new Date(shiftEndUtc.getTime() - 24 * 60 * 60 * 1000);
	return getDayOfWeekInTz(dayBefore, schedule.timezone);
}
