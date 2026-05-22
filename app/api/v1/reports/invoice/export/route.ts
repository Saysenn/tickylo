import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/utils/response";
import { requireAdmin } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/infra/prisma";
import { getOrgForGate, requireFeature } from "@/lib/utils/plan-gate.server";
import ExcelJS from "exceljs";

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEADER_BG  = "1A1A2E";   // dark navy
const HEADER_FG  = "FFFFFF";
const ACCENT_BG  = "16213E";   // slightly lighter navy for section labels
const SUBROW_BG  = "F0F4FF";   // light blue tint for alternating rows
const TOTAL_BG   = "E8F5E9";   // light green for net total row
const BORDER_COLOR = "D0D7E8";

function currency(val: number, cur: string) {
	return `${cur} ${val.toFixed(2)}`;
}

function paymentTermsLabel(terms: string): string {
	const map: Record<string, string> = {
		due_on_receipt: "Due on Receipt",
		net_15: "Net 15 days",
		net_30: "Net 30 days",
		net_60: "Net 60 days",
	};
	return map[terms] ?? terms;
}

function billingCycleLabel(cycle: string): string {
	const map: Record<string, string> = {
		per_ticket: "Per Ticket",
		monthly: "Monthly",
		per_project: "Per Project",
	};
	return map[cycle] ?? cycle;
}

function rateTypeLabel(rt: string): string {
	return rt === "fixed" ? "Fixed" : rt === "hourly" ? "Hourly" : rt;
}

function dueDateFrom(terms: string, issueDate: Date): string {
	const d = new Date(issueDate);
	const days: Record<string, number> = { net_15: 15, net_30: 30, net_60: 60 };
	if (terms === "due_on_receipt") return d.toISOString().split("T")[0];
	d.setDate(d.getDate() + (days[terms] ?? 30));
	return d.toISOString().split("T")[0];
}

function border(): Partial<ExcelJS.Borders> {
	const side = { style: "thin" as const, color: { argb: `FF${BORDER_COLOR}` } };
	return { top: side, left: side, bottom: side, right: side };
}

function headerFont(): Partial<ExcelJS.Font> {
	return { bold: true, color: { argb: `FF${HEADER_FG}` }, size: 10 };
}

function setCol(ws: ExcelJS.Worksheet, cols: { key: string; width: number }[]) {
	ws.columns = cols.map((c) => ({ key: c.key, width: c.width }));
}

