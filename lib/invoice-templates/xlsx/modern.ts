import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Modern — Creative Agency / Studio
// Giant org name header. Full-width primary rule. Two-column info block with right-side
// highlighted meta panel. Column headers small-caps style with primary bottom rule.
// Clean rows, generous spacing. Primary-tint total row. Centered footer note.

export async function buildModernXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRI = config.primaryColor;
	const [pr, pg, pb] = hexToRgb(PRI);
	const TINT_META  = tintHex(pr, pg, pb, 0.88); // right meta panel bg
	const TINT_TOTAL = tintHex(pr, pg, pb, 0.86); // total row bg
	const TINT_FOOT  = tintHex(pr, pg, pb, 0.93); // footer band bg

	const priArgb  = `FF${PRI}`;
	const white    = "FFFFFFFF";

	const fill  = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
	const bdr   = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border => ({ style, color: { argb } });
	const btmPri = (): Partial<ExcelJS.Borders> => ({ bottom: bdr("medium", priArgb) });
	const btmLight = (): Partial<ExcelJS.Borders> => ({ bottom: bdr("thin", "FFE4E8F5") });

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "portrait" } });
		ws.columns = [
			{ key: "A", width: 12 }, { key: "B", width: 38 }, { key: "C", width: 18 },
			{ key: "D", width: 12 }, { key: "E", width: 10 }, { key: "F", width: 13 },
			{ key: "G", width: 15 },
		];
		const COLS = 7;

		const first      = lineItems[0];
		const clientName = first?.client_name ?? "";
		const cur        = first?.currency     ?? "USD";
		const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

		ws.headerFooter.oddHeader = `&L&"Bootshaus Regular,Bold"&16${orgName}&R&"Roboto,Regular"&8Invoice #${invoiceNumber}`;
		ws.headerFooter.oddFooter = `&L&"Roboto,Regular"&8${payTerms}&C&8Page &P of &N&R&"Roboto,Regular"&8Due ${dueDate}`;

		// ── Row 1: Big org name ───────────────────────────────────────────────────
		ws.mergeCells("A1:G1");
		applyCell(ws.getCell("A1"), {
			value: orgName.toUpperCase(),
			font: { name: "Bootshaus Regular", bold: true, size: 24, color: { argb: priArgb } },
			alignment: { vertical: "bottom", indent: 1 },
		});
		ws.getRow(1).height = 40;

		// ── Row 2: Invoice ref left | date range right ────────────────────────────
		ws.mergeCells("A2:D2"); ws.mergeCells("E2:G2");
		applyCell(ws.getCell("A2"), {
			value: `Invoice  #${invoiceNumber}`,
			font: { name: "Roboto", size: 9, color: { argb: "FFADB3CC" } },
			alignment: { vertical: "middle", indent: 1 },
		});
		applyCell(ws.getCell("E2"), {
			value: `${dateFrom}  to  ${dateTo}`,
			font: { name: "Roboto", size: 9, color: { argb: "FFADB3CC" } },
			alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
		ws.getRow(2).height = 16;

		// ── Row 3: Full-width primary rule ────────────────────────────────────────
		for (let c = 1; c <= COLS; c++) ws.getRow(3).getCell(c).fill = fill(priArgb);
		ws.getRow(3).height = 4;

		ws.getRow(4).height = 12;

		// ── Rows 5–7: Client left | Invoice meta right (highlighted panel) ────────
		const metaFill = fill(`FF${TINT_META}`);

		ws.mergeCells("A5:D5"); ws.mergeCells("E5:G5");
		applyCell(ws.getCell("A5"), {
			value: clientName,
			font: { name: "Bootshaus Regular", bold: true, size: 16, color: { argb: priArgb } },
			alignment: { vertical: "middle", indent: 1 },
		});
		applyCell(ws.getCell("E5"), {
			value: `Issued ${issueDate}`,
			font: { name: "Roboto", size: 8.5, color: { argb: `FF${PRI}` } },
			fill: metaFill,
			alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
		ws.getRow(5).height = 28;

		ws.mergeCells("A6:D6"); ws.mergeCells("E6:G6");
		applyCell(ws.getCell("A6"), {
			value: payTerms,
			font: { name: "Roboto", size: 9, color: { argb: "FFADB3CC" } },
			alignment: { vertical: "middle", indent: 1 },
		});
		applyCell(ws.getCell("E6"), {
			value: `Due ${dueDate}`,
			font: { name: "Roboto", bold: true, size: 9, color: { argb: `FF${PRI}` } },
			fill: metaFill,
			alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
		ws.getRow(6).height = 16;

		ws.mergeCells("A7:D7"); ws.mergeCells("E7:G7");
		applyCell(ws.getCell("A7"), {
			value: `Period: ${dateFrom} to ${dateTo}`,
			font: { name: "Roboto", size: 8.5, color: { argb: "FFADB3CC" } },
			alignment: { vertical: "middle", indent: 1 },
		});
		applyCell(ws.getCell("E7"), {
			value: payTerms,
			font: { name: "Roboto", size: 8.5, color: { argb: `FF${PRI}` } },
			fill: metaFill,
			alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
		ws.getRow(7).height = 16;

		ws.getRow(8).height = 10;

		// ── Row 9: Column headers — no fill, primary bottom rule ──────────────────
		const cols = buildCols(config);
		const hRow = ws.getRow(9);
		cols.forEach((col, i) => {
			const cell = hRow.getCell(i + 1);
			cell.value  = col.label.toUpperCase();
			cell.font   = { name: "Bootshaus Regular", size: 7.5, bold: true, color: { argb: "FFCCD1E8" } };
			cell.border = btmPri();
			cell.alignment = { horizontal: col.align, vertical: "middle", indent: col.align === "left" ? 1 : 0 };
		});
		hRow.height = 18;

		// ── Data rows ─────────────────────────────────────────────────────────────
		let row = 10;
		for (const item of lineItems) {
			const r   = ws.getRow(row);
			const alt = row % 2 === 0;
			buildRowValues(item, cols).forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value  = val;
				cell.font   = { name: "Roboto", size: 10, color: { argb: "FF252840" } };
				cell.fill   = fill(alt ? "FFF8F9FC" : white);
				cell.border = btmLight();
				cell.alignment = { horizontal: cols[i].align, vertical: "middle", indent: cols[i].align === "left" ? 1 : 0 };
				if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 9, color: { argb: "FFADB3CC" } };
				if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
			});
			r.height = 19; row++;
		}

		if (lineItems.length === 0) {
			ws.mergeCells(`A${row}:G${row}`);
			applyCell(ws.getCell(`A${row}`), {
				value: "No completed tickets found for this period.",
				font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFADB3CC" } },
				alignment: { horizontal: "center" },
			});
			row++;
		}

		ws.getRow(row).height = 10; row++;

		// ── Totals ────────────────────────────────────────────────────────────────
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;

		const addTot = (label: string, val: string, isTotal = false) => {
			ws.mergeCells(`A${row}:E${row}`);
			applyCell(ws.getCell(`A${row}`), {
				value: label,
				font: { name: isTotal ? "Bootshaus Regular" : "Roboto", size: 9, bold: isTotal, color: { argb: isTotal ? `FF${PRI}` : "FFADB3CC" } },
				fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
				alignment: { horizontal: "right" },
			});
			ws.mergeCells(`F${row}:G${row}`);
			applyCell(ws.getCell(`F${row}`), {
				value: val,
				font: { name: "Roboto", size: isTotal ? 13 : 10, bold: isTotal, color: { argb: isTotal ? `FF${PRI}` : "FF252840" } },
				fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
				alignment: { horizontal: "right", indent: 1 },
				border: isTotal ? { bottom: bdr("medium", `FF${PRI}`) } : btmLight(),
			});
			ws.getRow(row).height = isTotal ? 28 : 18; row++;
		};

		addTot("Subtotal", currency(totalSub, cur));
		if (config.showDiscount && totalDisc > 0) addTot(`Discount ${discPct}%`, `-${currency(totalDisc, cur)}`);
		addTot("TOTAL DUE", currency(totalNet, cur), true);

		// ── Footer ────────────────────────────────────────────────────────────────
		ws.getRow(row).height = 12; row++;

		const footFill = fill(`FF${TINT_FOOT}`);
		ws.mergeCells(`A${row}:G${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: config.footerNote || "Thank you for your business.",
			font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFADB3CC" } },
			fill: footFill,
			alignment: { horizontal: "center", vertical: "middle" },
		});
		ws.getRow(row).height = 16; row++;

		ws.mergeCells(`A${row}:G${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: `${orgName}  |  ${payTerms}  |  Due ${dueDate}`,
			font: { name: "Roboto", size: 8, color: { argb: "FFCCD1E8" } },
			fill: footFill,
			alignment: { horizontal: "center", vertical: "middle" },
		});
		ws.getRow(row).height = 14;

	} else {
		buildModernTally(wb, data, config, PRI, pr, pg, pb);
	}
}

function buildModernTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRI: string,
	pr: number, pg: number, pb: number,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const TINT_TOTAL = tintHex(pr, pg, pb, 0.86);
	const TINT_FOOT  = tintHex(pr, pg, pb, 0.93);

	const priArgb = `FF${PRI}`;
	const white   = "FFFFFFFF";
	const fill    = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
	const bdr     = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border => ({ style, color: { argb } });
	const btmLight = (): Partial<ExcelJS.Borders> => ({ bottom: bdr("thin", "FFE4E8F5") });

	const cols = buildCols(config, true);
	const COLS = cols.length;

	const ws = wb.addWorksheet("Studio Tally", { pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "portrait" } });
	const widths = [22, 10, 36, 13, 10, 13, 15];
	ws.columns = widths.slice(0, COLS).map((w) => ({ width: w }));

	ws.headerFooter.oddHeader = `&L&"Bootshaus Regular,Bold"&16${orgName}&R&"Roboto,Regular"&8Full Tally`;
	ws.headerFooter.oddFooter = `&C&"Roboto,Regular"&8${dateFrom} to ${dateTo}  |  Page &P of &N`;

	const lastCol = String.fromCharCode(64 + COLS);
	const half    = String.fromCharCode(64 + Math.floor(COLS / 2));

	ws.mergeCells(`A1:${half}1`); ws.mergeCells(`${String.fromCharCode(half.charCodeAt(0) + 1)}1:${lastCol}1`);
	applyCell(ws.getCell("A1"), {
		value: orgName.toUpperCase(),
		font: { name: "Bootshaus Regular", bold: true, size: 20, color: { argb: priArgb } },
		alignment: { vertical: "bottom", indent: 1 },
	});
	applyCell(ws.getCell(`${String.fromCharCode(half.charCodeAt(0) + 1)}1`), {
		value: "FULL TALLY",
		font: { name: "Bootshaus Regular", bold: true, size: 10, color: { argb: "FFCCD1E8" } },
		alignment: { horizontal: "right", vertical: "bottom", indent: 1 },
	});
	ws.getRow(1).height = 36;

	ws.mergeCells(`A2:${half}2`); ws.mergeCells(`${String.fromCharCode(half.charCodeAt(0) + 1)}2:${lastCol}2`);
	applyCell(ws.getCell("A2"), {
		value: `Full Tally  |  ${invoiceNumber}`,
		font: { name: "Roboto", size: 9, color: { argb: "FFADB3CC" } },
		alignment: { vertical: "middle", indent: 1 },
	});
	applyCell(ws.getCell(`${String.fromCharCode(half.charCodeAt(0) + 1)}2`), {
		value: `${dateFrom} to ${dateTo}  |  Issued ${issueDate}`,
		font: { name: "Roboto", size: 9, color: { argb: "FFADB3CC" } },
		alignment: { horizontal: "right", vertical: "middle", indent: 1 },
	});
	ws.getRow(2).height = 16;

	for (let c = 1; c <= COLS; c++) ws.getRow(3).getCell(c).fill = fill(priArgb);
	ws.getRow(3).height = 4;
	ws.getRow(4).height = 10;

	const hRow = ws.getRow(5);
	cols.forEach((col, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value  = col.label.toUpperCase();
		cell.font   = { name: "Bootshaus Regular", size: 7.5, bold: true, color: { argb: "FFCCD1E8" } };
		cell.border = { bottom: bdr("medium", priArgb) };
		cell.alignment = { horizontal: col.align, vertical: "middle", indent: col.align === "left" ? 1 : 0 };
	});
	hRow.height = 18;

	const cur = lineItems[0]?.currency ?? "USD";
	let row = 6;
	for (const item of lineItems) {
		const r   = ws.getRow(row);
		const alt = row % 2 === 0;
		buildRowValues(item, cols).forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value  = val;
			cell.font   = { name: "Roboto", size: 10, color: { argb: "FF252840" } };
			cell.fill   = fill(alt ? "FFF8F9FC" : white);
			cell.border = btmLight();
			cell.alignment = { horizontal: cols[i].align, vertical: "middle", indent: cols[i].align === "left" ? 1 : 0 };
			if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 9, color: { argb: "FFADB3CC" } };
			if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
		});
		r.height = 19; row++;
	}

	if (lineItems.length === 0) {
		ws.mergeCells(`A${row}:${lastCol}${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: "No completed tickets found for this period.",
			font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFADB3CC" } },
			alignment: { horizontal: "center" },
		});
		row++;
	}

	// Totals
	const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
	const discPct   = lineItems[0]?.discount_percent ?? 0;

	ws.getRow(row).height = 10; row++;
	const addTot = (label: string, val: string, isTotal = false) => {
		const prevCol = String.fromCharCode(64 + COLS - 1);
		ws.mergeCells(`A${row}:${prevCol}${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: label,
			font: { name: isTotal ? "Bootshaus Regular" : "Roboto", size: 9, bold: isTotal, color: { argb: isTotal ? priArgb : "FFADB3CC" } },
			fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
			alignment: { horizontal: "right" },
		});
		applyCell(ws.getCell(`${lastCol}${row}`), {
			value: val,
			font: { name: "Roboto", size: isTotal ? 13 : 10, bold: isTotal, color: { argb: isTotal ? priArgb : "FF252840" } },
			fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
			alignment: { horizontal: "right", indent: 1 },
			border: isTotal ? { bottom: bdr("medium", priArgb) } : btmLight(),
		});
		ws.getRow(row).height = isTotal ? 28 : 18; row++;
	};

	addTot("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) addTot(`Discount ${discPct}%`, `-${currency(totalDisc, cur)}`);
	addTot("TOTAL DUE", currency(totalNet, cur), true);

	// Footer
	ws.getRow(row).height = 12; row++;
	const footFill = fill(`FF${TINT_FOOT}`);
	ws.mergeCells(`A${row}:${lastCol}${row}`);
	applyCell(ws.getCell(`A${row}`), {
		value: `${orgName}  |  Period: ${dateFrom} to ${dateTo}  |  Issued ${issueDate}`,
		font: { name: "Roboto", italic: true, size: 8, color: { argb: "FFADB3CC" } },
		fill: footFill,
		alignment: { horizontal: "center", vertical: "middle" },
	});
	ws.getRow(row).height = 14;
}

// ── Column definitions ─────────────────────────────────────────────────────────

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildCols(config: InvoiceConfig, isTally = false): ColDef[] {
	const cols: ColDef[] = [];
	if (isTally) cols.push({ key: "client_name", label: "Client", align: "left" });
	cols.push(
		{ key: "ticket_id",    label: "Ref",         align: "left" },
		{ key: "title",        label: "Deliverable", align: "left" },
		{ key: "completed_at", label: "Date",        align: "left" },
	);
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hours", align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "Rate",  align: "right", numFmt: "#,##0.00" });
	cols.push({ key: "subtotal", label: "Fee", align: "right", numFmt: "#,##0.00" });
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
