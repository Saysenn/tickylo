import { prisma } from "@/lib/infra/prisma";
import type { Caller } from "./ticket.service";

const callerOrgId = (c: Caller) => c.app_metadata?.org_id as string | undefined;

// ─── Performance ──────────────────────────────────────────────────────────────

export async function getPerformance(admin: Caller, from?: string, to?: string) {
	const orgId = callerOrgId(admin);
	const orgFilter = orgId ? { org_id: orgId } : {};

	const fromDate = from
		? new Date(from + "T00:00:00")
		: new Date(new Date().getFullYear(), new Date().getMonth(), 1);
	const toDate = to ? new Date(to + "T23:59:59.999") : new Date();

	const employees = await prisma.user.findMany({
		where: { role: "employee", ...orgFilter },
		select: { id: true, name: true, email: true },
		orderBy: { name: "asc" },
	});

	if (employees.length === 0) return [];

	const userIds = employees.map((e) => e.id);

	const [tickets, timeEntries] = await Promise.all([
		prisma.ticket.findMany({
			where: { ...orgFilter, user_id: { in: userIds }, created_at: { gte: fromDate, lte: toDate } },
			select: { user_id: true, status: true, started_at: true, completed_at: true },
		}),
		prisma.timeEntry.findMany({
			where: { user_id: { in: userIds }, start_time: { gte: fromDate, lte: toDate }, end_time: { not: null } },
			select: { user_id: true, start_time: true, end_time: true },
		}),
	]);

	return employees.map((emp) => {
		const empTickets = tickets.filter((t) => t.user_id === emp.id);
		const empTime = timeEntries.filter((t) => t.user_id === emp.id);

		const tasks_completed = empTickets.filter((t) => t.status === "completed").length;
		const tasks_in_progress = empTickets.filter((t) => t.status === "in_progress").length;
		const tasks_total = empTickets.length;
		const completion_rate = tasks_total > 0 ? tasks_completed / tasks_total : 0;

		const completedWithDuration = empTickets.filter((t) => t.status === "completed" && t.started_at && t.completed_at);
		const avg_days_to_complete =
			completedWithDuration.length > 0
				? completedWithDuration.reduce((acc, t) => acc + (t.completed_at!.getTime() - t.started_at!.getTime()) / (1000 * 60 * 60 * 24), 0) / completedWithDuration.length
				: 0;

		const time_this_period_ms = empTime.reduce((acc, e) => acc + (e.end_time ? e.end_time.getTime() - e.start_time.getTime() : 0), 0);

		return {
			user: { id: emp.id, name: emp.name, email: emp.email },
			tasks_completed,
			tasks_in_progress,
			tasks_total,
			completion_rate: Math.round(completion_rate * 100) / 100,
			avg_days_to_complete: Math.round(avg_days_to_complete * 10) / 10,
			time_this_period_ms,
		};
	});
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(admin: Caller) {
	const orgId = callerOrgId(admin);
	const orgFilter = orgId ? { org_id: orgId } : {};
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const [leaveCounts, ticketCounts, timeThisMonth, recentLeaves, recentTickets] = await Promise.all([
		prisma.leave.groupBy({ by: ["status"], where: orgFilter, _count: { id: true } }),
		prisma.ticket.groupBy({ by: ["status"], where: orgFilter, _count: { id: true } }),
		prisma.timeEntry.findMany({ where: { ...orgFilter, start_time: { gte: startOfMonth }, end_time: { not: null } }, select: { start_time: true, end_time: true, user_id: true } }),
		prisma.leave.findMany({ where: orgFilter, orderBy: { created_at: "desc" }, take: 5, include: { user: { select: { id: true, name: true, email: true } } } }),
		prisma.ticket.findMany({ where: orgFilter, orderBy: { created_at: "desc" }, take: 5, include: { assignee: { select: { id: true, name: true, email: true } } } }),
	]);

	const totalTimeMs = timeThisMonth.reduce((acc, e) => acc + (e.end_time ? e.end_time.getTime() - e.start_time.getTime() : 0), 0);
	const byUser: Record<string, number> = {};
	for (const e of timeThisMonth) {
		if (!e.end_time) continue;
		byUser[e.user_id] = (byUser[e.user_id] ?? 0) + (e.end_time.getTime() - e.start_time.getTime());
	}

	const leaveByStatus = Object.fromEntries(leaveCounts.map((r) => [r.status, r._count.id]));
	const ticketByStatus = Object.fromEntries(ticketCounts.map((r) => [r.status, r._count.id]));

	return {
		leaves: { pending: leaveByStatus.pending ?? 0, approved: leaveByStatus.approved ?? 0, rejected: leaveByStatus.rejected ?? 0, cancelled: leaveByStatus.cancelled ?? 0, total: leaveCounts.reduce((a, r) => a + r._count.id, 0) },
		tasks: { pending: ticketByStatus.pending ?? 0, assigned: ticketByStatus.assigned ?? 0, in_progress: ticketByStatus.in_progress ?? 0, completed: ticketByStatus.completed ?? 0, total: ticketCounts.reduce((a, r) => a + r._count.id, 0) },
		time: { totalMsThisMonth: totalTimeMs, activeUsers: Object.keys(byUser).length },
		recent: { leaves: recentLeaves, tasks: recentTickets },
	};
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLogsFilters {
	action?: string;
	entity_type?: string;
	actor_id?: string;
	from?: string;
	to?: string;
	page?: number;
	limit?: number;
}

export async function getAuditLogs(caller: Caller, filters: AuditLogsFilters = {}) {
	const orgId = callerOrgId(caller);
	const orgFilter = orgId ? { org_id: orgId } : {};

	const page = Math.max(1, filters.page ?? 1);
	const limit = Math.min(100, Math.max(1, filters.limit ?? 20));
	const skip = (page - 1) * limit;

	const where: Record<string, unknown> = { ...orgFilter };
	if (filters.action) where.action = filters.action;
	if (filters.entity_type) where.entity_type = filters.entity_type;
	if (filters.actor_id) where.actor_id = filters.actor_id;
	if (filters.from || filters.to) {
		where.created_at = {
			...(filters.from ? { gte: new Date(filters.from + "T00:00:00") } : {}),
			...(filters.to ? { lte: new Date(filters.to + "T23:59:59.999") } : {}),
		};
	}

	const [logs, total] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			orderBy: { created_at: "desc" },
			skip,
			take: limit,
		}),
		prisma.auditLog.count({ where }),
	]);

	const actorIds = [...new Set(logs.map((l) => l.actor_id))];
	const actors = await prisma.user.findMany({
		where: { id: { in: actorIds } },
		select: { id: true, name: true, email: true },
	});
	const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

	return {
		data: logs.map((l) => ({ ...l, actor: actorMap[l.actor_id] ?? null })),
		total,
		page,
		totalPages: Math.ceil(total / limit),
	};
}
