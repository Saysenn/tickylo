import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireUser } from "@/lib/auth/require-user";
import { prisma } from "@/lib/infra/prisma";
import { withOrg } from "@/lib/utils/org-filter";

export async function GET(req: NextRequest) {
	try {
		const user = await requireUser();
		if (!user) return errorResponse("Unauthorized", 401);

		const { searchParams } = req.nextUrl;
		const page = Math.max(1, Number(searchParams.get("page") ?? 1));
		const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));
		const typeFilter = searchParams.get("type") ?? "all";
		const skip = (page - 1) * limit;

		const userId = user.id;
		const orgId = user.app_metadata?.org_id as string | undefined;
		const userWhere = withOrg(orgId, { requested_by: userId });

		const [reopens, transfers, dueDates] = await Promise.all([
			typeFilter !== "all" && typeFilter !== "reopen" ? [] : prisma.reopenRequest.findMany({
				where: userWhere,
				include: { ticket: { select: { id: true, title: true, ticket_type: true, status: true } } },
				orderBy: { created_at: "desc" },
			}),
			typeFilter !== "all" && typeFilter !== "transfer" ? [] : prisma.transferRequest.findMany({
				where: userWhere,
				include: {
					ticket: { select: { id: true, title: true, ticket_type: true, status: true } },
					targetEmployee: { select: { id: true, name: true, email: true } },
				},
				orderBy: { created_at: "desc" },
			}),
			typeFilter !== "all" && typeFilter !== "due_date" ? [] : prisma.dueDateRequest.findMany({
				where: userWhere,
				include: { ticket: { select: { id: true, title: true, ticket_type: true, status: true } } },
				orderBy: { created_at: "desc" },
			}),
		]);

		const unified = [
			...(reopens as any[]).map((r) => ({
				id: r.id,
				type: "reopen" as const,
				ticket_id: r.task_id,
				ticket_title: r.ticket.title,
				ticket_type: r.ticket.ticket_type,
				ticket_status: r.ticket.status,
				status: r.status,
				reason: null,
				created_at: r.created_at.toISOString(),
			})),
			...(transfers as any[]).map((r) => ({
				id: r.id,
				type: "transfer" as const,
				ticket_id: r.task_id,
				ticket_title: r.ticket.title,
				ticket_type: r.ticket.ticket_type,
				ticket_status: r.ticket.status,
				status: r.status,
				reason: null,
				requested_to: r.targetEmployee ?? null,
				created_at: r.created_at.toISOString(),
			})),
			...(dueDates as any[]).map((r) => ({
				id: r.id,
				type: "due_date" as const,
				ticket_id: r.task_id,
				ticket_title: r.ticket.title,
				ticket_type: r.ticket.ticket_type,
				ticket_status: r.ticket.status,
				status: r.status,
				reason: r.reason ?? null,
				requested_date: r.requested_date.toISOString(),
				reject_reason: r.reject_reason ?? null,
				created_at: r.created_at.toISOString(),
			})),
		].sort((a, b) => b.created_at.localeCompare(a.created_at));

		const total = unified.length;
		const data = unified.slice(skip, skip + limit);

		return ok({ data, page, totalPages: Math.ceil(total / limit) || 1, total });
	} catch (err) {
		console.error("[my-requests:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
