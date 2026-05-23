import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Minimal — Premium Consultant Letter Style
// Org name in primary color. Thick primary rule below header. Label/value letter block.
// Items with subtle hair borders. Primary-tint total row. Clean footer with "thank you."

export async function buildMinimalXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRI = config.primaryColor;
	const [pr, pg, pb] = hexToRgb(PRI);
	const TINT_INFO  = tintHex(pr, pg, pb, 0.94); // label bg
	const TINT_TOTAL = tintHex(pr, pg, pb, 0.88); // total row
	const TINT_FOOT  = tintHex(pr, pg, pb, 0.95); // footer row

	const priArgb = `FF${PRI}`;
	const white   = "FFFFFFFF";
	const fill    = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
	const bdr     = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border => ({ style, color: { argb } });

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "portrait" } });
		ws.columns = [
			{ key: "A", width: 12 }, { key: "B", width: 44 }, { key: "C", width: 14 },
			{ key: "D", width: 11 }, { key: "E", width: 10 }, { key: "F", width: 15 },
		];
		const COLS = 6;

		const first      = lineItems[0];
		const clientName = first?.client_name  ?? "";
		const clientEmail= first?.client_email ?? "";
		const cur        = first?.currency      ?? "USD";
		const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

		ws.headerFooter.oddHeader = `&L&"Bootshaus Regular,Bold"&14${orgName}&R&"Roboto,Regular"&8invoice  #${invoiceNumber}`;
		ws.headerFooter.oddFooter = `&L&"Roboto,Italic"&8${payTerms}&C&8Page &P of &N&R&"Roboto,Italic"&8due ${dueDate}`;

		// ── Row 1: Org name in primary ────────────────────────────────────────────
		ws.mergeCells("A1:F1");
		applyCell(ws.getCell("A1"), {
			value: orgName,
			font: { name: "Bootshaus Regular", bold: true, size: 18, color: { argb: priArgb } },
			alignment: { vertical: "bottom", indent: 1 },
		});
		ws.getRow(1).height = 32;

		// ── Row 2: Thick primary rule ─────────────────────────────────────────────
		for (let c = 1; c <= COLS; c++) ws.getRow(2).getCell(c).fill = fill(priArgb);
		ws.getRow(2).height = 3;

		// ── Row 3: invoice label right-aligned ───────────────────────────────────
		ws.mergeCells("A3:C3"); ws.mergeCells("D3:F3");
		applyCell(ws.getCell("A3"), {
			value: `invoice  #${invoiceNumber}`,
			font: { name: "Roboto", size: 8, color: { argb: "FFCCD1E4" } },
			alignment: { vertical: "middle", indent: 1 },
		});
		applyCell(ws.getCell("D3"), {
			value: issueDate,
			font: { name: "Roboto", size: 8, color: { argb: "FFCCD1E4" } },
			alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
		ws.getRow(3).height = 16;

		ws.getRow(4).height = 10;

		// ── Rows 5–12: Letter header block ────────────────────────────────────────
		const infoFill = fill(`FF${TINT_INFO}`);

		const lv = (label: string, val: string, row: number) => {
			applyCell(ws.getCell(`A${row}`), {
				value: label,
				font: { name: "Bootshaus Regular", size: 8, color: { argb: priArgb } },
				fill: infoFill,
				alignment: { vertical: "middle", indent: 1 },
			});
			ws.mergeCells(`B${row}:F${row}`);
			applyCell(ws.getCell(`B${row}`), {
				value: val,
				font: { name: "Roboto", size: 9.5, color: { argb: "FF252840" } },
				fill: infoFill,
				alignment: { vertical: "middle", indent: 1 },
			});
			ws.getRow(row).height = 15;
		};

		lv("to",      clientName,  5);
		if (clientEmail) lv("",   clientEmail, 6);
		lv("date",    issueDate,   7);
		lv("due",     dueDate,     8);
		lv("ref",     invoiceNumber, 9);
		lv("period",  `${dateFrom} to ${dateTo}`, 10);
		lv("terms",   payTerms,    11);

		if (!clientEmail) {
			ws.getRow(6).height = 0; // collapse empty email row if not set
		}

		ws.getRow(12).height = 8;

		// Primary accent rule before items
		for (let c = 1; c <= COLS; c++) {
			ws.getRow(12).getCell(c).border = { bottom: bdr("thin", `FF${PRI}`) };
		}

		ws.getRow(13).height = 6;

		// ── Row 14: Column headers — lowercase, primary bottom rule ───────────────
		const cols = buildCols(config);
		const hRow = ws.getRow(14);
		cols.forEach((col, i) => {
			const cell = hRow.getCell(i + 1);
			cell.value  = col.label;
			cell.font   = { name: "Bootshaus Regular", size: 8, color: { argb: "FFCCD1E4" } };
			cell.border = { bottom: bdr("medium", `FF${PRI}`) };
			cell.alignment = { horizontal: col.align, vertical: "middle", indent: col.align === "left" ? 1 : 0 };
		});
		hRow.height = 15;

		// ── Data rows ─────────────────────────────────────────────────────────────
		let row = 15;
		for (const item of lineItems) {
			const r = ws.getRow(row);
			buildRowValues(item, cols).forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value  = val;
				cell.font   = { name: "Roboto", size: 10, color: { argb: "FF252840" } };
				cell.border = { bottom: bdr("hair", "FFEEF0F8") };
				cell.alignment = { horizontal: cols[i].align, vertical: "middle", indent: cols[i].align === "left" ? 1 : 0 };
				if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 9, color: { argb: "FFCCD1E4" } };
				if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
			});
			r.height = 17; row++;
		}

		if (lineItems.length === 0) {
			ws.mergeCells(`A${row}:F${row}`);
			applyCell(ws.getCell(`A${row}`), {
				value: "no tickets found for this period.",
				font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFCCD1E4" } },
				alignment: { horizontal: "center" },
			});
			row++;
		}

		// Spacer + light rule
		ws.getRow(row).height = 8; row++;
		for (let c = 1; c <= COLS; c++) {
			ws.getRow(row).getCell(c).border = { bottom: bdr("thin", "FFE0E4F0") };
		}
		ws.getRow(row).height = 2; row++;
		ws.getRow(row).height = 8; row++;

		// ── Totals ────────────────────────────────────────────────────────────────
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;

		const totRow = (label: string, val: string, isTotal = false) => {
			ws.mergeCells(`A${row}:D${row}`);
			applyCell(ws.getCell(`A${row}`), {
				value: label,
				font: { name: isTotal ? "Bootshaus Regular" : "Roboto", size: 9, bold: isTotal, color: { argb: isTotal ? priArgb : "FFCCD1E4" } },
				fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
				alignment: { horizontal: "right" },
			});
			ws.mergeCells(`E${row}:F${row}`);
			applyCell(ws.getCell(`E${row}`), {
				value: val,
				font: { name: "Roboto", size: isTotal ? 13 : 10, bold: isTotal, color: { argb: isTotal ? priArgb : "FF252840" } },
				fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
				alignment: { horizontal: "right", indent: 1 },
				border: isTotal ? { bottom: bdr("medium", `FF${PRI}`) } : undefined,
			});
			ws.getRow(row).height = isTotal ? 26 : 16; row++;
		};

		totRow("subtotal", currency(totalSub, cur));
		if (config.showDiscount && totalDisc > 0) totRow(`discount  ${discPct}%`, `-${currency(totalDisc, cur)}`);
		totRow(`total  ${cur}`, totalNet.toFixed(2), true);

		// ── Footer ────────────────────────────────────────────────────────────────
		ws.getRow(row).height = 12; row++;

		const footFill = fill(`FF${TINT_FOOT}`);
		ws.mergeCells(`A${row}:F${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: config.footerNote || "thank you.",
			font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFADB3CC" } },
			fill: footFill,
			alignment: { horizontal: "center", vertical: "middle" },
		});
		ws.getRow(row).height = 16; row++;

		ws.mergeCells(`A${row}:F${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: `${orgName}  |  due ${dueDate}  |  ${payTerms}`,
			font: { name: "Roboto", size: 7.5, color: { argb: "FFCCD1E4" } },
			fill: footFill,
			alignment: { horizontal: "center", vertical: "middle" },
		});
		ws.getRow(row).height = 13;

	} else {
		buildMinimalTally(wb, data, config, PRI, pr, pg, pb);
	}
}

function buildMinimalTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRI: string,
	pr: number, pg: number, pb: number,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const TINT_TOTAL = tintHex(pr, pg, pb, 0.88);
	const TINT_FOOT  = tintHex(pr, pg, pb, 0.95);

	const priArgb = `FF${PRI}`;
	const white   = "FFFFFFFF";
	const fill    = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
	const bdr     = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border => ({ style, color: { argb } });

	const cols = buildCols(config, true);
	const COLS = cols.length;
	const lastCol = String.fromCharCode(64 + COLS);
	const halfCol = String.fromCharCode(64 + Math.floor(COLS / 2));

	const ws = wb.addWorksheet("Tally", { pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "portrait" } });
	const widths = [20, 10, 36, 12, 10, 12, 14];
	ws.columns = widths.slice(0, COLS).map((w) => ({ width: w }));

	ws.headerFooter.oddHeader = `&L&"Bootshaus Regular,Bold"&14${orgName}&R&"Roboto,Regular"&8full tally`;
	ws.headerFooter.oddFooter = `&C&"Roboto,Italic"&8${dateFrom} to ${dateTo}  |  page &P of &N`;

	ws.mergeCells(`A1:${lastCol}1`);
	applyCell(ws.getCell("A1"), {
		value: orgName,
		font: { name: "Bootshaus Regular", bold: true, size: 16, color: { argb: priArgb } },
		alignment: { vertical: "bottom", indent: 1 },
	});
	ws.getRow(1).height = 28;

	for (let c = 1; c <= COLS; c++) ws.getRow(2).getCell(c).fill = fill(priArgb);
	ws.getRow(2).height = 3;

	ws.mergeCells(`A3:${halfCol}3`); ws.mergeCells(`${String.fromCharCode(halfCol.charCodeAt(0) + 1)}3:${lastCol}3`);
	applyCell(ws.getCell("A3"), {
		value: `full tally  |  ${invoiceNumber}`,
		font: { name: "Roboto", size: 8, color: { argb: "FFCCD1E4" } },
		alignment: { vertical: "middle", indent: 1 },
	});
	applyCell(ws.getCell(`${String.fromCharCode(halfCol.charCodeAt(0) + 1)}3`), {
		value: `${dateFrom} to ${dateTo}  |  issued ${issueDate}`,
		font: { name: "Roboto", size: 8, color: { argb: "FFCCD1E4" } },
		alignment: { horizontal: "right", vertical: "middle", indent: 1 },
	});
	ws.getRow(3).height = 15;
	ws.getRow(4).height = 8;

	const hRow = ws.getRow(5);
	cols.forEach((col, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value  = col.label;
		cell.font   = { name: "Bootshaus Regular", size: 8, color: { argb: "FFCCD1E4" } };
		cell.border = { bottom: bdr("medium", `FF${PRI}`) };
		cell.alignment = { horizontal: col.align, vertical: "middle", indent: col.align === "left" ? 1 : 0 };
	});
	hRow.height = 15;

	const cur = lineItems[0]?.currency ?? "USD";
	let row = 6;
	for (const item of lineItems) {
		const r = ws.getRow(row);
		buildRowValues(item, cols).forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value  = val;
			cell.font   = { name: "Roboto", size: 10, color: { argb: "FF252840" } };
			cell.border = { bottom: bdr("hair", "FFEEF0F8") };
			cell.alignment = { horizontal: cols[i].align, vertical: "middle", indent: cols[i].align === "left" ? 1 : 0 };
			if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 9, color: { argb: "FFCCD1E4" } };
			if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
		});
		r.height = 18; row++;
	}

	if (lineItems.length === 0) {
		ws.mergeCells(`A${row}:${lastCol}${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: "no tickets found for this period.",
			font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFCCD1E4" } },
			alignment: { horizontal: "center" },
		});
		row++;
	}

	// Totals
	const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
	const discPct   = lineItems[0]?.discount_percent ?? 0;

	ws.getRow(row).height = 8; row++;
	const prevCol = String.fromCharCode(64 + COLS - 1);

	const totRow = (label: string, val: string, isTotal = false) => {
		ws.mergeCells(`A${row}:${prevCol}${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: label,
			font: { name: isTotal ? "Bootshaus Regular" : "Roboto", size: 9, bold: isTotal, color: { argb: isTotal ? priArgb : "FFCCD1E4" } },
			fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
			alignment: { horizontal: "right" },
		});
		applyCell(ws.getCell(`${lastCol}${row}`), {
			value: val,
			font: { name: "Roboto", size: isTotal ? 13 : 10, bold: isTotal, color: { argb: isTotal ? priArgb : "FF252840" } },
			fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
			alignment: { horizontal: "right", indent: 1 },
			border: isTotal ? { bottom: bdr("medium", `FF${PRI}`) } : undefined,
		});
		ws.getRow(row).height = isTotal ? 26 : 16; row++;
	};

	totRow("subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) totRow(`discount  ${discPct}%`, `-${currency(totalDisc, cur)}`);
	totRow(`total  ${cur}`, totalNet.toFixed(2), true);

	// Footer
	ws.getRow(row).height = 12; row++;
	const footFill = fill(`FF${TINT_FOOT}`);
	ws.mergeCells(`A${row}:${halfCol}${row}`); ws.mergeCells(`${String.fromCharCode(halfCol.charCodeAt(0) + 1)}${row}:${lastCol}${row}`);
	applyCell(ws.getCell(`A${row}`), {
		value: orgName,
		font: { name: "Roboto", italic: true, size: 8, color: { argb: "FFADB3CC" } },
		fill: footFill,
		alignment: { vertical: "middle", indent: 1 },
	});
	applyCell(ws.getCell(`${String.fromCharCode(halfCol.charCodeAt(0) + 1)}${row}`), {
		value: `issued ${issueDate}  |  ${dateFrom} to ${dateTo}`,
		font: { name: "Roboto", size: 8, color: { argb: "FFCCD1E4" } },
		fill: footFill,
		alignment: { horizontal: "right", vertical: "middle", indent: 1 },
	});
	ws.getRow(row).height = 14;
}

