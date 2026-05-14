import { prisma } from "@/lib/infra/prisma";
import { ROLES } from "@/configs/rbac.config";
import type { Caller } from "./ticket.service";

const callerOrgId = (c: Caller) => c.app_metadata?.org_id as string | undefined;

function buildWeeklyDays(start: Date, entries: { start_time: Date; end_time: Date | null }[]) {
	const days: { date: string; totalMs: number }[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(start);
		d.setUTCDate(d.getUTCDate() + i);
		days.push({ date: d.toISOString().slice(0, 10), totalMs: 0 });
	}
	for (const e of entries) {
		if (!e.end_time) continue;
		const dateStr = e.start_time.toISOString().slice(0, 10);
		const day = days.find((d) => d.date === dateStr);
		if (day) day.totalMs += e.end_time.getTime() - e.start_time.getTime();
	}
	return days;
}

export async function getDashboard(caller: Caller, dateParam?: string) {
	const isAdmin = caller.app_metadata?.role === ROLES.ADMIN;
	const orgId = callerOrgId(caller);
	const orgFilter = orgId ? { org_id: orgId } : {};

	const todayStr = dateParam ?? new Date().toISOString().slice(0, 10);
	const today = new Date(`${todayStr}T23:59:59.999Z`);
	const sevenDaysAgo = new Date(`${todayStr}T00:00:00.000Z`);
	sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

	if (isAdmin) {
		const [employeeCount, clockedInEntries, ticketCounts, pendingTransfers, pendingReopen, pendingDueDate, recentTickets, weeklyEntries] = await Promise.all([
			prisma.user.count({ where: { role: "employee", ...orgFilter } }),
			prisma.timeEntry.findMany({ where: { ...orgFilter, end_time: null }, include: { user: { select: { id: true, name: true, email: true } } } }),
			prisma.ticket.groupBy({ by: ["status"], where: orgFilter, _count: { id: true } }),
			prisma.transferRequest.count({ where: { status: "pending", ...orgFilter } }),
			prisma.reopenRequest.count({ where: { status: "pending", ...orgFilter } }),
			prisma.dueDateRequest.count({ where: { status: "pending", ...orgFilter } }),
			prisma.ticket.findMany({ where: orgFilter, orderBy: { created_at: "desc" }, take: 5, include: { assignee: { select: { id: true, name: true, email: true } } } }),
			prisma.timeEntry.findMany({ where: { ...orgFilter, start_time: { gte: sevenDaysAgo, lte: today }, end_time: { not: null } }, select: { start_time: true, end_time: true } }),
		]);

		const clockedInUserIds = clockedInEntries.map((e) => e.user_id);
		const activeTasks = clockedInUserIds.length > 0
			? await prisma.ticket.findMany({ where: { user_id: { in: clockedInUserIds }, status: "in_progress" }, select: { user_id: true, title: true }, orderBy: { started_at: "desc" } })
			: [];

		const activeTaskByUser: Record<string, string> = {};
		for (const t of activeTasks) {
			if (t.user_id && !activeTaskByUser[t.user_id]) activeTaskByUser[t.user_id] = t.title;
		}

		const ticketByStatus = Object.fromEntries(ticketCounts.map((r) => [r.status, r._count.id]));

		return {
			employees: { total: employeeCount },
			time: {
				clocked_in_count: clockedInEntries.length,
				clocked_in_users: clockedInEntries.map((e) => ({ id: e.user.id, name: e.user.name, email: e.user.email, start_time: e.start_time.toISOString(), active_task_title: activeTaskByUser[e.user_id] ?? null, entry_title: e.title ?? null })),
			},
			tasks: { pending: ticketByStatus.pending ?? 0, assigned: ticketByStatus.assigned ?? 0, in_progress: ticketByStatus.in_progress ?? 0, completed: ticketByStatus.completed ?? 0 },
			ticket_requests: { pending: pendingTransfers + pendingReopen + pendingDueDate },
			weekly_days: buildWeeklyDays(sevenDaysAgo, weeklyEntries),
			recent_tasks: recentTickets,
		};
	} else {
		const [activeEntry, myTicketCounts, myPendingTransfers, myPendingReopen, weeklyEntries, myTickets] = await Promise.all([
			prisma.timeEntry.findFirst({ where: { user_id: caller.id, end_time: null } }),
			prisma.ticket.groupBy({ by: ["status"], where: { user_id: caller.id }, _count: { id: true } }),
			prisma.transferRequest.count({ where: { requested_by: caller.id, status: "pending" } }),
			prisma.reopenRequest.count({ where: { requested_by: caller.id, status: "pending" } }),
			prisma.timeEntry.findMany({ where: { user_id: caller.id, start_time: { gte: sevenDaysAgo, lte: today }, end_time: { not: null } }, select: { start_time: true, end_time: true } }),
			prisma.ticket.findMany({ where: { user_id: caller.id, status: { in: ["assigned", "in_progress"] } }, orderBy: { updated_at: "desc" }, take: 5 }),
		]);

		const thisWeekMs = weeklyEntries.reduce((acc, e) => acc + (e.end_time ? e.end_time.getTime() - e.start_time.getTime() : 0), 0);
		const ticketByStatus = Object.fromEntries(myTicketCounts.map((r) => [r.status, r._count.id]));

		return {
			time: { this_week_ms: thisWeekMs, active: activeEntry ? { id: activeEntry.id, start_time: activeEntry.start_time.toISOString(), title: activeEntry.title ?? null } : null },
			tasks: { assigned: ticketByStatus.assigned ?? 0, in_progress: ticketByStatus.in_progress ?? 0, completed: ticketByStatus.completed ?? 0 },
			ticket_requests: { pending: myPendingTransfers + myPendingReopen },
			weekly_days: buildWeeklyDays(sevenDaysAgo, weeklyEntries),
			my_tasks: myTickets,
		};
	}
}
