import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
	try {
		const admin = await requireAdmin();
		if (!admin) return errorResponse("Forbidden", 403);
		const orgId = admin.app_metadata?.org_id as string | undefined;
		if (!orgId) return errorResponse("No organization", 400);

		const org = await getOrgForGate(orgId);
		if (!org) return errorResponse("Organization not found", 404);
		const gate = requireFeature(org, "reports");
		if (gate) return gate;

		const body = await request.json();
		const { type, client_id, date_from, date_to, tz_offset = 0, org_name, org_logo } = body;

		if (!type || !date_from || !date_to) {
			return errorResponse("Missing required params: type, date_from, date_to", 400);
		}
		if (type === "client" && !client_id) {
			return errorResponse("client_id is required when type=client", 400);
		}

		// Build date range
		const fromDate = new Date(`${date_from}T00:00:00.000Z`);
		fromDate.setMinutes(fromDate.getMinutes() - tz_offset);
		const toDate = new Date(`${date_to}T23:59:59.999Z`);
		toDate.setMinutes(toDate.getMinutes() - tz_offset);

		const whereClause: any = {
			org_id: orgId,
			status: "completed",
			completed_at: { gte: fromDate, lte: toDate },
		};
		if (type === "client") whereClause.client_id = client_id;

		const tickets = await prisma.ticket.findMany({
			where: whereClause,
			include: {
				assignee: { select: { name: true, email: true } },
				client: { select: { id: true, name: true, email: true, hourly_rate: true, discount_percent: true, currency: true, deleted_at: true } },
				timeEntries: { select: { start_time: true, end_time: true } },
			},
			orderBy: [{ client_id: "asc" }, { completed_at: "asc" }],
		});

		// Build line items
		const lineItems = tickets.map((ticket) => {
			const totalMs = ticket.timeEntries.reduce((sum, te) => {
				if (!te.end_time) return sum;
				return sum + (te.end_time.getTime() - te.start_time.getTime());
			}, 0);
			const billableHours = Math.round((totalMs / 3600000) * 100) / 100;
			const rate = ticket.client?.hourly_rate ?? 0;
			const subtotal = Math.round(billableHours * rate * 100) / 100;
			const discountPct = ticket.client?.discount_percent ?? 0;
			const discountAmount = Math.round(subtotal * discountPct / 100 * 100) / 100;
			const netTotal = Math.round((subtotal - discountAmount) * 100) / 100;
			const currency = ticket.client?.currency ?? "USD";
			const clientDeactivated = !!ticket.client?.deleted_at;
			const clientName = clientDeactivated
				? `${ticket.client?.name ?? ticket.client_name ?? "No Client"} [Deactivated]`
				: ticket.client?.name ?? ticket.client_name ?? "No Client";

			return {
				ticket_id: ticket.id,
				title: ticket.title,
				employee: ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned",
				completed_at: ticket.completed_at ? ticket.completed_at.toISOString().split("T")[0] : "",
				billable_hours: billableHours,
				rate,
				currency,
				subtotal,
				discount_percent: discountPct,
				discount_amount: discountAmount,
				net_total: netTotal,
				client_id: ticket.client?.id ?? null,
				client_name: clientName,
				client_email: ticket.client?.email ?? ticket.client_email ?? null,
				client_deactivated: clientDeactivated,
			};
		});

		// Generate invoice number
		const today = new Date();
		const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, "");
		const orgFull = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
		const slug = (orgFull?.slug ?? "ORG").toUpperCase();
		const todayStart = new Date(`${today.toISOString().slice(0, 10)}T00:00:00.000Z`);
		const todayEnd = new Date(`${today.toISOString().slice(0, 10)}T23:59:59.999Z`);
		const existingCount = await prisma.invoice.count({ where: { org_id: orgId, generated_at: { gte: todayStart, lte: todayEnd } } });
		const seq = String(existingCount + 1).padStart(3, "0");
		const invoiceNumber = `TW-${slug}-${yyyymmdd}-${seq}`;

		const workbook = XLSX.utils.book_new();

		if (type === "client") {
			// Single-sheet client invoice
			const firstItem = lineItems[0];
			const clientName = firstItem?.client_name ?? "No Client";
			const clientEmail = firstItem?.client_email ?? "";
			const currency = firstItem?.currency ?? "USD";
			const discountPct = firstItem?.discount_percent ?? 0;

			const aoa: (string | number | null)[][] = [
				[org_name ?? "Organization"],
				[`Invoice: ${invoiceNumber}`],
				[`Period: ${date_from} to ${date_to}`],
				[`Client: ${clientName}${clientEmail ? ` <${clientEmail}>` : ""}`],
				[],
				["Ticket #", "Title", "Employee", "Completed Date", "Billable Hours", `Rate (${currency})`, "Amount"],
				...lineItems.map((item) => [
					item.ticket_id.slice(-6).toUpperCase(),
					item.title,
					item.employee,
					item.completed_at,
					item.billable_hours,
					item.rate,
					item.subtotal,
				]),
				[],
			];

			// Summary rows
			const totalBillable = lineItems.reduce((s, i) => s + i.billable_hours, 0);
			const totalSubtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);
			const totalDiscount = lineItems.reduce((s, i) => s + i.discount_amount, 0);
			const totalNet = lineItems.reduce((s, i) => s + i.net_total, 0);

			aoa.push(
				["", "", "", "", `Total Billable Hours: ${Math.round(totalBillable * 100) / 100}`, "", `Subtotal: ${currency} ${Math.round(totalSubtotal * 100) / 100}`],
				["", "", "", "", "", "", `Discount (${discountPct}%): -${currency} ${Math.round(totalDiscount * 100) / 100}`],
				["", "", "", "", "", "", `Net Total: ${currency} ${Math.round(totalNet * 100) / 100}`],
			);

			const sheet = XLSX.utils.aoa_to_sheet(aoa);
			XLSX.utils.book_append_sheet(workbook, sheet, "Invoice");
		} else {
			// Tally — Sheet 1: Line Items grouped by client
			const grouped = new Map<string, typeof lineItems>();
			for (const item of lineItems) {
				const key = item.client_id ?? "__no_client__";
				if (!grouped.has(key)) grouped.set(key, []);
				grouped.get(key)!.push(item);
			}

			const aoa: (string | number | null)[][] = [
				["Ticket #", "Title", "Client", "Employee", "Completed Date", "Billable Hrs", "Rate", "Currency", "Amount", "Discount %", "Net Total"],
			];

			let grandTotalsByCurrency: Record<string, { billed: number; net: number; hours: number }> = {};

			for (const [, items] of grouped) {
				for (const item of items) {
					aoa.push([
						item.ticket_id.slice(-6).toUpperCase(),
						item.title,
						item.client_name,
						item.employee,
						item.completed_at,
						item.billable_hours,
						item.rate,
						item.currency,
						item.subtotal,
						item.discount_percent,
						item.net_total,
					]);
				}
				// Client subtotal
				const clientSubtotal = items.reduce((s, i) => s + i.subtotal, 0);
				const clientNet = items.reduce((s, i) => s + i.net_total, 0);
				const clientHours = items.reduce((s, i) => s + i.billable_hours, 0);
				const currency = items[0]?.currency ?? "USD";
				aoa.push([
					`Subtotal — ${items[0]?.client_name ?? "Client"}`,
					"", "", "", "",
					Math.round(clientHours * 100) / 100,
					"", currency,
					Math.round(clientSubtotal * 100) / 100,
					"",
					Math.round(clientNet * 100) / 100,
				]);
				aoa.push([]);

				if (!grandTotalsByCurrency[currency]) grandTotalsByCurrency[currency] = { billed: 0, net: 0, hours: 0 };
				grandTotalsByCurrency[currency].billed += clientSubtotal;
				grandTotalsByCurrency[currency].net += clientNet;
				grandTotalsByCurrency[currency].hours += clientHours;
			}

			// Grand totals per currency
			for (const [currency, totals] of Object.entries(grandTotalsByCurrency)) {
				aoa.push([
					`Grand Total (${currency})`, "", "", "", "",
					Math.round(totals.hours * 100) / 100,
					"", currency,
					Math.round(totals.billed * 100) / 100,
					"",
					Math.round(totals.net * 100) / 100,
				]);
			}

			const sheet1 = XLSX.utils.aoa_to_sheet(aoa);
			XLSX.utils.book_append_sheet(workbook, sheet1, "Line Items");

			// Sheet 2: Summary
			const summaryAoa: (string | number | null)[][] = [
				["Client", "Currency", "Total Tickets", "Total Billable Hours", "Total Billed", "Discount", "Net Payable"],
			];
			for (const [, items] of grouped) {
				const currency = items[0]?.currency ?? "USD";
				const totalBilled = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
				const totalDiscount = Math.round(items.reduce((s, i) => s + i.discount_amount, 0) * 100) / 100;
				const netPayable = Math.round(items.reduce((s, i) => s + i.net_total, 0) * 100) / 100;
				const totalHours = Math.round(items.reduce((s, i) => s + i.billable_hours, 0) * 100) / 100;
				summaryAoa.push([
					items[0]?.client_name ?? "No Client",
					currency,
					items.length,
					totalHours,
					totalBilled,
					totalDiscount,
					netPayable,
				]);
			}
			const sheet2 = XLSX.utils.aoa_to_sheet(summaryAoa);
			XLSX.utils.book_append_sheet(workbook, sheet2, "Summary");
		}

		// Save invoice record
		await prisma.invoice.create({
			data: {
				org_id: orgId,
				invoice_number: invoiceNumber,
				type,
				client_id: type === "client" ? client_id : null,
				date_from: fromDate,
				date_to: toDate,
			},
		});

		const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

		return new Response(buffer, {
			headers: {
				"Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"Content-Disposition": `attachment; filename="invoice-${invoiceNumber}.xlsx"`,
			},
		});
	} catch (err) {
		console.error("[reports/invoice/export:POST]", err);
		return errorResponse("Internal server error", 500);
	}
}
