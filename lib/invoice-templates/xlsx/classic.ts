import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, billingCycleLabel, paymentTermsLabel, dueDateFrom } from "../helpers";

export async function buildClassicXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRI = config.primaryColor;
	const [pr, pg, pb] = hexToRgb(PRI);
	const TINT_LIGHT = tintHex(pr, pg, pb, 0.92);
	const TINT_TOTAL = tintHex(pr, pg, pb, 0.86);
	const TINT_FOOT  = tintHex(pr, pg, pb, 0.94);
	const TINT_SUM   = tintHex(pr, pg, pb, 0.90);

	const priArgb  = `FF${PRI}`;
	const whiteArg = "FFFFFFFF";

	const fill    = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
	const bdr     = (style: ExcelJS.BorderStyle, argb: string): ExcelJS.Border => ({ style, color: { argb } });
	const cellBdr = (top = false, bottom = false, argb = "FFD8DCE8"): Partial<ExcelJS.Borders> => ({
		left:   bdr("thin", argb),
		right:  bdr("thin", argb),
		...(top    ? { top:    bdr("thin", argb) } : {}),
		...(bottom ? { bottom: bdr("thin", argb) } : {}),
	});
	const sideBdr = (argb = "FFE2E5F0"): Partial<ExcelJS.Borders> => ({
		bottom: bdr("thin", argb),
		left:   bdr("thin", argb),
		right:  bdr("thin", argb),
	});

	if (type === "client") {
		buildClientInvoice(wb, data, config, PRI, pr, pg, pb,
			{ fill, bdr, cellBdr, sideBdr, priArgb, whiteArg, TINT_LIGHT, TINT_TOTAL, TINT_FOOT });
	} else {
		buildTally(wb, data, config, PRI, pr, pg, pb,
			{ fill, bdr, cellBdr, sideBdr, priArgb, whiteArg, TINT_TOTAL, TINT_FOOT, TINT_SUM });
	}
}

// ── Client Invoice ────────────────────────────────────────────────────────────

