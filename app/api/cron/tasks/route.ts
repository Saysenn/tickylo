import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { createNotification } from "@/lib/utils/create-notification";
import { sendEmail } from "@/lib/email/send";
import { auditLog } from "@/lib/utils/audit";
import { getShiftEndUtc, getShiftStartDayInTz } from "@/services/work-schedule.service";

/**
 * GET /api/cron/tasks
 * Runs hourly via Vercel Cron. Protected by CRON_SECRET.
 *
 * 1. Due date reminders — notifies assignees whose task is due within 24h
 * 2. Priority escalation — bumps overdue tasks to "high"
 * 3. Auto-close — closes timers still running past shift_end in org timezone
 * 4. Auto-close — closes timers exceeding org max_timer_hours cap
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
			link: `/dashboard/tickets/${task.id}`,
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
				link: `/dashboard/tickets/${task.id}`,
			}).catch(() => {});
		}
	}

	// ── 3. Auto-close timers at shift end ────────────────────────────────────
	let autoClosed = 0;

	const schedules = await prisma.workSchedule.findMany();

	for (const schedule of schedules) {
		const shiftEndUtc = getShiftEndUtc(schedule, now);

		// Only act if we're within [shiftEndUtc, shiftEndUtc + 65min]
		const windowEnd = new Date(shiftEndUtc.getTime() + 65 * 60 * 1000);
		if (now < shiftEndUtc || now > windowEnd) continue;

		// Only on working days — use shift start day (overnight shifts belong to the day they started)
		const dayOfWeek = getShiftStartDayInTz(schedule, shiftEndUtc);
		if (!schedule.working_days.includes(dayOfWeek)) continue;

		// Include user shift so we can apply per-user schedule with org fallback
		const openEntries = await prisma.timeEntry.findMany({
			where: { org_id: schedule.org_id, end_time: null },
			include: { user: { select: { email: true, name: true, shift_start: true, shift_end: true } } },
		});

		for (const entry of openEntries) {
			// Per-user shift overrides org schedule; fall back to org if not set
			const effectiveShift = {
				...schedule,
				shift_start: entry.user?.shift_start ?? schedule.shift_start,
				shift_end:   entry.user?.shift_end   ?? schedule.shift_end,
			};
			const userShiftEndUtc = getShiftEndUtc(effectiveShift, now);
			const userWindowEnd   = new Date(userShiftEndUtc.getTime() + 65 * 60 * 1000);

			// Only close if we're in this user's shift-end window
			if (now < userShiftEndUtc || now > userWindowEnd) continue;

			const durationMs = userShiftEndUtc.getTime() - entry.start_time.getTime();
			const shiftMs    = schedule.daily_cap_h * 3600 * 1000;
			const flagged    = durationMs > shiftMs * 1.5;

			await prisma.timeEntry.update({
				where: { id: entry.id },
				data: { end_time: userShiftEndUtc, auto_closed: true, flagged },
			});

			auditLog({
				org_id:      schedule.org_id,
				actor_id:    "system",
				actor_role:  "system",
				action:      "UPDATE",
				entity_type: "time_entry",
				entity_id:   entry.id,
				before: { end_time: null },
				after: {
					end_time:    userShiftEndUtc.toISOString(),
					auto_closed: true,
					flagged,
					reason:      "shift_end_auto_close",
					shift_source: entry.user?.shift_end ? "user" : "org",
				},
			});

			await createNotification({
				user_id: entry.user_id,
				type:    "timer_auto_closed",
				title:   "Timer auto-closed",
				body:    "Your timer was automatically stopped at the end of your shift.",
				link:    `/dashboard/time-tracker`,
			}).catch(() => {});

			if (entry.user?.email) {
				await sendEmail({
					to:      entry.user.email,
					subject: "Your timer was auto-closed",
					html: `
						<p>Hi ${entry.user.name ?? "there"},</p>
						<p>Your active timer was automatically stopped at the end of your shift (<strong>${userShiftEndUtc.toUTCString()}</strong>).</p>
						${flagged ? `<p><strong>Note:</strong> This entry has been flagged for review because the duration exceeded the expected limit. Your admin may follow up.</p>` : ""}
						<p>You can view your time logs <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://tickworks.app"}/dashboard/time-tracker">here</a>.</p>
					`,
				}).catch(() => {});
			}

			autoClosed++;
		}
	}

	// ── 4. Auto-close timers exceeding max_timer_hours ────────────────────────
	const schedulesWithCap = schedules.filter((s) => s.max_timer_hours != null);

	for (const schedule of schedulesWithCap) {
		const maxMs   = schedule.max_timer_hours! * 3600 * 1000;
		const cutoff  = new Date(now.getTime() - maxMs);

		const overdueEntries = await prisma.timeEntry.findMany({
			where: {
				org_id:     schedule.org_id,
				end_time:   null,
				start_time: { lte: cutoff },
			},
			include: { user: { select: { email: true, name: true } } },
		});

		for (const entry of overdueEntries) {
			await prisma.timeEntry.update({
				where: { id: entry.id },
				data: { end_time: now, auto_closed: true, flagged: true },
			});

			// Audit log — system actor
			auditLog({
				org_id:      schedule.org_id,
				actor_id:    "system",
				actor_role:  "system",
				action:      "UPDATE",
				entity_type: "time_entry",
				entity_id:   entry.id,
				before: { end_time: null },
				after: {
					end_time:    now.toISOString(),
					auto_closed: true,
					flagged:     true,
					reason:      "max_timer_hours_exceeded",
					max_hours:   schedule.max_timer_hours,
				},
			});

			// In-app notification
			await createNotification({
				user_id: entry.user_id,
				type:    "timer_auto_closed",
				title:   "Timer auto-closed",
				body:    `Your timer ran for more than ${schedule.max_timer_hours}h and was automatically stopped.`,
				link:    `/dashboard/time-tracker`,
			}).catch(() => {});

			// Email notification (no-op if RESEND_API_KEY not set)
			if (entry.user?.email) {
				await sendEmail({
					to:      entry.user.email,
					subject: "Timer auto-closed — duration limit reached",
					html: `
						<p>Hi ${entry.user.name ?? "there"},</p>
						<p>Your active timer has been automatically stopped because it exceeded the <strong>${schedule.max_timer_hours}-hour limit</strong> set by your organization.</p>
						<p>This entry has been <strong>flagged for review</strong> by your admin.</p>
						<p>You can view your time logs <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://tickworks.app"}/dashboard/time-tracker">here</a>.</p>
					`,
				}).catch(() => {});
			}

			autoClosed++;
		}
	}

	return ok({
		reminders_sent: dueSoonTasks.length,
		escalated:      overdueTasks.length,
		auto_closed:    autoClosed,
	});
}