// ── Column definitions ─────────────────────────────────────────────────────────

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildCols(config: InvoiceConfig, isTally = false): ColDef[] {
	const cols: ColDef[] = [];
	if (isTally) cols.push({ key: "client_name", label: "client", align: "left" });
	cols.push(
		{ key: "ticket_id",    label: "ref",         align: "left" },
		{ key: "title",        label: "description", align: "left" },
		{ key: "completed_at", label: "date",        align: "left" },
	);
	if (config.showHours) cols.push({ key: "billable_hours", label: "hrs", align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "rate", align: "right", numFmt: "#,##0.00" });
	cols.push({ key: "subtotal", label: "amount", align: "right", numFmt: "#,##0.00" });
	return cols;
}

function buildRowValues(item: any, cols: ColDef[]): any[] {
	const map: Record<string, any> = {
		client_name:    item.client_name,
		ticket_id:      item.ticket_id.slice(-6).toUpperCase(),
		title:          item.title,
		completed_at:   item.completed_at,
		billable_hours: item.billable_hours,
		rate:           item.rate,
		subtotal:       item.subtotal,
	};
	return cols.map((c) => map[c.key]);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function tintHex(r: number, g: number, b: number, factor: number): string {
	const tr = Math.round(r + (255 - r) * factor);
	const tg = Math.round(g + (255 - g) * factor);
	const tb = Math.round(b + (255 - b) * factor);
	return [tr, tg, tb].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function applyCell(cell: ExcelJS.Cell, opts: {
	value?:     ExcelJS.CellValue;
	font?:      Partial<ExcelJS.Font>;
	fill?:      ExcelJS.Fill;
	alignment?: Partial<ExcelJS.Alignment>;
	border?:    Partial<ExcelJS.Borders>;
	numFmt?:    string;
}) {
	if (opts.value     !== undefined) cell.value     = opts.value;
	if (opts.font)                    cell.font       = opts.font as ExcelJS.Font;
	if (opts.fill)                    cell.fill       = opts.fill;
	if (opts.alignment)               cell.alignment  = opts.alignment as ExcelJS.Alignment;
	if (opts.border)                  cell.border     = opts.border as ExcelJS.Borders;
	if (opts.numFmt)                  cell.numFmt     = opts.numFmt;
}