// ── Main handler ──────────────────────────────────────────────────────────────

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
		const { type, client_id, date_from, date_to, tz_offset = 0, org_name } = body;

		if (!type || !date_from || !date_to)
			return errorResponse("Missing required params: type, date_from, date_to", 400);
		if (type === "client" && !client_id)
			return errorResponse("client_id is required when type=client", 400);

		const fromDate = new Date(`${date_from}T00:00:00.000Z`);
		fromDate.setMinutes(fromDate.getMinutes() - tz_offset);
		const toDate = new Date(`${date_to}T23:59:59.999Z`);
		toDate.setMinutes(toDate.getMinutes() - tz_offset);

		const whereClause: any = {
			org_id: orgId,
			status: "completed",
			completed_at: { gte: fromDate, lte: toDate },
			client_id: type === "client" ? client_id : { not: null },
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
			orderBy: [{ client_id: "asc" }, { completed_at: "asc" }],
		});

		// Exclude none-rate clients
		const billableTickets = tickets.filter((t) => t.client?.rate_type !== "none");

		const lineItems = billableTickets.map((ticket) => {
			const totalMs = ticket.timeEntries.reduce((sum, te) => {
				if (!te.end_time) return sum;
				return sum + (te.end_time.getTime() - te.start_time.getTime());
			}, 0);
			const billableHours = Math.round(
				(ticket.billable_hours != null ? ticket.billable_hours : totalMs / 3600000) * 100
			) / 100;
			const rateType    = ticket.client?.rate_type ?? "hourly";
			const rate        = ticket.client?.hourly_rate ?? 0;
			const subtotal    = Math.round((rateType === "fixed" ? rate : billableHours * rate) * 100) / 100;
			const discountPct = ticket.client?.discount_percent ?? 0;
			const discountAmt = Math.round(subtotal * discountPct / 100 * 100) / 100;
			const netTotal    = Math.round((subtotal - discountAmt) * 100) / 100;
			const cur         = ticket.client?.currency ?? "USD";
			const deactivated = !!ticket.client?.deleted_at;
			const clientName  = deactivated
				? `${ticket.client?.name ?? ticket.client_name ?? "No Client"} [Deactivated]`
				: ticket.client?.name ?? ticket.client_name ?? "No Client";

			return {
				ticket_id:       ticket.id,
				title:           ticket.title,
				employee:        ticket.assignee?.name ?? ticket.assignee?.email ?? "Unassigned",
				completed_at:    ticket.completed_at ? ticket.completed_at.toISOString().split("T")[0] : "",
				rate_type:       rateType,
				billable_hours:  billableHours,
				rate,
				currency:        cur,
				subtotal,
				discount_percent: discountPct,
				discount_amount: discountAmt,
				net_total:       netTotal,
				client_id:       ticket.client?.id ?? null,
				client_name:     clientName,
				client_email:    ticket.client?.email ?? ticket.client_email ?? null,
				client_deactivated: deactivated,
				billing_cycle:   ticket.client?.billing_cycle ?? "per_ticket",
				payment_terms:   ticket.client?.payment_terms ?? "net_30",
			};
		});

		// Invoice number
		const today    = new Date();
		const yyyymmdd = today.toISOString().slice(0, 10).replace(/-/g, "");
		const orgFull  = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
		const slug     = (orgFull?.slug ?? "ORG").toUpperCase();
		const todayStart = new Date(`${today.toISOString().slice(0, 10)}T00:00:00.000Z`);
		const todayEnd   = new Date(`${today.toISOString().slice(0, 10)}T23:59:59.999Z`);
		const existingCount = await prisma.invoice.count({ where: { org_id: orgId, generated_at: { gte: todayStart, lte: todayEnd } } });
		const seq = String(existingCount + 1).padStart(3, "0");
		const invoiceNumber = `TW-${slug}-${yyyymmdd}-${seq}`;
		const issueDate = today.toISOString().split("T")[0];

		// ── Build workbook ──────────────────────────────────────────────────────
		const wb = new ExcelJS.Workbook();
		wb.creator  = org_name ?? "Tickworks";
		wb.created  = today;
		wb.modified = today;

		if (type === "client") {
			await buildClientSheet(wb, { lineItems, invoiceNumber, issueDate, orgName: org_name ?? "Organization", dateFrom: date_from, dateTo: date_to });
		} else {
			await buildTallySheets(wb, { lineItems, invoiceNumber, issueDate, orgName: org_name ?? "Organization", dateFrom: date_from, dateTo: date_to });
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

		const buffer = await wb.xlsx.writeBuffer();

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

// ── Client Invoice Sheet ──────────────────────────────────────────────────────

async function buildClientSheet(wb: ExcelJS.Workbook, opts: {
	lineItems: any[];
	invoiceNumber: string;
	issueDate: string;
	orgName: string;
	dateFrom: string;
	dateTo: string;
}) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = opts;
	const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true, fitToWidth: 1 } });

	setCol(ws, [
		{ key: "A", width: 14 },
		{ key: "B", width: 36 },
		{ key: "C", width: 18 },
		{ key: "D", width: 14 },
		{ key: "E", width: 10 },
		{ key: "F", width: 10 },
		{ key: "G", width: 12 },
		{ key: "H", width: 14 },
	]);

	const first    = lineItems[0];
	const clientName    = first?.client_name ?? "—";
	const clientEmail   = first?.client_email ?? "";
	const cur           = first?.currency ?? "USD";
	const billingCycle  = billingCycleLabel(first?.billing_cycle ?? "per_ticket");
	const payTerms      = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate       = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	// ── Header block ──
	// Row 1: org name (left) | INVOICE (right)
	ws.mergeCells("A1:E1");
	ws.mergeCells("F1:H1");
	const r1L = ws.getCell("A1");
	r1L.value = orgName;
	r1L.font  = { bold: true, size: 16, color: { argb: `FF${ACCENT_BG}` } };
	const r1R = ws.getCell("F1");
	r1R.value = "INVOICE";
	r1R.font  = { bold: true, size: 20, color: { argb: `FF${HEADER_BG}` } };
	r1R.alignment = { horizontal: "right" };
	ws.getRow(1).height = 30;

	// Row 2: blank separator
	ws.getRow(2).height = 6;

	// Row 3: invoice number (right)
	ws.mergeCells("F3:H3");
	const r3R = ws.getCell("F3");
	r3R.value     = `# ${invoiceNumber}`;
	r3R.font      = { bold: true, size: 11, color: { argb: `FF${HEADER_BG}` } };
	r3R.alignment = { horizontal: "right" };

	// Row 4: period (right)
	ws.mergeCells("F4:H4");
	const r4R = ws.getCell("F4");
	r4R.value     = `Period: ${dateFrom} → ${dateTo}`;
	r4R.font      = { size: 10, color: { argb: "FF666688" } };
	r4R.alignment = { horizontal: "right" };

	// Row 5: issued / due dates (right)
	ws.mergeCells("F5:H5");
	const r5R = ws.getCell("F5");
	r5R.value     = `Issued: ${issueDate}   Due: ${dueDate}`;
	r5R.font      = { size: 10, color: { argb: "FF666688" } };
	r5R.alignment = { horizontal: "right" };

	// Row 3-6 left: Bill To block
	ws.mergeCells("A3:E3");
	ws.getCell("A3").value = "BILL TO";
	ws.getCell("A3").font  = { bold: true, size: 8, color: { argb: "FF999999" } };

	ws.mergeCells("A4:E4");
	ws.getCell("A4").value = clientName;
	ws.getCell("A4").font  = { bold: true, size: 13, color: { argb: `FF${HEADER_BG}` } };

	ws.mergeCells("A5:E5");
	ws.getCell("A5").value = clientEmail || " ";
	ws.getCell("A5").font  = { size: 10, color: { argb: "FF666688" } };

	ws.mergeCells("A6:E6");
	ws.getCell("A6").value = `Billing: ${billingCycle}   ·   Terms: ${payTerms}`;
	ws.getCell("A6").font  = { size: 10, italic: true, color: { argb: "FF888888" } };

	// Row 6 right: payment terms
	ws.mergeCells("F6:H6");
	ws.getCell("F6").value     = payTerms;
	ws.getCell("F6").font      = { bold: true, size: 10, color: { argb: `FF${HEADER_BG}` } };
	ws.getCell("F6").alignment = { horizontal: "right" };

	// Row 7: spacer
	ws.getRow(7).height = 10;

	// ── Column headers row 8 ──
	const headers = ["Ticket #", "Title", "Employee", "Completed", "Rate Type", "Hrs", "Rate", "Amount"];
	const headerRow = ws.getRow(8);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.font  = headerFont();
		cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
		cell.border = border();
		cell.alignment = { horizontal: i >= 5 ? "right" : "left", vertical: "middle" };
	});
	headerRow.height = 22;

	// ── Line items ──
	let row = 9;
	for (const item of lineItems) {
		const r   = ws.getRow(row);
		const alt = row % 2 === 0;
		const fillColor = alt ? `FF${SUBROW_BG}` : "FFFFFFFF";
		const cells = [
			item.ticket_id.slice(-6).toUpperCase(),
			item.title,
			item.employee,
			item.completed_at,
			rateTypeLabel(item.rate_type),
			item.billable_hours,
			item.rate,
			item.subtotal,
		];
		cells.forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value = val;
			cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
			cell.border = border();
			cell.font   = { size: 10, color: { argb: "FF333355" } };
			if (i === 0) cell.font = { ...cell.font, name: "Courier New", size: 9 };
			if (i >= 5)  cell.alignment = { horizontal: "right" };
			if (i === 7) cell.numFmt = "#,##0.00";
			if (i === 6) cell.numFmt = "#,##0.00";
		});
		r.height = 18;
		row++;
	}

	if (lineItems.length === 0) {
		ws.mergeCells(`A9:H9`);
		const empty = ws.getCell("A9");
		empty.value = "No completed tickets found for this client in the selected period.";
		empty.font  = { italic: true, color: { argb: "FF999999" }, size: 10 };
		empty.alignment = { horizontal: "center" };
		row = 10;
	}

	// ── Totals ──
	const totalBillable = lineItems.reduce((s, i) => s + i.billable_hours, 0);
	const totalSubtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);
	const totalDiscount = lineItems.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet      = lineItems.reduce((s, i) => s + i.net_total, 0);
	const discountPct   = lineItems[0]?.discount_percent ?? 0;

	row++; // spacer

	const addTotalRow = (label: string, value: string, bold = false, bgColor?: string) => {
		ws.mergeCells(`A${row}:F${row}`);
		const labelCell = ws.getCell(`A${row}`);
		labelCell.value = label;
		labelCell.font  = { size: 10, bold, color: { argb: "FF444466" } };
		labelCell.alignment = { horizontal: "right" };

		ws.mergeCells(`G${row}:H${row}`);
		const valCell = ws.getCell(`G${row}`);
		valCell.value = value;
		valCell.font  = { size: 11, bold, color: { argb: bold ? `FF${HEADER_BG}` : "FF555577" } };
		valCell.alignment = { horizontal: "right" };
		valCell.border = border();
		if (bgColor) {
			valCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
		}
		ws.getRow(row).height = 20;
		row++;
	};

	addTotalRow(`Total Billable Hours: ${totalBillable.toFixed(2)} hrs`, `Subtotal: ${currency(totalSubtotal, cur)}`);
	if (totalDiscount > 0)
		addTotalRow(`Discount (${discountPct}%)`, `-${currency(totalDiscount, cur)}`);
	addTotalRow("NET TOTAL", currency(totalNet, cur), true, `FF${TOTAL_BG}`);

	// Footer note
	row++;
	ws.mergeCells(`A${row}:H${row}`);
	const footer = ws.getCell(`A${row}`);
	footer.value = `Payment due by ${dueDate}. Thank you for your business.`;
	footer.font  = { italic: true, size: 9, color: { argb: "FF999999" } };
	footer.alignment = { horizontal: "center" };
}

