import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Modern — creative agency
// Bold org name, editorial column naming (Deliverable / Creative / Fee), generous whitespace,
// no cell borders on data rows — just bottom-line separators. Feels like a studio sends it.

export async function buildModernXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRI  = config.primaryColor;
	const PALE = "F8F9FC";

	const bottom = (c = "E4E8F2"): Partial<ExcelJS.Borders> =>
		({ bottom: { style: "thin" as const, color: { argb: `FF${c}` } } });

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice");
		ws.columns = [
			{ key: "A", width: 12 }, { key: "B", width: 40 }, { key: "C", width: 18 },
			{ key: "D", width: 12 }, { key: "E", width: 10 }, { key: "F", width: 12 },
			{ key: "G", width: 14 },
		];

		const first      = lineItems[0];
		const clientName = first?.client_name ?? "—";
		const cur        = first?.currency ?? "USD";
		const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

		// ── Studio header — two rows ──────────────────────────────────────────
		ws.mergeCells("A1:G1");
		ws.getCell("A1").value = orgName.toUpperCase();
		ws.getCell("A1").font  = { bold: true, size: 22, color: { argb: `FF${PRI}` } };
		ws.getRow(1).height = 36;

		ws.mergeCells("A2:D2"); ws.mergeCells("E2:G2");
		ws.getCell("A2").value = `Invoice  #${invoiceNumber}`;
		ws.getCell("A2").font  = { size: 9, color: { argb: "FFA8AEC8" } };
		ws.getCell("E2").value = `${dateFrom}  —  ${dateTo}`;
		ws.getCell("E2").font  = { size: 9, color: { argb: "FFA8AEC8" } };
		ws.getCell("E2").alignment = { horizontal: "right" };
		ws.getRow(2).height = 14;

		// Full-width primary rule
		ws.mergeCells("A3:G3");
		ws.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRI}` } };
		ws.getRow(3).height = 3;

		ws.getRow(4).height = 10;

		// ── Client + meta ─────────────────────────────────────────────────────
		ws.mergeCells("A5:D5"); ws.mergeCells("E5:G5");
		ws.getCell("A5").value = clientName;
		ws.getCell("A5").font  = { bold: true, size: 15, color: { argb: `FF${PRI}` } };
		ws.getCell("E5").value = `Issued ${issueDate}`;
		ws.getCell("E5").font  = { size: 9, color: { argb: "FFA8AEC8" } };
		ws.getCell("E5").alignment = { horizontal: "right" };
		ws.getRow(5).height = 22;

		ws.mergeCells("A6:D6"); ws.mergeCells("E6:G6");
		ws.getCell("A6").value = payTerms;
		ws.getCell("A6").font  = { size: 9, color: { argb: "FFA8AEC8" } };
		ws.getCell("E6").value = `Due ${dueDate}`;
		ws.getCell("E6").font  = { size: 9, color: { argb: "FFA8AEC8" } };
		ws.getCell("E6").alignment = { horizontal: "right" };
		ws.getRow(6).height = 14;

		ws.getRow(7).height = 8;

		// ── Column headers — no fill, just bottom rule + small caps style ─────
		const cols = buildCols(config);
		const hRow = ws.getRow(8);
		cols.forEach((c, i) => {
			const cell = hRow.getCell(i + 1);
			cell.value = c.label.toUpperCase();
			cell.font  = { size: 7.5, bold: true, color: { argb: "FFC0C6DC" } };
			cell.alignment = { horizontal: c.align };
			cell.border = { bottom: { style: "medium" as const, color: { argb: `FF${PRI}` } } };
		});
		hRow.height = 16;

		// ── Data rows — bottom borders only, alternating pale background ──────
		let row = 9;
		for (const item of lineItems) {
			const r = ws.getRow(row);
			const alt = row % 2 === 0;
			buildRowValues(item, cols).forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value = val;
				cell.font  = { size: 10, color: { argb: "FF252840" } };
				cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: alt ? `FF${PALE}` : "FFFFFFFF" } };
				cell.border = bottom();
				if (cols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 8.5, color: { argb: "FFA8AEC8" } };
				if (cols[i].align === "right") cell.alignment = { horizontal: "right" };
				if (cols[i].numFmt) cell.numFmt = cols[i].numFmt!;
			});
			r.height = 18; row++;
		}

		if (lineItems.length === 0) {
			ws.mergeCells(`A9:G9`);
			ws.getCell("A9").value = "No completed tickets found for this period.";
			ws.getCell("A9").font  = { italic: true, size: 9, color: { argb: "FFA8AEC8" } };
			ws.getCell("A9").alignment = { horizontal: "center" };
			row = 10;
		}

		ws.getRow(row).height = 8; row++;

		// ── Totals — right-aligned, no borders ───────────────────────────────
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;

		const addTot = (label: string, val: string, bold = false) => {
			ws.mergeCells(`A${row}:E${row}`);
			ws.getCell(`A${row}`).value = label;
			ws.getCell(`A${row}`).font  = { size: 9, bold, color: { argb: "FFA8AEC8" } };
			ws.getCell(`A${row}`).alignment = { horizontal: "right" };
			ws.mergeCells(`F${row}:G${row}`);
			ws.getCell(`F${row}`).value = val;
			ws.getCell(`F${row}`).font  = { size: bold ? 12 : 10, bold, color: { argb: bold ? `FF${PRI}` : "FF252840" } };
			ws.getCell(`F${row}`).alignment = { horizontal: "right" };
			ws.getRow(row).height = bold ? 24 : 17; row++;
		};

		addTot("Subtotal", currency(totalSub, cur));
		if (config.showDiscount && totalDisc > 0) addTot(`Discount ${discPct}%`, `− ${currency(totalDisc, cur)}`);
		addTot("TOTAL DUE", currency(totalNet, cur), true);

		ws.getRow(row).height = 8; row++;
		ws.mergeCells(`A${row}:G${row}`);
		ws.getCell(`A${row}`).value = config.footerNote || "Thank you for your business.";
		ws.getCell(`A${row}`).font  = { italic: true, size: 8.5, color: { argb: "FFC8CEDF" } };
		ws.getCell(`A${row}`).alignment = { horizontal: "center" };

	} else {
		buildModernTally(wb, data, config, PRI, PALE, bottom);
	}
}

function buildModernTally(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRI: string,
	PALE: string,
	bottom: (c?: string) => Partial<ExcelJS.Borders>,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const grouped = new Map<string, typeof lineItems>();
	for (const item of lineItems) {
		if (!grouped.has(item.client_name)) grouped.set(item.client_name, []);
		grouped.get(item.client_name)!.push(item);
	}

	const ws = wb.addWorksheet("Studio Tally");
	ws.columns = [
		{ key: "A", width: 28 }, { key: "B", width: 10 }, { key: "C", width: 12 },
		{ key: "D", width: 10 }, { key: "E", width: 14 }, { key: "F", width: 14 },
		{ key: "G", width: 16 },
	];

	ws.mergeCells("A1:G1");
	ws.getCell("A1").value = orgName.toUpperCase();
	ws.getCell("A1").font  = { bold: true, size: 18, color: { argb: `FF${PRI}` } };
	ws.getRow(1).height = 30;

	ws.mergeCells("A2:G2");
	ws.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRI}` } };
	ws.getRow(2).height = 3;

	ws.mergeCells("A3:G3");
	ws.getCell("A3").value = `Full Tally  ·  ${invoiceNumber}  ·  ${dateFrom} — ${dateTo}  ·  Issued ${issueDate}`;
	ws.getCell("A3").font  = { size: 8.5, color: { argb: "FFA8AEC8" } };
	ws.getRow(3).height = 14; ws.getRow(4).height = 8;

	const hdrs = ["Client", "Currency", "Cycle", "Deliverables", "Hours", "Subtotal", "Net Fee"];
	const hRow = ws.getRow(5);
	hdrs.forEach((h, i) => {
		const cell = hRow.getCell(i + 1);
		cell.value = h.toUpperCase(); cell.font = { size: 7.5, bold: true, color: { argb: "FFC0C6DC" } };
		cell.alignment = { horizontal: i >= 3 ? "right" : "left" };
		cell.border = { bottom: { style: "medium" as const, color: { argb: `FF${PRI}` } } };
	});
	hRow.height = 16;

	let row = 6;
	for (const [clientName, items] of grouped) {
		const cur   = items[0]?.currency ?? "USD";
		const hours = Math.round(items.reduce((s, i) => s + i.billable_hours, 0) * 100) / 100;
		const sub   = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
		const net   = Math.round(items.reduce((s, i) => s + i.net_total, 0) * 100) / 100;
		const alt   = row % 2 === 0;
		const vals  = [clientName, cur, items[0]?.billing_cycle ?? "per_ticket", items.length, hours, sub, net];
		const r = ws.getRow(row);
		vals.forEach((val, i) => {
			const cell = r.getCell(i + 1);
			cell.value = val; cell.font = { size: 10, color: { argb: "FF252840" } };
			cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: alt ? `FF${PALE}` : "FFFFFFFF" } };
			cell.border = bottom();
			if (i >= 3) cell.alignment = { horizontal: "right" };
			if (i === 6) cell.font = { size: 10, bold: true, color: { argb: `FF${PRI}` } };
		});
		r.height = 18; row++;
	}
}

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",    label: "Ref",         align: "left" },
		{ key: "title",        label: "Deliverable", align: "left" },
		{ key: "employee",     label: "Creative",    align: "left" },
		{ key: "completed_at", label: "Date",        align: "left" },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hours", align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "Rate",  align: "right", numFmt: "#,##0.00" });
	cols.push({ key: "subtotal", label: "Fee", align: "right", numFmt: "#,##0.00" });
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
