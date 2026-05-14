import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { createNotification } from "@/lib/utils/create-notification";
import { getShiftEndUtc, getDayOfWeekInTz } from "@/services/work-schedule.service";

/**
 * GET /api/cron/tasks
 * Runs hourly via Vercel Cron. Protected by CRON_SECRET.
 *
 * 1. Due date reminders — notifies assignees whose task is due within 24h
 * 2. Priority escalation — bumps overdue tasks to "high"
 * 3. Auto-close — closes timers still running past shift_end in org timezone
 */
export async function GET(request: NextRequest) {
	const auth = request.headers.get("authorization");
	const secret = process.env.CRON_SECRET;
	if (!secret || auth !== `Bearer ${secret}`) {
		return errorResponse("Unauthorized", 401);
	}

	const now = new Date();
	const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

	// ── 1. Due date reminders ─────────────────────────────────────────────────
	const dueSoonTasks = await prisma.ticket.findMany({
		where: {
			status: { not: "completed" },
			user_id: { not: null },
			due_date: { gte: now, lte: in24h },
		},
		select: { id: true, title: true, user_id: true, due_date: true },
	});

	for (const task of dueSoonTasks) {
		await createNotification({
			user_id: task.user_id!,
			type: "due_date_reminder",
			title: "Task due soon",
			body: `"${task.title}" is due within 24 hours.`,
			link: `/dashboard/tasks/${task.id}`,
		}).catch(() => {});
	}

	// ── 2. Priority escalation ────────────────────────────────────────────────
	const overdueTasks = await prisma.ticket.findMany({
		where: {
			status: { not: "completed" },
			due_date: { lt: now },
			priority: { not: "high" },
		},
		select: { id: true, title: true, user_id: true },
	});

	for (const task of overdueTasks) {
		await prisma.$transaction([
			prisma.ticket.update({
				where: { id: task.id },
				data: { priority: "high" },
			}),
			prisma.ticketComment.create({
				data: {
					task_id: task.id,
					user_id: null,
					body: "Priority escalated to High — task is overdue.",
					is_system: true,
				},
			}),
		]);

		if (task.user_id) {
			await createNotification({
				user_id: task.user_id,
				type: "priority_escalated",
				title: "Task priority escalated",
				body: `"${task.title}" is overdue. Priority bumped to High.`,
				link: `/dashboard/tasks/${task.id}`,
			}).catch(() => {});
		}
	}

	// ── 3. Auto-close runaway timers ──────────────────────────────────────────
	let autoClosed = 0;

	const schedules = await prisma.workSchedule.findMany();

	for (const schedule of schedules) {
		const shiftEndUtc = getShiftEndUtc(schedule, now);

		// Only act if we're within [shiftEndUtc, shiftEndUtc + 65min]
		const windowEnd = new Date(shiftEndUtc.getTime() + 65 * 60 * 1000);
		if (now < shiftEndUtc || now > windowEnd) continue;

		// Only on working days
		const dayOfWeek = getDayOfWeekInTz(shiftEndUtc, schedule.timezone);
		if (!schedule.working_days.includes(dayOfWeek)) continue;

		// Find all open entries for this org
		const openEntries = await prisma.timeEntry.findMany({
			where: { org_id: schedule.org_id, end_time: null },
		});

		for (const entry of openEntries) {
			const durationMs = shiftEndUtc.getTime() - entry.start_time.getTime();
			const shiftMs = schedule.daily_cap_h * 3600 * 1000;
			const flagged = durationMs > shiftMs * 1.5;

			await prisma.timeEntry.update({
				where: { id: entry.id },
				data: {
					end_time: shiftEndUtc,
					auto_closed: true,
					flagged,
				},
			});

			// Notify the employee their timer was auto-closed
			await createNotification({
				user_id: entry.user_id,
				type: "timer_auto_closed",
				title: "Timer auto-closed",
				body: "Your timer was automatically stopped at the end of your shift.",
				link: `/dashboard/time-tracker`,
			}).catch(() => {});

			autoClosed++;
		}
	}

	return ok({
		reminders_sent: dueSoonTasks.length,
		escalated: overdueTasks.length,
		auto_closed: autoClosed,
	});
}
