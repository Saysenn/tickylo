import type ExcelJS from "exceljs";
import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, billingCycleLabel, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

export async function buildClassicXlsx(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;
	const PRIMARY = config.primaryColor;
	const ACCENT  = config.accentColor;
	const SUBROW  = "F0F4FF";
	const TOTALBG = "E8F5E9";
	const BORDER  = "D0D7E8";

	function bdr(): Partial<ExcelJS.Borders> {
		const s = { style: "thin" as const, color: { argb: `FF${BORDER}` } };
		return { top: s, left: s, bottom: s, right: s };
	}
	function hdrFont(): Partial<ExcelJS.Font> {
		return { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
	}

	if (type === "client") {
		const ws = wb.addWorksheet("Invoice", { pageSetup: { fitToPage: true, fitToWidth: 1 } });
		ws.columns = [
			{ key: "A", width: 14 }, { key: "B", width: 36 }, { key: "C", width: 18 },
			{ key: "D", width: 14 }, { key: "E", width: 10 }, { key: "F", width: 10 },
			{ key: "G", width: 12 }, { key: "H", width: 14 },
		];

		const first      = lineItems[0];
		const clientName = first?.client_name ?? "—";
		const clientEmail= first?.client_email ?? "";
		const cur        = first?.currency ?? "USD";
		const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
		const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));
		const billingCycle = billingCycleLabel(first?.billing_cycle ?? "per_ticket");

		// Row 1: org name | INVOICE
		ws.mergeCells("A1:E1"); ws.mergeCells("F1:H1");
		const r1L = ws.getCell("A1");
		r1L.value = orgName; r1L.font = { bold: true, size: 16, color: { argb: `FF${ACCENT}` } };
		const r1R = ws.getCell("F1");
		r1R.value = "INVOICE"; r1R.font = { bold: true, size: 20, color: { argb: `FF${PRIMARY}` } };
		r1R.alignment = { horizontal: "right" };
		ws.getRow(1).height = 30;
		ws.getRow(2).height = 6;

		// Row 3-6: bill to (left) | invoice meta (right)
		ws.mergeCells("A3:E3"); ws.getCell("A3").value = "BILL TO";
		ws.getCell("A3").font = { bold: true, size: 8, color: { argb: "FF999999" } };
		ws.mergeCells("A4:E4"); ws.getCell("A4").value = clientName;
		ws.getCell("A4").font = { bold: true, size: 13, color: { argb: `FF${PRIMARY}` } };
		ws.mergeCells("A5:E5"); ws.getCell("A5").value = clientEmail || " ";
		ws.getCell("A5").font = { size: 10, color: { argb: "FF666688" } };
		ws.mergeCells("A6:E6"); ws.getCell("A6").value = `Billing: ${billingCycle}   ·   Terms: ${payTerms}`;
		ws.getCell("A6").font = { size: 10, italic: true, color: { argb: "FF888888" } };

		ws.mergeCells("F3:H3"); ws.getCell("F3").value = `# ${invoiceNumber}`;
		ws.getCell("F3").font = { bold: true, size: 11, color: { argb: `FF${PRIMARY}` } };
		ws.getCell("F3").alignment = { horizontal: "right" };
		ws.mergeCells("F4:H4"); ws.getCell("F4").value = `Period: ${dateFrom} → ${dateTo}`;
		ws.getCell("F4").font = { size: 10, color: { argb: "FF666688" } }; ws.getCell("F4").alignment = { horizontal: "right" };
		ws.mergeCells("F5:H5"); ws.getCell("F5").value = `Issued: ${issueDate}   Due: ${dueDate}`;
		ws.getCell("F5").font = { size: 10, color: { argb: "FF666688" } }; ws.getCell("F5").alignment = { horizontal: "right" };
		ws.getRow(7).height = 10;

		// Column headers
		const visibleCols = buildVisibleColumns(config);
		const headerRow = ws.getRow(8);
		visibleCols.forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h.label;
			cell.font = hdrFont();
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
			cell.border = bdr();
			cell.alignment = { horizontal: h.align, vertical: "middle" };
		});
		headerRow.height = 22;

		// Line items
		let row = 9;
		for (const item of lineItems) {
			const r = ws.getRow(row);
			const fillColor = row % 2 === 0 ? `FF${SUBROW}` : "FFFFFFFF";
			const vals = buildRowValues(item, visibleCols);
			vals.forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value = val;
				cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
				cell.border = bdr();
				cell.font = { size: 10, color: { argb: "FF333355" } };
				if (visibleCols[i].key === "ticket_id") cell.font = { name: "Courier New", size: 9 };
				if (visibleCols[i].align === "right") cell.alignment = { horizontal: "right" };
				if (visibleCols[i].numFmt) cell.numFmt = visibleCols[i].numFmt!;
			});
			r.height = 18;
			row++;
		}

		if (lineItems.length === 0) {
			ws.mergeCells(`A9:H9`);
			ws.getCell("A9").value = "No completed tickets found for this period.";
			ws.getCell("A9").font = { italic: true, color: { argb: "FF999999" }, size: 10 };
			ws.getCell("A9").alignment = { horizontal: "center" };
			row = 10;
		}

		// Totals
		const totalHrs  = lineItems.reduce((s, i) => s + i.billable_hours, 0);
		const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
		const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
		const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
		const discPct   = lineItems[0]?.discount_percent ?? 0;
		row++;

		const addTotal = (label: string, value: string, bold = false, bg?: string) => {
			ws.mergeCells(`A${row}:F${row}`);
			const lc = ws.getCell(`A${row}`);
			lc.value = label; lc.font = { size: 10, bold, color: { argb: "FF444466" } };
			lc.alignment = { horizontal: "right" };
			ws.mergeCells(`G${row}:H${row}`);
			const vc = ws.getCell(`G${row}`);
			vc.value = value; vc.font = { size: 11, bold, color: { argb: bold ? `FF${PRIMARY}` : "FF555577" } };
			vc.alignment = { horizontal: "right" }; vc.border = bdr();
			if (bg) vc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
			ws.getRow(row).height = 20; row++;
		};

		addTotal(`Total Billable Hours: ${totalHrs.toFixed(2)} hrs`, `Subtotal: ${currency(totalSub, cur)}`);
		if (config.showDiscount && totalDisc > 0)
			addTotal(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);
		addTotal("NET TOTAL", currency(totalNet, cur), true, `FF${TOTALBG}`);

		row++;
		ws.mergeCells(`A${row}:H${row}`);
		const footer = ws.getCell(`A${row}`);
		footer.value = config.footerNote || `Payment due by ${dueDate}.`;
		footer.font = { italic: true, size: 9, color: { argb: "FF999999" } };
		footer.alignment = { horizontal: "center" };

	} else {
		// Full tally — two sheets
		buildTallySheets(wb, data, config, PRIMARY, ACCENT, SUBROW, bdr, hdrFont);
	}
}

