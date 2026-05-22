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
		const type      = searchParams.get("type") as "client" | "tally" | null;
		const clientId  = searchParams.get("client_id") ?? undefined;
		const dateFrom  = searchParams.get("date_from");
		const dateTo    = searchParams.get("date_to");
		const tzOffset  = parseInt(searchParams.get("tz_offset") ?? "0", 10) || 0;

		if (!type || !dateFrom || !dateTo)
			return errorResponse("Missing required params: type, date_from, date_to", 400);
		if (type === "client" && !clientId)
			return errorResponse("client_id is required when type=client", 400);

		const fromDate = new Date(`${dateFrom}T00:00:00.000Z`);
		fromDate.setMinutes(fromDate.getMinutes() - tzOffset);
		const toDate = new Date(`${dateTo}T23:59:59.999Z`);
		toDate.setMinutes(toDate.getMinutes() - tzOffset);

		const whereClause: any = {
			org_id: orgId,
			status: "completed",
			completed_at: { gte: fromDate, lte: toDate },
			// Only include tickets linked to a real client
			client_id: type === "client" ? clientId : { not: null },
		};

		const tickets = await prisma.ticket.findMany({
			where: whereClause,
			include: {
				assignee: { select: { name: true, email: true } },
				client: {
					select: {
						id: true, name: true, email: true,
						rate_type: true, hourly_rate: true,
						discount_percent: true, currency: true,
						billing_cycle: true, payment_terms: true,
						deleted_at: true,
					},
				},
				timeEntries: { select: { start_time: true, end_time: true } },
			},
			orderBy: { completed_at: "asc" },
		});

		// Exclude tickets where client has rate_type = "none"
		const billableTickets = tickets.filter((t) => t.client?.rate_type !== "none");

		const lineItems = billableTickets.map((ticket) => {
			const totalMs = ticket.timeEntries.reduce((sum, te) => {
				if (!te.end_time) return sum;
				return sum + (te.end_time.getTime() - te.start_time.getTime());
			}, 0);

			const billableHours = Math.round(
				(ticket.billable_hours != null ? ticket.billable_hours : totalMs / 3600000) * 100
			) / 100;

			const rateType     = ticket.client?.rate_type ?? "hourly";
			const rate         = ticket.client?.hourly_rate ?? 0;
			const subtotal     = Math.round((rateType === "fixed" ? rate : billableHours * rate) * 100) / 100;
			const discountPct  = ticket.client?.discount_percent ?? 0;
			const discountAmt  = Math.round(subtotal * discountPct / 100 * 100) / 100;
			const netTotal     = Math.round((subtotal - discountAmt) * 100) / 100;
			const currency     = ticket.client?.currency ?? "USD";

			return {
				ticket_id:          ticket.id,
				ticket_number:      ticket.id.slice(-6).toUpperCase(),
				title:              ticket.title,
				employee_name:      ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned",
				completed_at:       ticket.completed_at,
				rate_type:          rateType,
				billable_hours:     billableHours,
				rate,
				subtotal,
				discount_percent:   discountPct,
				discount_amount:    discountAmt,
				net_total:          netTotal,
				currency,
				client_name:        ticket.client?.name ?? ticket.client_name ?? "No Client",
				client_email:       ticket.client?.email ?? ticket.client_email ?? null,
				client_deactivated: !!ticket.client?.deleted_at,
				billing_cycle:      ticket.client?.billing_cycle ?? "per_ticket",
				payment_terms:      ticket.client?.payment_terms ?? "net_30",
			};
		});

		// Per-client summary
		const summaryMap = new Map<string, {
			client_id: string | null; client_name: string; client_email: string | null;
			client_deactivated: boolean; currency: string; rate_type: string;
			billing_cycle: string; payment_terms: string;
			ticket_count: number; total_billable_hours: number;
			total_billed: number; total_discount: number; net_payable: number;
		}>();

		for (const item of lineItems) {
			const key = item.ticket_id ? (item.client_name ?? "__no_client__") : "__no_client__";
			const clientKey = item.client_name ?? "__no_client__";
			if (!summaryMap.has(clientKey)) {
				summaryMap.set(clientKey, {
					client_id:          null,
					client_name:        item.client_name,
					client_email:       item.client_email,
					client_deactivated: item.client_deactivated,
					currency:           item.currency,
					rate_type:          item.rate_type,
					billing_cycle:      item.billing_cycle,
					payment_terms:      item.payment_terms,
					ticket_count:       0,
					total_billable_hours: 0,
					total_billed:       0,
					total_discount:     0,
					net_payable:        0,
				});
			}
			const s = summaryMap.get(clientKey)!;
			s.ticket_count++;
			s.total_billable_hours = Math.round((s.total_billable_hours + item.billable_hours) * 100) / 100;
			s.total_billed         = Math.round((s.total_billed + item.subtotal) * 100) / 100;
			s.total_discount       = Math.round((s.total_discount + item.discount_amount) * 100) / 100;
			s.net_payable          = Math.round((s.net_payable + item.net_total) * 100) / 100;
		}

		return ok({
			type,
			date_from: dateFrom,
			date_to:   dateTo,
			line_items: lineItems,
			summary:    [...summaryMap.values()],
		});
	} catch (err) {
		console.error("[reports/invoice:GET]", err);
		return errorResponse("Internal server error", 500);
	}
}
