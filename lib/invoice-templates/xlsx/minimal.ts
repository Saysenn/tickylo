import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, billingCycleLabel, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Minimal: no cell borders, subtle bottom-line separators, typography-focused, agency-style

export async function buildMinimalXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRIMARY = config.primaryColor;
	const DIVIDER = "E2E8F0";

	function bottomLine(): Partial<ExcelJS.Borders> {
		return { bottom: { style: "thin", color: { argb: `FF${DIVIDER}` } } };
	}

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true, fitToWidth: 1 } });
		ws.columns = [
			{ key: "A", width: 14 }, { key: "B", width: 40 }, { key: "C", width: 16 },
			{ key: "D", width: 12 }, { key: "E", width: 10 }, { key: "F", width: 10 },
			{ key: "G", width: 14 },
		];

		const first       = lineItems[0];
		const clientName  = first?.client_name ?? "—";
		const clientEmail = first?.client_email ?? "";
		const cur         = first?.currency ?? "USD";
		const payTerms    = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate     = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

		// Org name — clean, large
		ws.mergeCells("A1:G1");
		ws.getCell("A1").value = orgName;
		ws.getCell("A1").font  = { bold: true, size: 18, color: { argb: `FF${PRIMARY}` } };
		ws.getRow(1).height = 32;

		// Invoice subtitle
		ws.mergeCells("A2:G2");
		ws.getCell("A2").value = `Invoice  ·  ${invoiceNumber}`;
		ws.getCell("A2").font  = { size: 10, color: { argb: "FF94A3B8" } };
		ws.getRow(2).height = 16;
		ws.getRow(3).height = 14;

		// Bill To | Period
		ws.mergeCells("A4:D4");
		ws.getCell("A4").value = clientName;
		ws.getCell("A4").font  = { bold: true, size: 12, color: { argb: "FF1E293B" } };
		ws.mergeCells("E4:G4");
		ws.getCell("E4").value = `${dateFrom} — ${dateTo}`;
		ws.getCell("E4").font  = { size: 10, color: { argb: "FF64748B" } };
		ws.getCell("E4").alignment = { horizontal: "right" };

		ws.mergeCells("A5:D5");
		ws.getCell("A5").value = clientEmail || " ";
		ws.getCell("A5").font  = { size: 10, color: { argb: "FF94A3B8" } };
		ws.mergeCells("E5:G5");
		ws.getCell("E5").value = `Issued ${issueDate}  ·  Due ${dueDate}`;
		ws.getCell("E5").font  = { size: 10, color: { argb: "FF94A3B8" } };
		ws.getCell("E5").alignment = { horizontal: "right" };

		ws.mergeCells("A6:G6");
		ws.getCell("A6").border = bottomLine();
		ws.getRow(6).height = 8;
		ws.getRow(7).height = 8;

		// Column headers — no fill, just small caps style
		const cols = buildCols(config);
		const hRow = ws.getRow(8);
		cols.forEach((c, i) => {
			const cell = hRow.getCell(i + 1);
			cell.value = c.label.toUpperCase();
			cell.font  = { size: 8, bold: true, color: { argb: "FFCBD5E1" } };
			cell.alignment = { horizontal: c.align };
			cell.border = { bottom: { style: "medium", color: { argb: `FF${PRIMARY}` } } };
		});
		hRow.height = 18;

		// Line items — no borders, just bottom divider every row
		let row = 9;
		for (const item of lineItems) {
			const r = ws.getRow(row);
			buildRowValues(item, cols).forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value = val;
				cell.font  = { size: 10, color: { argb: "FF334155" } };
				cell.border = bottomLine();
				if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 9, color: { argb: "FF94A3B8" } };
				if (cols[i].align === "right") cell.alignment = { horizontal: "right" };
				if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
			});
			r.height = 18; row++;
		}

		// Totals — right-aligned, no boxes
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;
		row += 2;

		const addTotal = (label: string, val: string, bold = false) => {
			ws.mergeCells(`A${row}:E${row}`);
			ws.getCell(`A${row}`).value = label;
			ws.getCell(`A${row}`).font  = { size: 9, bold, color: { argb: "FF94A3B8" } };
			ws.getCell(`A${row}`).alignment = { horizontal: "right" };
			ws.mergeCells(`F${row}:G${row}`);
			ws.getCell(`F${row}`).value = val;
			ws.getCell(`F${row}`).font  = { size: bold ? 12 : 10, bold, color: { argb: bold ? `FF${PRIMARY}` : "FF475569" } };
			ws.getCell(`F${row}`).alignment = { horizontal: "right" };
			ws.getRow(row).height = bold ? 24 : 18; row++;
		};

		addTotal("Subtotal", currency(totalSub, cur));
		if (config.showDiscount && totalDisc > 0) addTotal(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);
		addTotal("Total Due", currency(totalNet, cur), true);

		row += 2;
		ws.mergeCells(`A${row}:G${row}`);
		ws.getCell(`A${row}`).value = config.footerNote || `Payment ${payTerms}. Thank you.`;
		ws.getCell(`A${row}`).font  = { size: 9, italic: true, color: { argb: "FFCBD5E1" } };
		ws.getCell(`A${row}`).alignment = { horizontal: "center" };

	} else {
		buildMinimalTally(wb, data, config, PRIMARY, DIVIDER, bottomLine);
	}
}

function buildMinimalTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRIMARY: string,
	_DIVIDER: string,
	bottomLine: () => Partial<ExcelJS.Borders>,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const grouped = new Map<string, typeof lineItems>();
	for (const item of lineItems) {
		if (!grouped.has(item.client_name)) grouped.set(item.client_name, []);
		grouped.get(item.client_name)!.push(item);
	}

	const ws = wb.addWorksheet("Full Tally");
	ws.columns = [
		{ key: "A", width: 28 }, { key: "B", width: 10 }, { key: "C", width: 12 },
		{ key: "D", width: 10 }, { key: "E", width: 14 }, { key: "F", width: 14 },
		{ key: "G", width: 16 },
	];

	ws.mergeCells("A1:G1");
	ws.getCell("A1").value = orgName;
	ws.getCell("A1").font  = { bold: true, size: 16, color: { argb: `FF${PRIMARY}` } };
	ws.getRow(1).height = 30;

	ws.mergeCells("A2:G2");
	ws.getCell("A2").value = `Full Tally  ·  ${invoiceNumber}  ·  ${dateFrom} — ${dateTo}  ·  Issued ${issueDate}`;
	ws.getCell("A2").font  = { size: 9, color: { argb: "FF94A3B8" } };
	ws.getRow(2).height = 14;
	ws.getRow(3).height = 12;

	const cols = ["Client", "Currency", "Cycle", "Tickets", "Hours", "Subtotal", "Net Payable"];
	const hRow = ws.getRow(4);
	cols.forEach((h, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value = h.toUpperCase();
		cell.font  = { size: 8, bold: true, color: { argb: "FFCBD5E1" } };
		cell.alignment = { horizontal: i >= 3 ? "right" : "left" };
		cell.border = { bottom: { style: "medium", color: { argb: `FF${PRIMARY}` } } };
	});
	hRow.height = 18;

	let row = 5;
	for (const [clientName, items] of grouped) {
		const cur   = items[0]?.currency ?? "USD";
		const hours = Math.round(items.reduce((s, i) => s + i.billable_hours, 0) * 100) / 100;
		const sub   = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
		const net   = Math.round(items.reduce((s, i) => s + i.net_total, 0) * 100) / 100;
		const vals  = [clientName, cur, billingCycleLabel(items[0]?.billing_cycle ?? "per_ticket"), items.length, hours, sub, net];
		const r = ws.getRow(row);
		vals.forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value = val; cell.font = { size: 10, color: { argb: "FF334155" } };
			cell.border = bottomLine();
			if (i >= 3) cell.alignment = { horizontal: "right" };
			if (i === 6) cell.font = { size: 10, bold: true, color: { argb: `FF${PRIMARY}` } };
		});
		r.height = 18; row++;
	}
}

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",    label: "Ref",       align: "left" },
		{ key: "title",        label: "Description",align: "left" },
		{ key: "employee",     label: "By",        align: "left" },
		{ key: "completed_at", label: "Date",      align: "left" },
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
