import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, billingCycleLabel, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Classic — corporate / legal firm
// Traditional bordered layout. Formal column headers. Navy palette. Feels like a law firm billing statement.

export async function buildClassicXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRI  = config.primaryColor;
	const DARK = "F2F4F8";   // alternate row
	const GRN  = "EAF4EA";   // total highlight

	const thin  = (c = "D0D5E5") => ({ style: "thin" as const, color: { argb: `FF${c}` } });
	const bdr   = (c = "D0D5E5"): Partial<ExcelJS.Borders> => ({ top: thin(c), left: thin(c), bottom: thin(c), right: thin(c) });
	const hFont = (): Partial<ExcelJS.Font> => ({ bold: true, color: { argb: "FFFFFFFF" }, size: 9.5 });

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true, fitToWidth: 1 } });
		ws.columns = [
			{ key: "A", width: 13 }, { key: "B", width: 38 }, { key: "C", width: 17 },
			{ key: "D", width: 13 }, { key: "E", width: 11 }, { key: "F", width: 10 },
			{ key: "G", width: 13 }, { key: "H", width: 14 },
		];

		const first       = lineItems[0];
		const clientName  = first?.client_name ?? "—";
		const clientEmail = first?.client_email ?? "";
		const cur         = first?.currency ?? "USD";
		const payTerms    = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate     = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));
		const billing     = billingCycleLabel(first?.billing_cycle ?? "per_ticket");

		// Row 1: Org name (large) | INVOICE stamp
		ws.mergeCells("A1:E1"); ws.mergeCells("F1:H1");
		const c1L = ws.getCell("A1");
		c1L.value = orgName;
		c1L.font  = { bold: true, size: 18, color: { argb: `FF${PRI}` } };
		const c1R = ws.getCell("F1");
		c1R.value = "INVOICE";
		c1R.font  = { bold: true, size: 22, color: { argb: `FF${PRI}` } };
		c1R.alignment = { horizontal: "right" };
		ws.getRow(1).height = 32;

		// Row 2: thin primary rule
		ws.mergeCells("A2:H2");
		ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRI}` } };
		ws.getRow(2).height = 2;

		ws.getRow(3).height = 8;

		// Row 4-7: Bill To (left) | Invoice meta (right)
		const metaCol = (label: string, val: string, row: number) => {
			ws.mergeCells(`A${row}:D${row}`);
			ws.mergeCells(`E${row}:F${row}`);
			ws.mergeCells(`G${row}:H${row}`);
			ws.getCell(`E${row}`).value = label;
			ws.getCell(`E${row}`).font  = { size: 8, color: { argb: "FF9BA0B8" } };
			ws.getCell(`E${row}`).alignment = { horizontal: "right" };
			ws.getCell(`G${row}`).value = val;
			ws.getCell(`G${row}`).font  = { bold: true, size: 9, color: { argb: "FF2A2D47" } };
			ws.getCell(`G${row}`).alignment = { horizontal: "right" };
		};

		ws.mergeCells("A4:D4");
		ws.getCell("A4").value = "BILLED TO";
		ws.getCell("A4").font  = { size: 7.5, bold: true, color: { argb: "FFA0A5BC" } };

		ws.mergeCells("A5:D5");
		ws.getCell("A5").value = clientName;
		ws.getCell("A5").font  = { bold: true, size: 14, color: { argb: `FF${PRI}` } };
		ws.getRow(5).height = 20;

		ws.mergeCells("A6:D6");
		ws.getCell("A6").value = clientEmail || " ";
		ws.getCell("A6").font  = { size: 9, color: { argb: "FF8890A8" } };

		ws.mergeCells("A7:D7");
		ws.getCell("A7").value = `${billing}  ·  ${payTerms}`;
		ws.getCell("A7").font  = { size: 8.5, italic: true, color: { argb: "FFA0A5BC" } };

		metaCol("Invoice No.", `#${invoiceNumber}`, 4);
		metaCol("Issue Date", issueDate, 5);
		metaCol("Due Date",   dueDate,   6);
		metaCol("Terms",      payTerms,  7);

		ws.getRow(8).height = 6;

		// Row 9: period note
		ws.mergeCells("A9:H9");
		ws.getCell("A9").value = `Period: ${dateFrom}  —  ${dateTo}`;
		ws.getCell("A9").font  = { size: 8.5, italic: true, color: { argb: "FFA0A5BC" } };

		ws.getRow(10).height = 4;

		// Row 11: column headers
		const cols = buildCols(config);
		const hRow = ws.getRow(11);
		cols.forEach((c, i) => {
			const cell = hRow.getCell(i + 1);
			cell.value = c.label;
			cell.font  = hFont();
			cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRI}` } };
			cell.border = bdr();
			cell.alignment = { horizontal: c.align, vertical: "middle" };
		});
		hRow.height = 20;

		// Data rows
		let row = 12;
		for (const item of lineItems) {
			const r = ws.getRow(row);
			const alt = row % 2 === 0;
			buildRowValues(item, cols).forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value = val;
				cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: alt ? `FF${DARK}` : "FFFFFFFF" } };
				cell.border = bdr();
				cell.font  = { size: 9.5, color: { argb: "FF2A2D47" } };
				if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 8.5, color: { argb: "FF9BA0B8" } };
				if (cols[i].align === "right") cell.alignment = { horizontal: "right" };
				if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
			});
			r.height = 17; row++;
		}

		if (lineItems.length === 0) {
			ws.mergeCells(`A12:H12`);
			ws.getCell("A12").value = "No completed tickets found for this period.";
			ws.getCell("A12").font  = { italic: true, size: 9, color: { argb: "FFA0A5BC" } };
			ws.getCell("A12").alignment = { horizontal: "center" };
			row = 13;
		}

		// Spacer
		ws.getRow(row).height = 6; row++;

		// Totals
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;

		const addTot = (label: string, val: string, bold = false, bg?: string) => {
			ws.mergeCells(`A${row}:F${row}`);
			const lc = ws.getCell(`A${row}`);
			lc.value = label; lc.font = { size: 9, bold, color: { argb: "FF6870A0" } };
			lc.alignment = { horizontal: "right" };
			ws.mergeCells(`G${row}:H${row}`);
			const vc = ws.getCell(`G${row}`);
			vc.value = val; vc.font = { size: bold ? 11 : 9.5, bold, color: { argb: bold ? `FF${PRI}` : "FF2A2D47" } };
			vc.alignment = { horizontal: "right" }; vc.border = bdr();
			if (bg) vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
			ws.getRow(row).height = bold ? 22 : 18; row++;
		};

		addTot("Subtotal", currency(totalSub, cur));
		if (config.showDiscount && totalDisc > 0)
			addTot(`Discount (${discPct}%)`, `− ${currency(totalDisc, cur)}`);
		addTot("TOTAL DUE", currency(totalNet, cur), true, `FF${GRN}`);

		// Footer
		ws.getRow(row).height = 8; row++;
		ws.mergeCells(`A${row}:H${row}`);
		ws.getCell(`A${row}`).value = config.footerNote || `Payment due by ${dueDate}. Thank you for your business.`;
		ws.getCell(`A${row}`).font  = { italic: true, size: 8.5, color: { argb: "FFC0C5D8" } };
		ws.getCell(`A${row}`).alignment = { horizontal: "center" };

	} else {
		buildClassicTally(wb, data, config, PRI, DARK, bdr, hFont);
	}
}

function buildClassicTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRI: string,
	DARK: string,
	bdr: (c?: string) => Partial<ExcelJS.Borders>,
	hFont: () => Partial<ExcelJS.Font>,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const grouped = new Map<string, typeof lineItems>();
	for (const item of lineItems) {
		if (!grouped.has(item.client_name)) grouped.set(item.client_name, []);
		grouped.get(item.client_name)!.push(item);
	}

	const ws = wb.addWorksheet("Billing Statement");
	ws.columns = [
		{ key: "A", width: 13 }, { key: "B", width: 32 }, { key: "C", width: 20 },
		{ key: "D", width: 16 }, { key: "E", width: 11 }, { key: "F", width: 10 },
		{ key: "G", width: 10 }, { key: "H", width: 14 }, { key: "I", width: 14 },
	];

	ws.mergeCells("A1:I1");
	ws.getCell("A1").value = orgName;
	ws.getCell("A1").font  = { bold: true, size: 16, color: { argb: `FF${PRI}` } };
	ws.getRow(1).height = 28;

	ws.mergeCells("A2:I2");
	ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRI}` } };
	ws.getRow(2).height = 2;

	ws.mergeCells("A3:I3");
	ws.getCell("A3").value = `Billing Statement  ·  Invoice ${invoiceNumber}  ·  ${dateFrom} — ${dateTo}  ·  Issued ${issueDate}`;
	ws.getCell("A3").font  = { size: 8.5, color: { argb: "FF9BA0B8" } };
	ws.getRow(3).height = 16; ws.getRow(4).height = 6;

	const hdrs = ["Matter #", "Description", "Fee Earner", "Completed", "Rate Type", "Hours", "Rate", "Subtotal", "Net Total"];
	const hRow = ws.getRow(5);
	hdrs.forEach((h, i) => {
		const cell = hRow.getCell(i + 1); cell.value = h; cell.font = hFont();
		cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRI}` } };
		cell.border = bdr(); cell.alignment = { horizontal: i >= 5 ? "right" : "left", vertical: "middle" };
	});
	hRow.height = 20;

	let row = 6;
	for (const [clientName, items] of grouped) {
		ws.mergeCells(`A${row}:I${row}`);
		const gl = ws.getCell(`A${row}`);
		gl.value = clientName; gl.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
		gl.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRI}` } };
		gl.alignment = { indent: 1 }; ws.getRow(row).height = 17; row++;

		for (const item of items) {
			const r = ws.getRow(row);
			const alt = row % 2 === 0;
			const vals = [
				item.ticket_id.slice(-6).toUpperCase(), item.title, item.employee,
				item.completed_at, rateTypeLabel(item.rate_type),
				config.showHours ? item.billable_hours : "",
				config.showRate  ? item.rate : "",
				item.subtotal, item.net_total,
			];
			vals.forEach((val, i) => {
				const cell = r.getCell(i + 1); cell.value = val;
				cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: alt ? `FF${DARK}` : "FFFFFFFF" } };
				cell.border = bdr(); cell.font = { size: 9.5 };
				if (i === 0) cell.font = { name: "Courier New", size: 8.5, color: { argb: "FF9BA0B8" } };
				if (i >= 5) cell.alignment = { horizontal: "right" };
				if (i >= 7) cell.numFmt = "#,##0.00";
			});
			r.height = 17; row++;
		}

		const cur   = items[0]?.currency ?? "USD";
		const hours = items.reduce((s, i) => s + i.billable_hours, 0);
		const net   = Math.round(items.reduce((s, i) => s + i.net_total, 0) * 100) / 100;
		ws.mergeCells(`A${row}:E${row}`);
		ws.getCell(`A${row}`).value = `Subtotal — ${clientName}`;
		ws.getCell(`A${row}`).font  = { bold: true, size: 9, color: { argb: `FF${PRI}` } };
		ws.getCell(`A${row}`).alignment = { horizontal: "right" };
		if (config.showHours) { ws.getCell(`F${row}`).value = hours.toFixed(2); ws.getCell(`F${row}`).font = { bold: true, size: 9 }; ws.getCell(`F${row}`).alignment = { horizontal: "right" }; }
		ws.getCell(`I${row}`).value = currency(net, cur); ws.getCell(`I${row}`).font = { bold: true, size: 9.5, color: { argb: `FF${PRI}` } }; ws.getCell(`I${row}`).alignment = { horizontal: "right" };
		ws.getRow(row).height = 18; row++;
		ws.getRow(row).height = 5; row++;
	}
}

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",    label: "Matter #",    align: "left" },
		{ key: "title",        label: "Description", align: "left" },
		{ key: "employee",     label: "Fee Earner",  align: "left" },
		{ key: "completed_at", label: "Completed",   align: "left" },
		{ key: "rate_type",    label: "Type",        align: "left" },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hours",  align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "Rate",   align: "right", numFmt: "#,##0.00" });
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
