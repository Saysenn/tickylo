import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, billingCycleLabel, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Classic — Corporate Letterhead Style
// Multi-row primary-color header band. Light-tinted info section. Primary-fill column headers.
// Alternating data rows. Highlighted TOTAL row. Colored footer band with payment info.

export async function buildClassicXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRI = config.primaryColor;
	const [pr, pg, pb] = hexToRgb(PRI);
	const TINT_LIGHT = tintHex(pr, pg, pb, 0.92); // info block bg
	const TINT_TOTAL = tintHex(pr, pg, pb, 0.88); // total row bg
	const TINT_FOOT  = tintHex(pr, pg, pb, 0.94); // footer band bg

	const priArgb  = `FF${PRI}`;
	const whiteArg = "FFFFFFFF";

	const fill  = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
	const bdr   = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border => ({ style, color: { argb } });
	const btmBdr = (argb = "FFE2E5F0"): Partial<ExcelJS.Borders> => ({ bottom: bdr("thin", argb) });

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "portrait" } });
		ws.columns = [
			{ key: "A", width: 8  },
			{ key: "B", width: 36 },
			{ key: "C", width: 18 },
			{ key: "D", width: 13 },
			{ key: "E", width: 10 },
			{ key: "F", width: 11 },
			{ key: "G", width: 14 },
		];

		const first       = lineItems[0];
		const clientName  = first?.client_name  ?? "";
		const clientEmail = first?.client_email ?? "";
		const cur         = first?.currency      ?? "USD";
		const payTerms    = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate     = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));
		const billing     = billingCycleLabel(first?.billing_cycle ?? "per_ticket");
		const COLS = 7;

		ws.headerFooter.oddHeader = `&L&"Bootshaus Regular,Bold"&14${orgName}&R&"Roboto,Normal"&9INVOICE  #${invoiceNumber}`;
		ws.headerFooter.oddFooter = `&L&"Roboto,Italic"&8${payTerms}&C&8Page &P of &N&R&"Roboto,Italic"&8Due: ${dueDate}`;

		// ── Header band rows 1–3 (primary fill) ──────────────────────────────────
		// Row 1: Org name left | INVOICE right
		ws.mergeCells("A1:D1"); ws.mergeCells("E1:G1");
		applyCell(ws.getCell("A1"), {
			value: orgName,
			font: { name: "Bootshaus Regular", bold: true, size: 18, color: { argb: whiteArg } },
			fill: fill(priArgb),
			alignment: { vertical: "middle", indent: 1 },
		});
		applyCell(ws.getCell("E1"), {
			value: "INVOICE",
			font: { name: "Bootshaus Regular", bold: true, size: 20, color: { argb: "33FFFFFF" } },
			fill: fill(priArgb),
			alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
		ws.getRow(1).height = 38;

		// Row 2: Invoice number left | Issue date right
		ws.mergeCells("A2:D2"); ws.mergeCells("E2:G2");
		applyCell(ws.getCell("A2"), {
			value: `No. ${invoiceNumber}`,
			font: { name: "Roboto", size: 8.5, color: { argb: "AAFFFFFF" } },
			fill: fill(priArgb),
			alignment: { vertical: "middle", indent: 1 },
		});
		applyCell(ws.getCell("E2"), {
			value: `Issued ${issueDate}`,
			font: { name: "Roboto", size: 8.5, color: { argb: "AAFFFFFF" } },
			fill: fill(priArgb),
			alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
		ws.getRow(2).height = 20;

		// Row 3: thin accent stripe
		for (let c = 1; c <= COLS; c++) ws.getRow(3).getCell(c).fill = fill(`FF${tintHex(pr, pg, pb, 0.25)}`);
		ws.getRow(3).height = 4;

		// ── Info section rows 4–8 (light tinted bg) ──────────────────────────────
		const infoFill = fill(`FF${TINT_LIGHT}`);

		const infoLeft = (val: string, row: number, bold = false, size = 9) => {
			ws.mergeCells(`A${row}:D${row}`);
			applyCell(ws.getCell(`A${row}`), {
				value: val,
				font: { name: bold ? "Bootshaus Regular" : "Roboto", bold, size, color: { argb: bold ? "FF1A1D38" : "FF6B7090" } },
				fill: infoFill,
				alignment: { vertical: "middle", indent: 1 },
			});
		};

		const infoRight = (label: string, val: string, row: number) => {
			ws.mergeCells(`E${row}:F${row}`);
			applyCell(ws.getCell(`E${row}`), {
				value: label,
				font: { name: "Bootshaus Regular", size: 8, color: { argb: `FF${PRI}` } },
				fill: infoFill,
				alignment: { horizontal: "right", vertical: "middle" },
			});
			applyCell(ws.getCell(`G${row}`), {
				value: val,
				font: { name: "Roboto", bold: true, size: 8.5, color: { argb: "FF1A1D38" } },
				fill: infoFill,
				alignment: { horizontal: "right", vertical: "middle", indent: 1 },
			});
		};

		infoLeft("BILL TO", 4, false, 7.5);
		infoLeft(clientName, 5, true, 11);
		if (clientEmail) infoLeft(clientEmail, 6, false, 8.5);
		infoLeft(`${billing}  |  ${payTerms}`, 7, false, 8);
		infoLeft(`Period: ${dateFrom} to ${dateTo}`, 8, false, 8);

		infoRight("Invoice No.", `#${invoiceNumber}`, 4);
		infoRight("Issue Date",  issueDate,            5);
		infoRight("Due Date",    dueDate,               6);
		infoRight("Terms",       payTerms,              7);

		ws.getRow(4).height = 14;
		ws.getRow(5).height = 22;
		ws.getRow(6).height = 14;
		ws.getRow(7).height = 14;
		ws.getRow(8).height = 14;

		// Row 9: primary rule separator
		for (let c = 1; c <= COLS; c++) ws.getRow(9).getCell(c).fill = fill(priArgb);
		ws.getRow(9).height = 2;

		ws.getRow(10).height = 6;

		// ── Column headers row 11 (primary fill, white text) ─────────────────────
		const cols = buildCols(config);
		const hRow = ws.getRow(11);
		cols.forEach((col, i) => {
			const cell = hRow.getCell(i + 1);
			cell.value = col.label;
			cell.font  = { name: "Bootshaus Regular", bold: true, size: 8, color: { argb: whiteArg } };
			cell.fill  = fill(priArgb);
			cell.alignment = { horizontal: col.align, vertical: "middle", indent: col.align === "left" ? 1 : 0 };
		});
		hRow.height = 20;

		// ── Data rows 12+ ─────────────────────────────────────────────────────────
		let row = 12;
		for (const item of lineItems) {
			const r   = ws.getRow(row);
			const alt = row % 2 === 0;
			buildRowValues(item, cols).forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value  = val;
				cell.fill   = fill(alt ? "FFF5F6FB" : whiteArg);
				cell.border = btmBdr();
				cell.font   = { name: "Roboto", size: 9.5, color: { argb: "FF252840" } };
				cell.alignment = { horizontal: cols[i].align, vertical: "middle", indent: cols[i].align === "left" ? 1 : 0 };
				if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 8.5, color: { argb: "FF9BA0B8" } };
				if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
			});
			r.height = 18; row++;
		}

		if (lineItems.length === 0) {
			ws.mergeCells(`A${row}:G${row}`);
			applyCell(ws.getCell(`A${row}`), {
				value: "No completed tickets found for this period.",
				font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFADB2C8" } },
				alignment: { horizontal: "center" },
			});
			row++;
		}

		ws.getRow(row).height = 8; row++;

		// ── Totals ────────────────────────────────────────────────────────────────
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;

		const addTot = (label: string, val: string, isTotal = false) => {
			ws.mergeCells(`A${row}:E${row}`);
			applyCell(ws.getCell(`A${row}`), {
				value: label,
				font: { name: isTotal ? "Bootshaus Regular" : "Roboto", size: 8.5, bold: isTotal, color: { argb: isTotal ? `FF${PRI}` : "FF9BA0B8" } },
				fill: fill(isTotal ? `FF${TINT_TOTAL}` : whiteArg),
				alignment: { horizontal: "right" },
			});
			ws.mergeCells(`F${row}:G${row}`);
			applyCell(ws.getCell(`F${row}`), {
				value: val,
				font: { name: "Roboto", size: isTotal ? 12 : 9.5, bold: isTotal, color: { argb: isTotal ? `FF${PRI}` : "FF252840" } },
				fill: fill(isTotal ? `FF${TINT_TOTAL}` : whiteArg),
				alignment: { horizontal: "right", indent: 1 },
				border: { bottom: bdr(isTotal ? "medium" : "thin", isTotal ? `FF${PRI}` : "FFD8DCE8") },
			});
			ws.getRow(row).height = isTotal ? 26 : 17; row++;
		};

		addTot("Subtotal", currency(totalSub, cur));
		if (config.showDiscount && totalDisc > 0)
			addTot(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);
		addTot("TOTAL DUE", currency(totalNet, cur), true);

		// ── Footer band ───────────────────────────────────────────────────────────
		ws.getRow(row).height = 10; row++;

		const footFill = fill(`FF${TINT_FOOT}`);

		ws.mergeCells(`A${row}:D${row}`); ws.mergeCells(`E${row}:G${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: `Payment Terms: ${payTerms}`,
			font: { name: "Roboto", size: 8, color: { argb: "FF6B7090" } },
			fill: footFill,
			alignment: { vertical: "middle", indent: 1 },
		});
		applyCell(ws.getCell(`E${row}`), {
			value: `Due by ${dueDate}`,
			font: { name: "Roboto", bold: true, size: 8.5, color: { argb: `FF${PRI}` } },
			fill: footFill,
			alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
		ws.getRow(row).height = 16; row++;

		ws.mergeCells(`A${row}:G${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: config.footerNote || "Payment is due by the date specified above. Thank you for your business.",
			font: { name: "Roboto", italic: true, size: 8, color: { argb: "FFADB2C8" } },
			fill: footFill,
			alignment: { horizontal: "center", vertical: "middle" },
		});
		ws.getRow(row).height = 14;

	} else {
		buildClassicTally(wb, data, config, PRI, pr, pg, pb);
	}
}