function buildTallySheets(
	wb: ExcelJS.Workbook,
	data: InvoiceData,
	config: InvoiceConfig,
	PRIMARY: string,
	ACCENT: string,
	SUBROW: string,
	bdr: () => Partial<ExcelJS.Borders>,
	hdrFont: () => Partial<ExcelJS.Font>,
) {
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo } = data;
	const grouped = new Map<string, typeof lineItems>();
	for (const item of lineItems) {
		if (!grouped.has(item.client_name)) grouped.set(item.client_name, []);
		grouped.get(item.client_name)!.push(item);
	}

	// Sheet 1: Line Items
	const ws1 = wb.addWorksheet("Line Items", { pageSetup: { fitToPage: true, fitToWidth: 1 } });
	ws1.columns = [
		{ key: "A", width: 14 }, { key: "B", width: 30 }, { key: "C", width: 20 },
		{ key: "D", width: 18 }, { key: "E", width: 14 }, { key: "F", width: 10 },
		{ key: "G", width: 10 }, { key: "H", width: 10 }, { key: "I", width: 14 },
		{ key: "J", width: 10 }, { key: "K", width: 14 },
	];

	ws1.mergeCells("A1:K1");
	ws1.getCell("A1").value = `${orgName}  —  Full Billing Tally  —  ${dateFrom} to ${dateTo}`;
	ws1.getCell("A1").font = { bold: true, size: 13, color: { argb: `FF${PRIMARY}` } };
	ws1.getRow(1).height = 26;
	ws1.mergeCells("A2:K2");
	ws1.getCell("A2").value = `Invoice: ${invoiceNumber}   Issued: ${issueDate}`;
	ws1.getCell("A2").font = { size: 10, color: { argb: "FF888888" } };
	ws1.getRow(2).height = 16;
	ws1.getRow(3).height = 8;

	const cols1 = ["Ticket #", "Title", "Client", "Employee", "Completed", "Rate Type", "Hrs", "Rate", "Currency", "Subtotal", "Net Total"];
	const hdr1 = ws1.getRow(4);
	cols1.forEach((h, i) => {
		const cell = hdr1.getCell(i + 1);
		cell.value = h; cell.font = hdrFont();
		cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
		cell.border = bdr();
		cell.alignment = { horizontal: i >= 6 ? "right" : "left", vertical: "middle" };
	});
	hdr1.height = 22;

	let row = 5;
	const grandTotals: Record<string, { hours: number; billed: number; net: number }> = {};

	for (const [clientName, items] of grouped) {
		ws1.mergeCells(`A${row}:K${row}`);
		const gl = ws1.getCell(`A${row}`);
		gl.value = clientName; gl.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
		gl.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${ACCENT}` } };
		gl.alignment = { indent: 1 }; ws1.getRow(row).height = 18; row++;

		for (const item of items) {
			const r = ws1.getRow(row);
			const fillColor = row % 2 === 0 ? `FF${SUBROW}` : "FFFFFFFF";
			const cells = [
				item.ticket_id.slice(-6).toUpperCase(), item.title, item.client_name, item.employee,
				item.completed_at, rateTypeLabel(item.rate_type), item.billable_hours, item.rate,
				item.currency, item.subtotal, item.net_total,
			];
			cells.forEach((val, i) => {
				const cell = r.getCell(i + 1);
				cell.value = val; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
				cell.border = bdr(); cell.font = { size: 10 };
				if (i === 0) cell.font = { name: "Courier New", size: 9 };
				if (i >= 6) cell.alignment = { horizontal: "right" };
				if (i >= 9) cell.numFmt = "#,##0.00";
			});
			r.height = 18; row++;
		}

		const clientHours = items.reduce((s, i) => s + i.billable_hours, 0);
		const clientBilled = items.reduce((s, i) => s + i.subtotal, 0);
		const clientNet = items.reduce((s, i) => s + i.net_total, 0);
		const cur = items[0]?.currency ?? "USD";
		ws1.mergeCells(`A${row}:F${row}`);
		ws1.getCell(`A${row}`).value = `Subtotal — ${clientName}`;
		ws1.getCell(`A${row}`).font = { bold: true, size: 10, color: { argb: `FF${PRIMARY}` } };
		ws1.getCell(`A${row}`).alignment = { horizontal: "right" };
		ws1.getCell(`G${row}`).value = clientHours.toFixed(2); ws1.getCell(`G${row}`).font = { bold: true, size: 10 }; ws1.getCell(`G${row}`).alignment = { horizontal: "right" };
		ws1.getCell(`J${row}`).value = currency(clientBilled, cur); ws1.getCell(`J${row}`).font = { bold: true, size: 10 }; ws1.getCell(`J${row}`).alignment = { horizontal: "right" };
		ws1.getCell(`K${row}`).value = currency(clientNet, cur); ws1.getCell(`K${row}`).font = { bold: true, size: 10, color: { argb: `FF${PRIMARY}` } }; ws1.getCell(`K${row}`).alignment = { horizontal: "right" };
		ws1.getRow(row).height = 18; row++;
		ws1.getRow(row).height = 6; row++;

		if (!grandTotals[cur]) grandTotals[cur] = { hours: 0, billed: 0, net: 0 };
		grandTotals[cur].hours += clientHours; grandTotals[cur].billed += clientBilled; grandTotals[cur].net += clientNet;
	}

	row++;
	for (const [cur, totals] of Object.entries(grandTotals)) {
		ws1.mergeCells(`A${row}:F${row}`);
		ws1.getCell(`A${row}`).value = `GRAND TOTAL (${cur})`;
		ws1.getCell(`A${row}`).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
		ws1.getCell(`A${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
		ws1.getCell(`A${row}`).alignment = { horizontal: "right" };
		for (const [col, val] of Object.entries({ G: totals.hours.toFixed(2), J: currency(totals.billed, cur), K: currency(totals.net, cur) })) {
			const cell = ws1.getCell(`${col}${row}`);
			cell.value = val; cell.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
			cell.alignment = { horizontal: "right" };
		}
		ws1.getRow(row).height = 22; row++;
	}

	// Sheet 2: Summary
	const ws2 = wb.addWorksheet("Summary");
	ws2.columns = [
		{ key: "A", width: 28 }, { key: "B", width: 10 }, { key: "C", width: 12 },
		{ key: "D", width: 10 }, { key: "E", width: 14 }, { key: "F", width: 14 },
		{ key: "G", width: 14 }, { key: "H", width: 16 }, { key: "I", width: 16 },
	];
	ws2.mergeCells("A1:I1");
	ws2.getCell("A1").value = `${orgName}  —  Billing Summary  —  ${dateFrom} to ${dateTo}`;
	ws2.getCell("A1").font = { bold: true, size: 13, color: { argb: `FF${PRIMARY}` } };
	ws2.getRow(1).height = 26; ws2.getRow(2).height = 8;

	const cols2 = ["Client", "Currency", "Billing Cycle", "Tickets", "Total Hours", "Subtotal", "Discount", "Net Payable", "Payment Terms"];
	const hdr2 = ws2.getRow(3);
	cols2.forEach((h, i) => {
		const cell = hdr2.getCell(i + 1); cell.value = h; cell.font = hdrFont();
		cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${PRIMARY}` } };
		cell.border = bdr(); cell.alignment = { horizontal: i >= 3 ? "right" : "left", vertical: "middle" };
	});
	hdr2.height = 22;

	let srow = 4;
	for (const [clientName, items] of grouped) {
		const cur = items[0]?.currency ?? "USD";
		const totalHours = Math.round(items.reduce((s, i) => s + i.billable_hours, 0) * 100) / 100;
		const totalBilled = Math.round(items.reduce((s, i) => s + i.subtotal, 0) * 100) / 100;
		const totalDisc = Math.round(items.reduce((s, i) => s + i.discount_amount, 0) * 100) / 100;
		const totalNet = Math.round(items.reduce((s, i) => s + i.net_total, 0) * 100) / 100;
		const vals = [clientName, cur, billingCycleLabel(items[0]?.billing_cycle ?? "per_ticket"), items.length, totalHours, totalBilled, totalDisc, totalNet, paymentTermsLabel(items[0]?.payment_terms ?? "net_30")];
		const r = ws2.getRow(srow);
		vals.forEach((val, i) => {
			const cell = r.getCell(i + 1); cell.value = val; cell.font = { size: 10 };
			cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: srow % 2 === 0 ? `FF${SUBROW}` : "FFFFFFFF" } };
			cell.border = bdr();
			if (i >= 3) cell.alignment = { horizontal: "right" };
			if (i === 7) cell.font = { size: 10, bold: true, color: { argb: `FF${PRIMARY}` } };
		});
		r.height = 18; srow++;
	}
}

// ── Column visibility helpers ─────────────────────────────────────────────────

interface ColDef { key: string; label: string; align: "left" | "right"; numFmt?: string }

function buildVisibleColumns(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",   label: "Ticket #",  align: "left" },
		{ key: "title",       label: "Title",     align: "left" },
		{ key: "employee",    label: "Employee",  align: "left" },
		{ key: "completed_at",label: "Completed", align: "left" },
		{ key: "rate_type",   label: "Rate Type", align: "left" },
	];
	if (config.showHours)    cols.push({ key: "billable_hours", label: "Hrs",    align: "right" });
	if (config.showRate)     cols.push({ key: "rate",           label: "Rate",   align: "right", numFmt: "#,##0.00" });
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
