import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, billingCycleLabel, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Modern: full-width colored header band, alternating shaded rows, accent totals

export async function buildModernXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRIMARY  = config.primaryColor;
	const ALT_ROW  = "F5F7FF";
	const TOTAL_BG = "EAF4EA";

	function bdr(): Partial<ExcelJS.Borders> {
		const s = { style: "thin" as const, color: { argb: "FFE2E8F0" } };
		return { top: s, left: s, bottom: s, right: s };
	}

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true, fitToWidth: 1 } });
		ws.columns = [
			{ key: "A", width: 12 }, { key: "B", width: 38 }, { key: "C", width: 18 },
			{ key: "D", width: 12 }, { key: "E", width: 10 }, { key: "F", width: 10 },
			{ key: "G", width: 12 }, { key: "H", width: 14 },
		];

		const first       = lineItems[0];
		const clientName  = first?.client_name ?? "—";
		const clientEmail = first?.client_email ?? "";
		const cur         = first?.currency ?? "USD";
		const payTerms    = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate     = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

		// Row 1: full-width header band
		ws.mergeCells("A1:H1");
		const banner = ws.getCell("A1");
		banner.value = orgName.toUpperCase();
		banner.font  = { bold: true, size: 15, color: { argb: "FFFFFFFF" } };
		banner.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
		banner.alignment = { vertical: "middle", indent: 2 };
		ws.getRow(1).height = 36;

		// Row 2: INVOICE label on same banner shade but lighter text
		ws.mergeCells("A2:H2");
		const sub = ws.getCell("A2");
		sub.value = `INVOICE  #${invoiceNumber}`;
		sub.font  = { size: 10, color: { argb: "FFCCD6F6" } };
		sub.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
		sub.alignment = { vertical: "middle", indent: 2 };
		ws.getRow(2).height = 18;
		ws.getRow(3).height = 12;

		// Row 4: Bill To | Dates
		ws.mergeCells("A4:D4"); ws.getCell("A4").value = "BILL TO";
		ws.getCell("A4").font = { bold: true, size: 8, color: { argb: "FF94A3B8" } };
		ws.mergeCells("E4:H4"); ws.getCell("E4").value = "DETAILS";
		ws.getCell("E4").font = { bold: true, size: 8, color: { argb: "FF94A3B8" } };
		ws.getCell("E4").alignment = { horizontal: "right" };

		ws.mergeCells("A5:D5"); ws.getCell("A5").value = clientName;
		ws.getCell("A5").font = { bold: true, size: 13, color: { argb: `FF${PRIMARY}` } };
		ws.mergeCells("E5:H5"); ws.getCell("E5").value = `Period: ${dateFrom} → ${dateTo}`;
		ws.getCell("E5").font = { size: 10, color: { argb: "FF64748B" } };
		ws.getCell("E5").alignment = { horizontal: "right" };

		ws.mergeCells("A6:D6"); ws.getCell("A6").value = clientEmail || " ";
		ws.getCell("A6").font = { size: 10, color: { argb: "FF64748B" } };
		ws.mergeCells("E6:H6"); ws.getCell("E6").value = `Issued: ${issueDate}   Due: ${dueDate}`;
		ws.getCell("E6").font = { size: 10, color: { argb: "FF64748B" } };
		ws.getCell("E6").alignment = { horizontal: "right" };

		ws.mergeCells("A7:D7"); ws.getCell("A7").value = `Terms: ${payTerms}`;
		ws.getCell("A7").font = { size: 10, italic: true, color: { argb: "FF94A3B8" } };
		ws.getRow(8).height = 10;

		// Header row
		const colLabels = buildCols(config);
		const hRow = ws.getRow(9);
		colLabels.forEach((c, i) => {
			const cell = hRow.getCell(i + 1);
			cell.value = c.label;
			cell.font  = { bold: true, size: 10, color: { argb: `FF${PRIMARY}` } };
			cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
			cell.border = bdr();
			cell.alignment = { horizontal: c.align, vertical: "middle" };
		});
		hRow.height = 22;

		let row = 10;
		for (const item of lineItems) {
			const r = ws.getRow(row);
			const alt = row % 2 === 0;
			buildRowValues(item, colLabels).forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value = val;
				cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: alt ? `FF${ALT_ROW}` : "FFFFFFFF" } };
				cell.border = bdr();
				cell.font  = { size: 10 };
				if (colLabels[i].key === "ticket_id") cell.font = { name: "Courier New", size: 9, color: { argb: "FF94A3B8" } };
				if (colLabels[i].align === "right") cell.alignment = { horizontal: "right" };
				if (colLabels[i].numFmt) cell.numFmt = colLabels[i].numFmt!;
			});
			r.height = 18; row++;
		}

		// Totals
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;
		row++;

		const addTotal = (label: string, val: string, bold = false, bg?: string) => {
			ws.mergeCells(`A${row}:F${row}`);
			ws.getCell(`A${row}`).value = label;
			ws.getCell(`A${row}`).font  = { size: 10, bold, color: { argb: "FF475569" } };
			ws.getCell(`A${row}`).alignment = { horizontal: "right" };
			ws.mergeCells(`G${row}:H${row}`);
			const vc = ws.getCell(`G${row}`);
			vc.value = val; vc.font = { size: 11, bold, color: { argb: bold ? `FF${PRIMARY}` : "FF475569" } };
			vc.alignment = { horizontal: "right" };
			if (bg) vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
			ws.getRow(row).height = 20; row++;
		};

		addTotal("Subtotal", currency(totalSub, cur));
		if (config.showDiscount && totalDisc > 0) addTotal(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);
		addTotal("NET TOTAL", currency(totalNet, cur), true, `FF${TOTAL_BG}`);

		row++;
		ws.mergeCells(`A${row}:H${row}`);
		ws.getCell(`A${row}`).value = config.footerNote || `Payment due by ${dueDate}.`;
		ws.getCell(`A${row}`).font  = { italic: true, size: 9, color: { argb: "FF94A3B8" } };
		ws.getCell(`A${row}`).alignment = { horizontal: "center" };

	} else {
		buildModernTally(wb, data, config, PRIMARY, ALT_ROW, bdr);
	}
}

function buildModernTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRIMARY: string,
	ALT_ROW: string,
	bdr: () => Partial<ExcelJS.Borders>,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const grouped = new Map<string, typeof lineItems>();
	for (const item of lineItems) {
		if (!grouped.has(item.client_name)) grouped.set(item.client_name, []);
		grouped.get(item.client_name)!.push(item);
	}

	const ws = wb.addWorksheet("Full Tally");
	ws.columns = [
		{ key: "A", width: 26 }, { key: "B", width: 10 }, { key: "C", width: 12 },
		{ key: "D", width: 10 }, { key: "E", width: 14 }, { key: "F", width: 14 },
		{ key: "G", width: 14 }, { key: "H", width: 16 },
	];

	ws.mergeCells("A1:H1");
	ws.getCell("A1").value = orgName.toUpperCase();
	ws.getCell("A1").font  = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
	ws.getCell("A1").fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
	ws.getCell("A1").alignment = { vertical: "middle", indent: 2 };
	ws.getRow(1).height = 34;

	ws.mergeCells("A2:H2");
	ws.getCell("A2").value = `Full Tally — ${dateFrom} to ${dateTo}   ·   ${invoiceNumber}   ·   Issued: ${issueDate}`;
	ws.getCell("A2").font  = { size: 9, color: { argb: "FFCCD6F6" } };
	ws.getCell("A2").fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
	ws.getCell("A2").alignment = { vertical: "middle", indent: 2 };
	ws.getRow(2).height = 16;
	ws.getRow(3).height = 10;

	const cols = ["Client", "Currency", "Billing Cycle", "Tickets", "Hours", "Subtotal", "Discount", "Net Payable"];
	const hRow = ws.getRow(4);
	cols.forEach((h, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value = h; cell.font = { bold: true, size: 10, color: { argb: `FF${PRIMARY}` } };
		cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
		cell.border = bdr();
		cell.alignment = { horizontal: i >= 3 ? "right" : "left", vertical: "middle" };
	});
	hRow.height = 22;

	let row = 5;
	for (const [clientName, items] of grouped) {
		const cur = items[0]?.currency ?? "USD";
		const hours = Math.round(items.reduce((s, i) => s + i.billable_hours, 0) * 100) / 100;
		const sub   = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
		const disc  = Math.round(items.reduce((s, i) => s + i.discount_amount, 0) * 100) / 100;
		const net   = Math.round(items.reduce((s, i) => s + i.net_total, 0) * 100) / 100;
		const vals  = [clientName, cur, billingCycleLabel(items[0]?.billing_cycle ?? "per_ticket"), items.length, hours, sub, disc, net];
		const r = ws.getRow(row);
		vals.forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value = val; cell.font = { size: 10 };
			cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: row % 2 === 0 ? `FF${ALT_ROW}` : "FFFFFFFF" } };
			cell.border = bdr();
			if (i >= 3) cell.alignment = { horizontal: "right" };
			if (i === 7) cell.font = { size: 10, bold: true, color: { argb: `FF${PRIMARY}` } };
		});
		r.height = 18; row++;
	}
}

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",    label: "Ticket #",  align: "left" },
		{ key: "title",        label: "Description",align: "left" },
		{ key: "employee",     label: "Assignee",  align: "left" },
		{ key: "completed_at", label: "Date",      align: "left" },
		{ key: "rate_type",    label: "Type",      align: "left" },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hrs", align: "right" });
	if (config.showRate)  cols.push({ key: "rate", label: "Rate", align: "right", numFmt: "#,##0.00" });
	cols.push({ key: "subtotal", label: "Amount", align: "right", numFmt: "#,##0.00" });
	return cols;
}

function buildRowValues(item: any, cols: ColDef[]): any[] {
	const map: Record<string, any> = {
		ticket_id:      item.ticket_id.slice(-6).toUpperCase(),
		title:          item.title,
		employee:       item.employee,
		completed_at:   item.completed_at,
		rate_type:      rateTypeLabel(item.rate_type),
		billable_hours: item.billable_hours,
		rate:           item.rate,
		subtotal:       item.subtotal,
	};
	return cols.map((c) => map[c.key]);
}