// ── Full Tally Sheets ─────────────────────────────────────────────────────────

async function buildTallySheets(wb: ExcelJS.Workbook, opts: {
	lineItems: any[];
	invoiceNumber: string;
	issueDate: string;
	orgName: string;
	dateFrom: string;
	dateTo: string;
}) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = opts;

	// Group by client
	const grouped = new Map<string, any[]>();
	for (const item of lineItems) {
		const key = item.client_name;
		if (!grouped.has(key)) grouped.set(key, []);
		grouped.get(key)!.push(item);
	}

	// ── Sheet 1: Line Items ──
	const ws1 = wb.addWorksheet("Line Items", { pageSetup: { fitToPage: true, fitToWidth: 1 } });
	setCol(ws1, [
		{ key: "A", width: 14 },
		{ key: "B", width: 30 },
		{ key: "C", width: 20 },
		{ key: "D", width: 18 },
		{ key: "E", width: 14 },
		{ key: "F", width: 10 },
		{ key: "G", width: 10 },
		{ key: "H", width: 10 },
		{ key: "I", width: 14 },
		{ key: "J", width: 10 },
		{ key: "K", width: 14 },
	]);

	// Header
	ws1.mergeCells("A1:K1");
	ws1.getCell("A1").value = `${orgName}  —  Full Billing Tally  —  ${dateFrom} to ${dateTo}`;
	ws1.getCell("A1").font  = { bold: true, size: 13, color: { argb: `FF${HEADER_BG}` } };
	ws1.getRow(1).height = 26;

	ws1.mergeCells("A2:K2");
	ws1.getCell("A2").value = `Invoice: ${invoiceNumber}   Issued: ${issueDate}`;
	ws1.getCell("A2").font  = { size: 10, color: { argb: "FF888888" } };
	ws1.getRow(2).height = 16;
	ws1.getRow(3).height = 8;

	const cols1 = ["Ticket #", "Title", "Client", "Employee", "Completed", "Rate Type", "Hrs", "Rate", "Currency", "Subtotal", "Net Total"];
	const hdr1 = ws1.getRow(4);
	cols1.forEach((h, i) => {
		const cell = hdr1.getCell(i + 1);
		cell.value = h;
		cell.font  = headerFont();
		cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
		cell.border = border();
		cell.alignment = { horizontal: i >= 6 ? "right" : "left", vertical: "middle" };
	});
	hdr1.height = 22;

	let row = 5;
	const grandTotals: Record<string, { hours: number; billed: number; net: number }> = {};

	for (const [clientName, items] of grouped) {
		// Client group label
		ws1.mergeCells(`A${row}:K${row}`);
		const groupLabel = ws1.getCell(`A${row}`);
		groupLabel.value = clientName;
		groupLabel.font  = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
		groupLabel.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${ACCENT_BG}` } };
		groupLabel.alignment = { indent: 1 };
		ws1.getRow(row).height = 18;
		row++;

		for (const item of items) {
			const r   = ws1.getRow(row);
			const alt = row % 2 === 0;
			const fillColor = alt ? `FF${SUBROW_BG}` : "FFFFFFFF";
			const cells = [
				item.ticket_id.slice(-6).toUpperCase(),
				item.title,
				item.client_name,
				item.employee,
				item.completed_at,
				rateTypeLabel(item.rate_type),
				item.billable_hours,
				item.rate,
				item.currency,
				item.subtotal,
				item.net_total,
			];
			cells.forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value = val;
				cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
				cell.border = border();
				cell.font   = { size: 10 };
				if (i === 0) cell.font = { name: "Courier New", size: 9 };
				if (i >= 6)  cell.alignment = { horizontal: "right" };
				if (i >= 9)  cell.numFmt = "#,##0.00";
			});
			r.height = 18;
			row++;
		}

		// Client subtotal row
		const clientHours  = items.reduce((s: number, i: any) => s + i.billable_hours, 0);
		const clientBilled = items.reduce((s: number, i: any) => s + i.subtotal, 0);
		const clientNet    = items.reduce((s: number, i: any) => s + i.net_total, 0);
		const cur          = items[0]?.currency ?? "USD";

		ws1.mergeCells(`A${row}:F${row}`);
		ws1.getCell(`A${row}`).value = `Subtotal — ${clientName}`;
		ws1.getCell(`A${row}`).font  = { bold: true, size: 10, color: { argb: `FF${HEADER_BG}` } };
		ws1.getCell(`A${row}`).alignment = { horizontal: "right" };
		ws1.getCell(`G${row}`).value = clientHours.toFixed(2);
		ws1.getCell(`G${row}`).font  = { bold: true, size: 10 };
		ws1.getCell(`G${row}`).alignment = { horizontal: "right" };
		ws1.getCell(`J${row}`).value = currency(clientBilled, cur);
		ws1.getCell(`J${row}`).font  = { bold: true, size: 10 };
		ws1.getCell(`J${row}`).alignment = { horizontal: "right" };
		ws1.getCell(`K${row}`).value = currency(clientNet, cur);
		ws1.getCell(`K${row}`).font  = { bold: true, size: 10, color: { argb: `FF${HEADER_BG}` } };
		ws1.getCell(`K${row}`).alignment = { horizontal: "right" };
		ws1.getRow(row).height = 18;
		row++;
		ws1.getRow(row).height = 6; // spacer
		row++;

		if (!grandTotals[cur]) grandTotals[cur] = { hours: 0, billed: 0, net: 0 };
		grandTotals[cur].hours  += clientHours;
		grandTotals[cur].billed += clientBilled;
		grandTotals[cur].net    += clientNet;
	}

	// Grand totals per currency
	row++;
	for (const [cur, totals] of Object.entries(grandTotals)) {
		ws1.mergeCells(`A${row}:F${row}`);
		ws1.getCell(`A${row}`).value = `GRAND TOTAL (${cur})`;
		ws1.getCell(`A${row}`).font  = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
		ws1.getCell(`A${row}`).fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
		ws1.getCell(`A${row}`).alignment = { horizontal: "right" };
		const grandCells = { G: totals.hours.toFixed(2), J: currency(totals.billed, cur), K: currency(totals.net, cur) };
		for (const [col, val] of Object.entries(grandCells)) {
			const cell = ws1.getCell(`${col}${row}`);
			cell.value = val;
			cell.font  = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
			cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
			cell.alignment = { horizontal: "right" };
		}
		ws1.getRow(row).height = 22;
		row++;
	}

	// ── Sheet 2: Summary ──
	const ws2 = wb.addWorksheet("Summary");
	setCol(ws2, [
		{ key: "A", width: 28 },
		{ key: "B", width: 10 },
		{ key: "C", width: 12 },
		{ key: "D", width: 10 },
		{ key: "E", width: 14 },
		{ key: "F", width: 14 },
		{ key: "G", width: 14 },
		{ key: "H", width: 16 },
		{ key: "I", width: 16 },
	]);

	ws2.mergeCells("A1:I1");
	ws2.getCell("A1").value = `${orgName}  —  Billing Summary  —  ${dateFrom} to ${dateTo}`;
	ws2.getCell("A1").font  = { bold: true, size: 13, color: { argb: `FF${HEADER_BG}` } };
	ws2.getRow(1).height = 26;
	ws2.getRow(2).height = 8;

	const cols2 = ["Client", "Currency", "Billing Cycle", "Tickets", "Total Hours", "Subtotal", "Discount", "Net Payable", "Payment Terms"];
	const hdr2 = ws2.getRow(3);
	cols2.forEach((h, i) => {
		const cell = hdr2.getCell(i + 1);
		cell.value = h;
		cell.font  = headerFont();
		cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${HEADER_BG}` } };
		cell.border = border();
		cell.alignment = { horizontal: i >= 3 ? "right" : "left", vertical: "middle" };
	});
	hdr2.height = 22;

	let srow = 4;
	for (const [clientName, items] of grouped) {
		const cur          = items[0]?.currency ?? "USD";
		const totalHours   = Math.round(items.reduce((s: number, i: any) => s + i.billable_hours, 0) * 100) / 100;
		const totalBilled  = Math.round(items.reduce((s: number, i: any) => s + i.subtotal, 0) * 100) / 100;
		const totalDisc    = Math.round(items.reduce((s: number, i: any) => s + i.discount_amount, 0) * 100) / 100;
		const totalNet     = Math.round(items.reduce((s: number, i: any) => s + i.net_total, 0) * 100) / 100;
		const billingCycle = billingCycleLabel(items[0]?.billing_cycle ?? "per_ticket");
		const payTerms     = paymentTermsLabel(items[0]?.payment_terms ?? "net_30");
		const alt          = srow % 2 === 0;

		const vals = [clientName, cur, billingCycle, items.length, totalHours, totalBilled, totalDisc, totalNet, payTerms];
		const r = ws2.getRow(srow);
		vals.forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value = val;
			cell.font  = { size: 10 };
			cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: alt ? `FF${SUBROW_BG}` : "FFFFFFFF" } };
			cell.border = border();
			if (i >= 3) cell.alignment = { horizontal: "right" };
			if (i === 7) cell.font = { size: 10, bold: true, color: { argb: `FF${HEADER_BG}` } };
		});
		r.height = 18;
		srow++;
	}
}
