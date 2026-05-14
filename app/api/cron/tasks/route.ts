import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { prisma } from "@/lib/infra/prisma";
import { createNotification } from "@/lib/utils/create-notification";

/**
 * GET /api/cron/tasks
 * Protected cron job — call daily at 08:00 via Vercel Cron or external scheduler.
 * Requires: Authorization: Bearer <CRON_SECRET>
 *
 * Does two things:
 * 1. Due date reminders — notifies assignees whose task is due within 24h
 * 2. Priority escalation — bumps overdue tasks to "high" + posts system comment
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

	return ok({
		reminders_sent: dueSoonTasks.length,
		escalated: overdueTasks.length,
	});
}
