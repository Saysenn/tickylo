import { NextRequest } from "next/server";
import { ok, errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";

export async function GET(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "reports");
		if (gate) return gate;

		const { searchParams } = new URL(request.url);
		const type = searchParams.get("type") as "client" | "tally" | null;
		const clientId = searchParams.get("client_id") ?? undefined;
		const dateFrom = searchParams.get("date_from");
		const dateTo = searchParams.get("date_to");
		const tzOffset = parseInt(searchParams.get("tz_offset") ?? "0", 10) || 0;

		if (!type || !dateFrom || !dateTo) {
			return errorResponse("Missing required params: type, date_from, date_to", 400);
		}
		if (type === "client" && !clientId) {
			return errorResponse("client_id is required when type=client", 400);
		}

		// Build UTC date range accounting for tz_offset (minutes)
		const fromDate = new Date(`${dateFrom}T00:00:00.000Z`);
		fromDate.setMinutes(fromDate.getMinutes() - tzOffset);
		const toDate = new Date(`${dateTo}T23:59:59.999Z`);
		toDate.setMinutes(toDate.getMinutes() - tzOffset);

		const whereClause: any = {
			org_id: orgId,
			status: "completed",
			completed_at: { gte: fromDate, lte: toDate },
		};
		if (type === "client") whereClause.client_id = clientId;

		const tickets = await prisma.ticket.findMany({
			where: whereClause,
			include: {
				assignee: { select: { name: true, email: true } },
				client: { select: { id: true, name: true, email: true, hourly_rate: true, discount_percent: true, currency: true, deleted_at: true } },
				timeEntries: { select: { start_time: true, end_time: true } },
			},
			orderBy: { completed_at: "asc" },
		});

		// Build line items
		const lineItems = tickets.map((ticket) => {
			const totalMs = ticket.timeEntries.reduce((sum, te) => {
				if (!te.end_time) return sum;
				return sum + (te.end_time.getTime() - te.start_time.getTime());
			}, 0);
			const billableHours = totalMs / 3600000;
			const rate = ticket.client?.hourly_rate ?? 0;
			const subtotal = billableHours * rate;
			const discountPct = ticket.client?.discount_percent ?? 0;
			const discountAmount = subtotal * discountPct / 100;
			const netTotal = subtotal - discountAmount;
			const currency = ticket.client?.currency ?? "USD";

			return {
				ticket_id: ticket.id,
				ticket_number: ticket.id.slice(-6).toUpperCase(),
				title: ticket.title,
				employee_name: ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned",
				employee_email: ticket.assignee?.email ?? "",
				completed_at: ticket.completed_at,
				billable_hours: Math.round(billableHours * 100) / 100,
				total_ms: totalMs,
				client_id: ticket.client?.id ?? null,
				client_name: ticket.client?.name ?? ticket.client_name ?? "No Client",
				client_email: ticket.client?.email ?? ticket.client_email ?? null,
				client_deactivated: !!ticket.client?.deleted_at,
				rate,
				subtotal: Math.round(subtotal * 100) / 100,
				discount_percent: discountPct,
				discount_amount: Math.round(discountAmount * 100) / 100,
				net_total: Math.round(netTotal * 100) / 100,
				currency,
			};
		});

		// Build per-client summary
		const summaryMap = new Map<string, {
			client_id: string | null; client_name: string; client_email: string | null;
			client_deactivated: boolean; currency: string;
			ticket_count: number; total_billable_hours: number;
			total_billed: number; total_discount: number; net_payable: number;
		}>();

		for (const item of lineItems) {
			const key = item.client_id ?? "__no_client__";
			if (!summaryMap.has(key)) {
				summaryMap.set(key, {
					client_id: item.client_id,
					client_name: item.client_name,
					client_email: item.client_email,
					client_deactivated: item.client_deactivated,
					currency: item.currency,
					ticket_count: 0,
					total_billable_hours: 0,
					total_billed: 0,
					total_discount: 0,
					net_payable: 0,
				});
			}
			const s = summaryMap.get(key)!;
			s.ticket_count++;
			s.total_billable_hours = Math.round((s.total_billable_hours + item.billable_hours) * 100) / 100;
			s.total_billed = Math.round((s.total_billed + item.subtotal) * 100) / 100;
			s.total_discount = Math.round((s.total_discount + item.discount_amount) * 100) / 100;
			s.net_payable = Math.round((s.net_payable + item.net_total) * 100) / 100;
		}

		return ok({
			type,
			date_from: dateFrom,
			date_to: dateTo,
			line_items: lineItems,
			summary: [...summaryMap.values()],
		});
	} catch (err) {
		console.error("[reports/invoice:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