function buildClientInvoice(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRI: string, pr: number, pg: number, pb: number,
	h: any,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const { fill, bdr, cellBdr, sideBdr, priArgb, whiteArg, TINT_LIGHT, TINT_TOTAL, TINT_FOOT } = h;

	const first       = lineItems[0];
	const clientName  = first?.client_name  ?? "";
	const clientEmail = first?.client_email ?? "";
	const cur         = first?.currency      ?? "USD";
	const payTerms    = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate     = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));
	const billing     = billingCycleLabel(first?.billing_cycle ?? "per_ticket");

	const ws = wb.addWorksheet("Invoice", {
		pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "portrait" },
	});

	// Column widths: #, Description, Date, Hours, Rate, Amount
	ws.columns = [
		{ width: 7  }, // #
		{ width: 55 }, // Description
		{ width: 14 }, // Date
		{ width: 10 }, // Hours
		{ width: 12 }, // Rate
		{ width: 15 }, // Amount
	];
	const COLS = 6;
	const lastCol = colLetter(COLS);

	ws.headerFooter.oddHeader = `&L&"Bootshaus Regular,Bold"&14${orgName}&R&"Roboto,Normal"&9INVOICE  #${invoiceNumber}`;
	ws.headerFooter.oddFooter = `&L&"Roboto,Italic"&8${payTerms}&C&8Page &P of &N&R&"Roboto,Italic"&8Due: ${dueDate}`;

	// ── Header band ───────────────────────────────────────────────────────────
	ws.mergeCells("A1:D1"); ws.mergeCells("E1:F1");
	applyCell(ws.getCell("A1"), {
		value: orgName,
		font: { name: "Bootshaus Regular", bold: true, size: 18, color: { argb: whiteArg } },
		fill: fill(priArgb), alignment: { vertical: "middle" },
	});
	applyCell(ws.getCell("E1"), {
		value: "INVOICE",
		font: { name: "Bootshaus Regular", bold: true, size: 18, color: { argb: "33FFFFFF" } },
		fill: fill(priArgb), alignment: { horizontal: "right", vertical: "middle", indent: 1 },
	});
	ws.getRow(1).height = 38;

	ws.mergeCells("A2:D2"); ws.mergeCells("E2:F2");
	applyCell(ws.getCell("A2"), {
		value: `No. ${invoiceNumber}`,
		font: { name: "Roboto", size: 8, color: { argb: "AAFFFFFF" } },
		fill: fill(priArgb), alignment: { vertical: "middle" },
	});
	applyCell(ws.getCell("E2"), {
		value: `Issued ${issueDate}`,
		font: { name: "Roboto", size: 8, color: { argb: "AAFFFFFF" } },
		fill: fill(priArgb), alignment: { horizontal: "right", vertical: "middle", indent: 1 },
	});
	ws.getRow(2).height = 18;

	for (let c = 1; c <= COLS; c++) ws.getRow(3).getCell(c).fill = fill(`FF${tintHex(pr, pg, pb, 0.25)}`);
	ws.getRow(3).height = 4;

	// ── Info section ─────────────────────────────────────────────────────────
	const infoFill = fill(`FF${TINT_LIGHT}`);

	const infoLeft = (val: string, r: number, bold = false, size = 9) => {
		ws.mergeCells(`A${r}:C${r}`);
		applyCell(ws.getCell(`A${r}`), {
			value: val,
			font: { name: bold ? "Bootshaus Regular" : "Roboto", bold, size, color: { argb: bold ? "FF1A1D38" : "FF6B7090" } },
			fill: infoFill, alignment: { vertical: "middle", indent: 1 },
		});
	};
	const infoRight = (label: string, val: string, r: number) => {
		ws.mergeCells(`D${r}:E${r}`);
		applyCell(ws.getCell(`D${r}`), {
			value: label,
			font: { name: "Bootshaus Regular", size: 8, color: { argb: `FF${PRI}` } },
			fill: infoFill, alignment: { horizontal: "right", vertical: "middle" },
		});
		applyCell(ws.getCell(`F${r}`), {
			value: val,
			font: { name: "Roboto", bold: true, size: 8.5, color: { argb: "FF1A1D38" } },
			fill: infoFill, alignment: { horizontal: "right", vertical: "middle", indent: 1 },
		});
	};

	infoLeft("BILL TO", 4, false, 7.5);
	infoLeft(clientName, 5, true, 11);
	if (clientEmail) infoLeft(clientEmail, 6, false, 8.5);
	infoLeft(`${billing}  |  ${payTerms}`, clientEmail ? 7 : 6, false, 8);
	infoLeft(`Period: ${dateFrom} to ${dateTo}`, clientEmail ? 8 : 7, false, 8);

	infoRight("Invoice No.", `#${invoiceNumber}`, 4);
	infoRight("Issue Date",  issueDate,            5);
	infoRight("Due Date",    dueDate,               6);
	infoRight("Terms",       payTerms,              7);

	ws.getRow(4).height = 14; ws.getRow(5).height = 22;
	ws.getRow(6).height = 14; ws.getRow(7).height = 14;
	if (clientEmail) ws.getRow(8).height = 14;

	const sepRow = clientEmail ? 9 : 8;
	for (let c = 1; c <= COLS; c++) ws.getRow(sepRow).getCell(c).fill = fill(priArgb);
	ws.getRow(sepRow).height = 2;
	ws.getRow(sepRow + 1).height = 6;

	// ── Column headers ────────────────────────────────────────────────────────
	const hRowNum = sepRow + 2;
	const cols = buildClientCols(config);
	const hRow = ws.getRow(hRowNum);
	cols.forEach((col, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value = col.label;
		cell.font  = { name: "Bootshaus Regular", bold: true, size: 8, color: { argb: whiteArg } };
		cell.fill  = fill(priArgb);
		cell.alignment = { horizontal: col.align, vertical: "middle", indent: col.align === "left" ? 1 : 0 };
		cell.border = sideBdr(priArgb);
	});
	hRow.height = 20;

	ws.views = [{ state: "frozen", xSplit: 0, ySplit: hRowNum }];

	// ── Data rows ─────────────────────────────────────────────────────────────
	let row = hRowNum + 1;
	lineItems.forEach((item, idx) => {
		const r   = ws.getRow(row);
		const alt = idx % 2 === 1;
		buildClientRowValues(item, cols, idx + 1).forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value = val;
			cell.fill  = fill(alt ? "FFF5F6FB" : whiteArg);
			cell.border = sideBdr();
			if (cols[i].key === "title") {
				cell.font = { name: "Roboto", size: 9, color: { argb: "FF252840" } };
				cell.alignment = { horizontal: "left", vertical: "top", wrapText: true, indent: 1 };
			} else if (cols[i].key === "ticket_id") {
				cell.font = { name: "Courier New", size: 8, color: { argb: "FF9BA0B8" } };
				cell.alignment = { horizontal: "left", vertical: "middle" };
			} else {
				cell.font = { name: "Roboto", size: 9, color: { argb: "FF252840" } };
				cell.alignment = { horizontal: cols[i].align, vertical: "middle", indent: cols[i].align === "left" ? 1 : 0 };
			}
			if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
		});
		r.height = 20; row++;
	});

	if (lineItems.length === 0) {
		ws.mergeCells(`A${row}:${lastCol}${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: "No completed tickets found for this period.",
			font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFADB2C8" } },
			alignment: { horizontal: "center" },
		});
		row++;
	}

	ws.getRow(row).height = 8; row++;

	// ── Totals (boxed subtotal/discount, plain total due) ─────────────────────
	const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
	const discPct   = lineItems[0]?.discount_percent ?? 0;
	const hasDisc   = config.showDiscount && totalDisc > 0;

	const addBoxRow = (label: string, val: string, isFirst: boolean, isLast: boolean) => {
		ws.mergeCells(`A${row}:D${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: label,
			font: { name: "Roboto", size: 8.5, color: { argb: "FF9BA0B8" } },
			fill: fill(whiteArg),
			alignment: { horizontal: "right" },
			border: cellBdr(isFirst, isLast),
		});
		ws.mergeCells(`E${row}:${lastCol}${row}`);
		applyCell(ws.getCell(`E${row}`), {
			value: val,
			font: { name: "Roboto", size: 9, color: { argb: "FF252840" } },
			fill: fill(whiteArg),
			alignment: { horizontal: "right", indent: 1 },
			border: cellBdr(isFirst, isLast),
		});
		ws.getRow(row).height = 17; row++;
	};

	addBoxRow("Subtotal", currency(totalSub, cur), true, !hasDisc);
	if (hasDisc) addBoxRow(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`, false, true);

	// Total due — tinted fill, bold, no border
	ws.mergeCells(`A${row}:D${row}`);
	applyCell(ws.getCell(`A${row}`), {
		value: "TOTAL DUE",
		font: { name: "Bootshaus Regular", size: 9, bold: true, color: { argb: priArgb } },
		fill: fill(`FF${TINT_TOTAL}`),
		alignment: { horizontal: "right" },
	});
	ws.mergeCells(`E${row}:${lastCol}${row}`);
	applyCell(ws.getCell(`E${row}`), {
		value: currency(totalNet, cur),
		font: { name: "Roboto", size: 9, bold: true, color: { argb: priArgb } },
		fill: fill(`FF${TINT_TOTAL}`),
		alignment: { horizontal: "right", indent: 1 },
	});
	ws.getRow(row).height = 22; row++;

	// ── Footer ────────────────────────────────────────────────────────────────
	ws.getRow(row).height = 10; row++;
	const footFill = fill(`FF${TINT_FOOT}`);

	ws.mergeCells(`A${row}:C${row}`);
	applyCell(ws.getCell(`A${row}`), {
		value: `Payment Terms: ${payTerms}`,
		font: { name: "Roboto", size: 8, color: { argb: "FF6B7090" } },
		fill: footFill, alignment: { vertical: "middle", indent: 1 },
	});
	ws.mergeCells(`D${row}:${lastCol}${row}`);
	applyCell(ws.getCell(`D${row}`), {
		value: `Due by ${dueDate}`,
		font: { name: "Roboto", bold: true, size: 8.5, color: { argb: priArgb } },
		fill: footFill, alignment: { horizontal: "right", vertical: "middle", indent: 1 },
	});
	ws.getRow(row).height = 16; row++;

	ws.mergeCells(`A${row}:${lastCol}${row}`);
	applyCell(ws.getCell(`A${row}`), {
		value: config.footerNote || "Payment is due by the date specified above. Thank you for your business.",
		font: { name: "Roboto", italic: true, size: 8, color: { argb: "FFADB2C8" } },
		fill: footFill, alignment: { horizontal: "center", vertical: "middle" },
	});
	ws.getRow(row).height = 14;
}

// ── Full Tally ────────────────────────────────────────────────────────────────

function buildTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRI: string, pr: number, pg: number, pb: number,
	h: any,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const { fill, bdr, cellBdr, sideBdr, priArgb, whiteArg, TINT_TOTAL, TINT_FOOT, TINT_SUM } = h;

	// ── Sheet 1: Line items ───────────────────────────────────────────────────
	const ws = wb.addWorksheet("Billing Statement", {
		pageSetup: { fitToPage: true, fitToWidth: 1, orientation: "landscape" },
	});

	const cols = buildTallyCols(config);
	const COLS = cols.length;
	const lastCol = colLetter(COLS);

	// Column widths
	const widthMap: Record<string, number> = {
		client_name:    26,
		ticket_id:      10,
		title:          55,
		completed_at:   13,
		billable_hours: 10,
		rate:           13,
		subtotal:       15,
	};
	ws.columns = cols.map((c) => ({ width: widthMap[c.key] ?? 14 }));

	ws.headerFooter.oddHeader = `&L&"Bootshaus Regular,Bold"&14${orgName}&R&"Roboto,Normal"&9Billing Statement`;
	ws.headerFooter.oddFooter = `&C&"Roboto,Italic"&8${dateFrom} to ${dateTo}  |  Page &P of &N`;

	// Header band
	ws.mergeCells(`A1:${colLetter(Math.ceil(COLS / 2))}1`);
	ws.mergeCells(`${colLetter(Math.ceil(COLS / 2) + 1)}1:${lastCol}1`);
	applyCell(ws.getCell("A1"), {
		value: orgName,
		font: { name: "Bootshaus Regular", bold: true, size: 18, color: { argb: whiteArg } },
		fill: fill(priArgb), alignment: { vertical: "middle" },
	});
	applyCell(ws.getCell(`${colLetter(Math.ceil(COLS / 2) + 1)}1`), {
		value: "BILLING STATEMENT",
		font: { name: "Bootshaus Regular", bold: true, size: 9, color: { argb: "55FFFFFF" } },
		fill: fill(priArgb), alignment: { horizontal: "right", vertical: "middle", indent: 1 },
	});
	ws.getRow(1).height = 38;

	ws.mergeCells(`A2:${lastCol}2`);
	applyCell(ws.getCell("A2"), {
		value: `Statement No. ${invoiceNumber}  |  Period: ${dateFrom} to ${dateTo}  |  Issued ${issueDate}`,
		font: { name: "Roboto", size: 8, color: { argb: "AAFFFFFF" } },
		fill: fill(priArgb), alignment: { vertical: "middle" },
	});
	ws.getRow(2).height = 18;

	for (let c = 1; c <= COLS; c++) ws.getRow(3).getCell(c).fill = fill(`FF${tintHex(pr, pg, pb, 0.25)}`);
	ws.getRow(3).height = 4;
	ws.getRow(4).height = 8;

	// Column headers row 5
	const hRow = ws.getRow(5);
	cols.forEach((col, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value = col.label;
		cell.font  = { name: "Bootshaus Regular", bold: true, size: 8, color: { argb: whiteArg } };
		cell.fill  = fill(priArgb);
		cell.alignment = { horizontal: col.align, vertical: "middle", indent: col.align === "left" ? 1 : 0 };
		cell.border = sideBdr(priArgb);
	});
	hRow.height = 20;

	// Freeze header + column headers
	ws.views = [{ state: "frozen", xSplit: 0, ySplit: 5 }];
	// Auto-filter on column header row
	ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: COLS } };

	let row = 6;
	lineItems.forEach((item, idx) => {
		const r   = ws.getRow(row);
		const alt = idx % 2 === 1;
		buildTallyRowValues(item, cols).forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value = val;
			cell.fill  = fill(alt ? "FFF5F6FB" : whiteArg);
			cell.border = sideBdr();
			if (cols[i].key === "title") {
				cell.font = { name: "Roboto", size: 9, color: { argb: "FF252840" } };
				cell.alignment = { horizontal: "left", vertical: "top", wrapText: true, indent: 1 };
			} else if (cols[i].key === "ticket_id") {
				cell.font = { name: "Courier New", size: 8, color: { argb: "FF9BA0B8" } };
				cell.alignment = { horizontal: "left", vertical: "middle" };
			} else if (cols[i].key === "client_name") {
				cell.font = { name: "Roboto", size: 9, bold: false, color: { argb: "FF252840" } };
				cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
			} else {
				cell.font = { name: "Roboto", size: 9, color: { argb: "FF252840" } };
				cell.alignment = { horizontal: cols[i].align, vertical: "middle" };
			}
			if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
		});
		r.height = 20; row++;
	});

	if (lineItems.length === 0) {
		ws.mergeCells(`A${row}:${lastCol}${row}`);
		applyCell(ws.getCell(`A${row}`), {
			value: "No completed tickets found for this period.",
			font: { name: "Roboto", italic: true, size: 9, color: { argb: "FFADB2C8" } },
			alignment: { horizontal: "center" },
		});
		row++;
	}

	// ── Per-client totals section (grouped by client + currency) ─────────────
	ws.getRow(row).height = 12; row++;

	// Section header
	ws.mergeCells(`A${row}:${lastCol}${row}`);
	applyCell(ws.getCell(`A${row}`), {
		value: "CLIENT TOTALS",
		font: { name: "Bootshaus Regular", bold: true, size: 8, color: { argb: whiteArg } },
		fill: fill(priArgb), alignment: { vertical: "middle", indent: 1 },
	});
	ws.getRow(row).height = 18; row++;

	// Client totals header
	const summCols = ["Client", "Currency", "Tickets", config.showHours ? "Total Hours" : null, "Subtotal", "Discount", "Net Total"].filter(Boolean) as string[];
	summCols.forEach((label, i) => {
		const cell = ws.getRow(row).getCell(i + 1);
		cell.value = label;
		cell.font  = { name: "Bootshaus Regular", bold: true, size: 8, color: { argb: `FF${PRI}` } };
		cell.fill  = fill(`FF${TINT_SUM}`);
		cell.border = sideBdr(`FF${PRI}`);
		cell.alignment = { horizontal: i >= 2 ? "right" : "left", vertical: "middle", indent: i === 0 ? 1 : 0 };
	});
	ws.getRow(row).height = 18; row++;

	// Compute per-client summary
	type ClientRow = { name: string; currency: string; tickets: number; hours: number; subtotal: number; discount: number; net: number };
	const clientMap = new Map<string, ClientRow>();
	for (const item of lineItems) {
		const key = `${item.client_id ?? item.client_name}::${item.currency}`;
		const ex  = clientMap.get(key) ?? { name: item.client_name, currency: item.currency, tickets: 0, hours: 0, subtotal: 0, discount: 0, net: 0 };
		ex.tickets++;
		ex.hours    += item.billable_hours;
		ex.subtotal += item.subtotal;
		ex.discount += item.discount_amount;
		ex.net      += item.net_total;
		clientMap.set(key, ex);
	}

	let altIdx = 0;
	for (const cr of clientMap.values()) {
		const r   = ws.getRow(row);
		const alt = altIdx % 2 === 1;
		const vals = [cr.name, cr.currency, cr.tickets, ...(config.showHours ? [cr.hours] : []), cr.subtotal, cr.discount, cr.net];
		vals.forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value  = val;
			cell.fill   = fill(alt ? "FFF5F6FB" : whiteArg);
			cell.border = sideBdr();
			cell.font   = { name: "Roboto", size: 9, color: { argb: "FF252840" } };
			cell.alignment = { horizontal: i >= 2 ? "right" : "left", vertical: "middle", indent: i === 0 ? 1 : 0 };
			if (typeof val === "number" && i >= 2) cell.numFmt = "#,##0.00";
			if (i === 2) cell.numFmt = "0"; // tickets count
		});
		r.height = 18; row++; altIdx++;
	}

	// ── Footer ────────────────────────────────────────────────────────────────
	ws.getRow(row).height = 8; row++;
	const footFill = fill(`FF${TINT_FOOT}`);
	ws.mergeCells(`A${row}:${lastCol}${row}`);
	applyCell(ws.getCell(`A${row}`), {
		value: `Issued by ${orgName}  |  Period: ${dateFrom} to ${dateTo}  |  Generated ${issueDate}`,
		font: { name: "Roboto", italic: true, size: 8, color: { argb: "FFADB2C8" } },
		fill: footFill, alignment: { horizontal: "center", vertical: "middle" },
	});
	ws.getRow(row).height = 14;
}

// ── Column definitions ────────────────────────────────────────────────────────

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildClientCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",    label: "No.",         align: "left"  },
		{ key: "title",        label: "Description", align: "left"  },
		{ key: "completed_at", label: "Date",        align: "left"  },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hours",  align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "Rate",   align: "right", numFmt: "#,##0.00" });
	cols.push({ key: "subtotal", label: "Amount", align: "right", numFmt: "#,##0.00" });
	return cols;
}

function buildTallyCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "client_name",  label: "Client",      align: "left"  },
		{ key: "ticket_id",    label: "#",            align: "left"  },
		{ key: "title",        label: "Description",  align: "left"  },
		{ key: "completed_at", label: "Date",         align: "left"  },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hours",    align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "Rate",     align: "right", numFmt: "#,##0.00" });
	cols.push({ key: "subtotal", label: "Amount", align: "right", numFmt: "#,##0.00" });
	return cols;
}

function buildClientRowValues(item: any, cols: ColDef[], num: number): any[] {
	const map: Record<string, any> = {
		ticket_id:      item.ticket_id.slice(-6).toUpperCase(),
		title:          item.title,
		completed_at:   item.completed_at,
		billable_hours: item.billable_hours,
		rate:           item.rate,
		subtotal:       item.subtotal,
	};
	return cols.map((c) => map[c.key]);
}

function buildTallyRowValues(item: any, cols: ColDef[]): any[] {
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

function colLetter(n: number): string {
	return String.fromCharCode(64 + n);
}

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