function buildClassicTallyTotals(ws: ExcelJS.Worksheet, lineItems: any[], cur: string, config: InvoiceConfig, PRI: string, pr: number, pg: number, pb: number, row: number, fill: (a: string) => ExcelJS.Fill, bdr: (s: ExcelJS.BorderStyle, a: string) => ExcelJS.Border, COLS: number): number {
	const TINT_TOTAL = tintHex(pr, pg, pb, 0.88);
	const priArgb = `FF${PRI}`;
	const white = "FFFFFFFF";

	const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
	const discPct   = lineItems[0]?.discount_percent ?? 0;

	ws.getRow(row).height = 8; row++;

	const addTot = (label: string, val: string, isTotal = false) => {
		ws.mergeCells(`A${row}:${colLetter(COLS - 1)}${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: label,
			font: { name: isTotal ? "Bootshaus Regular" : "Roboto", size: 8.5, bold: isTotal, color: { argb: isTotal ? priArgb : "FF9BA0B8" } },
			fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
			alignment: { horizontal: "right" },
		});
		applyCell(ws.getCell(`${colLetter(COLS)}${row}`), {
			value: val,
			font: { name: "Roboto", size: isTotal ? 12 : 9.5, bold: isTotal, color: { argb: isTotal ? priArgb : "FF252840" } },
			fill: fill(isTotal ? `FF${TINT_TOTAL}` : white),
			alignment: { horizontal: "right", indent: 1 },
			border: { bottom: bdr(isTotal ? "medium" : "thin", isTotal ? priArgb : "FFD8DCE8") },
		});
		ws.getRow(row).height = isTotal ? 26 : 17; row++;
	};

	addTot("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0)
		addTot(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);
	addTot("TOTAL DUE", currency(totalNet, cur), true);
	return row;
}

function colLetter(n: number): string {
	return String.fromCharCode(64 + n);
}

function buildClassicTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRI: string,
	pr: number, pg: number, pb: number,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;

	const priArgb   = `FF${PRI}`;
	const whiteArgb = "FFFFFFFF";
	const TINT_FOOT = tintHex(pr, pg, pb, 0.94);

	const fill   = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
	const bdr    = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border => ({ style, color: { argb } });
	const btmBdr = (argb = "FFE2E5F0"): Partial<ExcelJS.Borders> => ({ bottom: bdr("thin", argb) });

	const ws = wb.addWorksheet("Billing Statement", { pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "portrait" } });

	const cols = buildCols(config, true);
	const COLS = cols.length;

	// Set column widths based on col count
	const widths = [22, 10, 32, 13, 10, 11, 14];
	ws.columns = widths.slice(0, COLS).map((w) => ({ width: w }));

	ws.headerFooter.oddHeader = `&L&"Bootshaus Regular,Bold"&14${orgName}&R&"Roboto,Normal"&9Billing Statement`;
	ws.headerFooter.oddFooter = `&C&"Roboto,Italic"&8${dateFrom} to ${dateTo}  |  Page &P of &N`;

	// Header band
	const lastCol = colLetter(COLS);
	ws.mergeCells(`A1:${colLetter(Math.floor(COLS / 2))}1`);
	ws.mergeCells(`${colLetter(Math.floor(COLS / 2) + 1)}1:${lastCol}1`);
	applyCell(ws.getCell("A1"), {
		value: orgName,
		font: { name: "Bootshaus Regular", bold: true, size: 18, color: { argb: whiteArgb } },
		fill: fill(priArgb),
		alignment: { vertical: "middle", indent: 1 },
	});
	applyCell(ws.getCell(`${colLetter(Math.floor(COLS / 2) + 1)}1`), {
		value: "BILLING STATEMENT",
		font: { name: "Bootshaus Regular", bold: true, size: 9, color: { argb: "55FFFFFF" } },
		fill: fill(priArgb),
		alignment: { horizontal: "right", vertical: "middle", indent: 1 },
	});
	ws.getRow(1).height = 38;

	ws.mergeCells(`A2:${lastCol}2`);
	applyCell(ws.getCell("A2"), {
		value: `Statement No. ${invoiceNumber}  |  Period: ${dateFrom} to ${dateTo}  |  Issued ${issueDate}`,
		font: { name: "Roboto", size: 8, color: { argb: "AAFFFFFF" } },
		fill: fill(priArgb),
		alignment: { vertical: "middle", indent: 1 },
	});
	ws.getRow(2).height = 18;

	for (let c = 1; c <= COLS; c++) ws.getRow(3).getCell(c).fill = fill(`FF${tintHex(pr, pg, pb, 0.25)}`);
	ws.getRow(3).height = 4;
	ws.getRow(4).height = 8;

	// Column headers
	const hRow = ws.getRow(5);
	cols.forEach((col, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value = col.label;
		cell.font  = { name: "Bootshaus Regular", bold: true, size: 8, color: { argb: whiteArgb } };
		cell.fill  = fill(priArgb);
		cell.alignment = { horizontal: col.align, vertical: "middle", indent: col.align === "left" ? 1 : 0 };
	});
	hRow.height = 20;

	const cur = lineItems[0]?.currency ?? "USD";
	let row = 6;
	for (const item of lineItems) {
		const r   = ws.getRow(row);
		const alt = row % 2 === 0;
		buildRowValues(item, cols).forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value  = val;
			cell.fill   = fill(alt ? "FFF5F6FB" : whiteArgb);
			cell.border = btmBdr();
			cell.font   = { name: "Roboto", size: 9, color: { argb: "FF252840" } };
			cell.alignment = { horizontal: cols[i].align, vertical: "middle", indent: cols[i].align === "left" ? 1 : 0 };
			if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 8.5, color: { argb: "FF9BA0B8" } };
			if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
		});
		r.height = 18; row++;
	}

	if (lineItems.length === 0) {
		ws.mergeCells(`A${row}:${lastCol}${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: "No completed tickets found for this period.",
			font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFADB2C8" } },
			alignment: { horizontal: "center" },
		});
		row++;
	}

	row = buildClassicTallyTotals(ws, lineItems, cur, config, PRI, pr, pg, pb, row, fill, bdr, COLS);

	// Footer band
	ws.getRow(row).height = 10; row++;
	const footFill = fill(`FF${TINT_FOOT}`);
	ws.mergeCells(`A${row}:${lastCol}${row}`);
	applyCell(ws.getCell(`A${row}`), {
		value: `Issued by ${orgName}  |  Period: ${dateFrom} to ${dateTo}  |  Generated ${issueDate}`,
		font: { name: "Roboto", italic: true, size: 8, color: { argb: "FFADB2C8" } },
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
		{ key: "ticket_id",    label: isTally ? "#" : "No.", align: "left" },
		{ key: "title",        label: "Description",          align: "left" },
		{ key: "completed_at", label: "Date",                 align: "left" },
	);
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hours",  align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "Rate",   align: "right", numFmt: "#,##0.00" });
	cols.push({ key: "subtotal", label: "Amount", align: "right", numFmt: "#,##0.00" });
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
