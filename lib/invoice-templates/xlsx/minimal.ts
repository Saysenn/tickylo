import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Minimal — freelancer / independent
// Looks like a typed letter. No fill, no borders. Just text, a couple of rules, and whitespace.
// Column headers are lowercase. Feels handcrafted, not generated.

export async function buildMinimalXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRI = config.primaryColor;

	const rule = (ws: ExcelJS.Worksheet, row: number, cols: number, color = PRI, weight: ExcelJS.BorderStyle = "thin") => {
		for (let c = 1; c <= cols; c++) {
			const cell = ws.getRow(row).getCell(c);
			cell.border = { bottom: { style: weight, color: { argb: `FF${color}` } } };
		}
	};

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice");
		ws.columns = [
			{ key: "A", width: 14 }, { key: "B", width: 42 }, { key: "C", width: 16 },
			{ key: "D", width: 12 }, { key: "E", width: 10 }, { key: "F", width: 14 },
		];
		const COLS = 6;

		const first      = lineItems[0];
		const clientName = first?.client_name ?? "—";
		const clientEmail= first?.client_email ?? "";
		const cur        = first?.currency ?? "USD";
		const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

		// Org name
		ws.mergeCells("A1:F1");
		ws.getCell("A1").value = orgName;
		ws.getCell("A1").font  = { bold: true, size: 16, color: { argb: `FF${PRI}` } };
		ws.getRow(1).height = 28;

		// Single rule
		rule(ws, 2, COLS, PRI, "medium");
		ws.getRow(2).height = 2;
		ws.getRow(3).height = 10;

		// Label + value rows — like a letter header
		const lv = (label: string, val: string, row: number) => {
			ws.mergeCells(`A${row}:A${row}`);
			ws.getCell(`A${row}`).value = label;
			ws.getCell(`A${row}`).font  = { size: 8.5, color: { argb: "FFC0C5D5" } };
			ws.mergeCells(`B${row}:F${row}`);
			ws.getCell(`B${row}`).value = val;
			ws.getCell(`B${row}`).font  = { size: 9.5, color: { argb: "FF252840" } };
			ws.getRow(row).height = 14;
		};

		lv("to",      clientName, 4);
		lv("",        clientEmail || " ", 5);
		lv("date",    issueDate, 7);
		lv("due",     dueDate, 8);
		lv("invoice", invoiceNumber, 9);
		lv("period",  `${dateFrom}  —  ${dateTo}`, 10);
		lv("terms",   payTerms, 11);

		ws.getRow(3).height = 8;
		ws.getRow(6).height = 6;

		ws.getRow(12).height = 8;
		rule(ws, 12, COLS, "D8DCE8");

		ws.getRow(13).height = 8;

		// Column headers — lowercase, no fill
		const cols = buildCols(config);
		const hRow = ws.getRow(14);
		cols.forEach((c, i) => {
			const cell = hRow.getCell(i + 1);
			cell.value = c.label;
			cell.font  = { size: 8, color: { argb: "FFD0D5E5" } };
			cell.alignment = { horizontal: c.align };
			cell.border = { bottom: { style: "medium" as const, color: { argb: `FF${PRI}` } } };
		});
		hRow.height = 14;

		// Data rows — no fill, no borders, just readable text
		let row = 15;
		for (const item of lineItems) {
			const r = ws.getRow(row);
			buildRowValues(item, cols).forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value = val;
				cell.font  = { size: 10, color: { argb: "FF252840" } };
				cell.border = { bottom: { style: "hair" as const, color: { argb: "FFE8EBF4" } } };
				if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 9, color: { argb: "FFC0C5D5" } };
				if (cols[i].align === "right") cell.alignment = { horizontal: "right" };
				if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
			});
			r.height = 17; row++;
		}

		if (lineItems.length === 0) {
			ws.mergeCells(`A${row}:F${row}`);
			ws.getCell(`A${row}`).value = "no tickets found for this period.";
			ws.getCell(`A${row}`).font  = { italic: true, size: 9, color: { argb: "FFC0C5D5" } };
			row++;
		}

		// Spacer + light rule
		ws.getRow(row).height = 8; row++;
		rule(ws, row, COLS, "D8DCE8"); ws.getRow(row).height = 2; row++;
		ws.getRow(row).height = 8; row++;

		// Totals
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;

		const totRow = (label: string, val: string, bold = false) => {
			ws.mergeCells(`A${row}:D${row}`);
			ws.getCell(`A${row}`).value = label;
			ws.getCell(`A${row}`).font  = { size: 9, bold, color: { argb: "FFC0C5D5" } };
			ws.getCell(`A${row}`).alignment = { horizontal: "right" };
			ws.mergeCells(`E${row}:F${row}`);
			ws.getCell(`E${row}`).value = val;
			ws.getCell(`E${row}`).font  = { size: bold ? 12 : 10, bold, color: { argb: bold ? `FF${PRI}` : "FF252840" } };
			ws.getCell(`E${row}`).alignment = { horizontal: "right" };
			ws.getRow(row).height = bold ? 22 : 16; row++;
		};

		totRow("subtotal", currency(totalSub, cur));
		if (config.showDiscount && totalDisc > 0) totRow(`discount  ${discPct}%`, `− ${currency(totalDisc, cur)}`);
		totRow(`total  ${cur}`, totalNet.toFixed(2), true);

		ws.getRow(row).height = 10; row++;
		ws.mergeCells(`A${row}:F${row}`);
		ws.getCell(`A${row}`).value = config.footerNote || "thank you.";
		ws.getCell(`A${row}`).font  = { italic: true, size: 8.5, color: { argb: "FFD0D5E5" } };

	} else {
		buildMinimalTally(wb, data, config, PRI);
	}
}

function buildMinimalTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRI: string,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const grouped = new Map<string, typeof lineItems>();
	for (const item of lineItems) {
		if (!grouped.has(item.client_name)) grouped.set(item.client_name, []);
		grouped.get(item.client_name)!.push(item);
	}

	const ws = wb.addWorksheet("Tally");
	ws.columns = [
		{ key: "A", width: 30 }, { key: "B", width: 10 }, { key: "C", width: 12 },
		{ key: "D", width: 10 }, { key: "E", width: 14 }, { key: "F", width: 16 },
	];

	ws.mergeCells("A1:F1");
	ws.getCell("A1").value = orgName;
	ws.getCell("A1").font  = { bold: true, size: 14, color: { argb: `FF${PRI}` } };
	ws.getRow(1).height = 26;

	for (let c = 1; c <= 6; c++) {
		ws.getRow(2).getCell(c).border = { bottom: { style: "medium", color: { argb: `FF${PRI}` } } };
	}
	ws.getRow(2).height = 2;

	ws.mergeCells("A3:F3");
	ws.getCell("A3").value = `full tally  ·  ${invoiceNumber}  ·  ${dateFrom} — ${dateTo}  ·  issued ${issueDate}`;
	ws.getCell("A3").font  = { size: 8, color: { argb: "FFC0C5D5" } };
	ws.getRow(3).height = 14; ws.getRow(4).height = 8;

	const hdrs = ["client", "currency", "cycle", "items", "hours", "net payable"];
	const hRow = ws.getRow(5);
	hdrs.forEach((h, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value = h; cell.font = { size: 8, color: { argb: "FFD0D5E5" } };
		cell.alignment = { horizontal: i >= 3 ? "right" : "left" };
		cell.border = { bottom: { style: "medium" as const, color: { argb: `FF${PRI}` } } };
	});
	hRow.height = 14;

	let row = 6;
	for (const [clientName, items] of grouped) {
		const cur   = items[0]?.currency ?? "USD";
		const hours = Math.round(items.reduce((s, i) => s + i.billable_hours, 0) * 100) / 100;
		const net   = Math.round(items.reduce((s, i) => s + i.net_total, 0) * 100) / 100;
		const vals  = [clientName, cur, items[0]?.billing_cycle ?? "per_ticket", items.length, hours, net];
		const r = ws.getRow(row);
		vals.forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value = val; cell.font = { size: 10, color: { argb: "FF252840" } };
			cell.border = { bottom: { style: "hair" as const, color: { argb: "FFE8EBF4" } } };
			if (i >= 3) cell.alignment = { horizontal: "right" };
			if (i === 5) cell.font = { size: 10, bold: true, color: { argb: `FF${PRI}` } };
		});
		r.height = 17; row++;
	}
}

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",    label: "ref",         align: "left" },
		{ key: "title",        label: "description", align: "left" },
		{ key: "employee",     label: "by",          align: "left" },
		{ key: "completed_at", label: "date",        align: "left" },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "hrs",    align: "right" });
	cols.push({ key: "subtotal", label: "amount", align: "right", numFmt: "#,##0.00" });
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
