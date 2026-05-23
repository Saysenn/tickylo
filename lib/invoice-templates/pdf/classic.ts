import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, billingCycleLabel, dueDateFrom, rateTypeLabel } from "../helpers";

export async function buildClassicPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { default: autoTable } = await import("jspdf-autotable");

	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

	const PRIMARY = hexToRgb(config.primaryColor);
	const GRAY    = [100, 100, 100] as [number, number, number];
	const LIGHT   = [240, 244, 255] as [number, number, number];
	const W = 210; const MARGIN = 16;

	// ── Header ────────────────────────────────────────────────────────────────
	doc.setFillColor(...(PRIMARY as [number, number, number]));
	doc.rect(0, 0, W, 28, "F");

	// Logo
	let logoEndX = MARGIN;
	if (orgLogoUrl) {
		try {
			const imgData = await fetchImageAsBase64(orgLogoUrl);
			doc.addImage(imgData.data, imgData.ext, MARGIN, 6, 16, 16);
			logoEndX = MARGIN + 20;
		} catch {}
	}

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(16);
	doc.setTextColor(255, 255, 255);
	doc.text(orgName, logoEndX, 14);
	doc.setFontSize(9);
	doc.setFont(config.fontFamily, "normal");
	doc.text("INVOICE", logoEndX, 21);

	// Invoice number top-right
	doc.setFontSize(9);
	doc.setTextColor(200, 210, 255);
	doc.text(`#${invoiceNumber}`, W - MARGIN, 14, { align: "right" });
	doc.text(`Issued: ${issueDate}`, W - MARGIN, 21, { align: "right" });

	// ── Bill To / Period block ────────────────────────────────────────────────
	const first      = lineItems[0];
	const clientName = first?.client_name ?? "—";
	const clientEmail= first?.client_email ?? "";
	const cur        = first?.currency ?? "USD";
	const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));
	const billingCycle = billingCycleLabel(first?.billing_cycle ?? "per_ticket");

	let y = 36;
	doc.setTextColor(...GRAY);
	doc.setFontSize(7);
	doc.setFont(config.fontFamily, "bold");
	doc.text("BILL TO", MARGIN, y);
	doc.text("PERIOD", W / 2, y);

	y += 5;
	doc.setFontSize(12);
	doc.setFont(config.fontFamily, "bold");
	doc.setTextColor(...(PRIMARY as [number, number, number]));
	doc.text(type === "client" ? clientName : "All Clients — Full Tally", MARGIN, y);

	doc.setFontSize(9);
	doc.setFont(config.fontFamily, "normal");
	doc.setTextColor(...GRAY);
	doc.text(`${dateFrom}  →  ${dateTo}`, W / 2, y);

	y += 5;
	if (clientEmail && type === "client") {
		doc.setFontSize(9);
		doc.text(clientEmail, MARGIN, y);
	}
	doc.setFontSize(8);
	doc.text(`Issued: ${issueDate}   Due: ${dueDate}`, W / 2, y);

	y += 4;
	doc.setFontSize(8);
	doc.text(`${billingCycle}   ·   ${payTerms}`, MARGIN, y);

	y += 6;
	doc.setDrawColor(...GRAY);
	doc.setLineWidth(0.2);
	doc.line(MARGIN, y, W - MARGIN, y);
	y += 6;

	// ── Line items table ──────────────────────────────────────────────────────
	const visibleCols = buildCols(config);

	autoTable(doc, {
		startY: y,
		head:   [visibleCols.map((c) => c.label)],
		body:   lineItems.length > 0
			? lineItems.map((item) => visibleCols.map((c) => cellValue(item, c.key)))
			: [["No completed tickets found for this period."]],
		styles:       { fontSize: 8, cellPadding: 3, font: config.fontFamily },
		headStyles:   { fillColor: PRIMARY as [number, number, number], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
		alternateRowStyles: { fillColor: LIGHT },
		columnStyles: buildColStyles(visibleCols),
		margin: { left: MARGIN, right: MARGIN },
		tableWidth: "auto",
	});

	// ── Totals ────────────────────────────────────────────────────────────────
	const finalY = (doc as any).lastAutoTable.finalY + 6;
	const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
	const discPct   = lineItems[0]?.discount_percent ?? 0;

	let ty = finalY;
	const addTotalLine = (label: string, val: string, bold = false) => {
		doc.setFontSize(bold ? 10 : 8.5);
		doc.setFont(config.fontFamily, bold ? "bold" : "normal");
		const rgb = bold ? PRIMARY : GRAY;
		doc.setTextColor(rgb[0], rgb[1], rgb[2]);
		doc.text(label, W - MARGIN - 40, ty, { align: "right" });
		doc.text(val, W - MARGIN, ty, { align: "right" });
		ty += bold ? 6 : 5;
	};

	addTotalLine("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) addTotalLine(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);
	// net total box
	doc.setFillColor(232, 245, 232);
	doc.roundedRect(W - MARGIN - 55, ty - 3, 55, 10, 1, 1, "F");
	addTotalLine("NET TOTAL", currency(totalNet, cur), true);

	// Footer
	const footerY = 287;
	doc.setFontSize(7.5);
	doc.setFont(config.fontFamily, "italic");
	doc.setTextColor(160, 170, 190);
	doc.text(config.footerNote || `Payment due by ${dueDate}. Thank you for your business.`, W / 2, footerY, { align: "center" });

	return doc.output("arraybuffer");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; ext: string }> {
	const res = await fetch(url);
	if (!res.ok) throw new Error("Failed to fetch logo");
	const buf = await res.arrayBuffer();
	const ct  = res.headers.get("content-type") ?? "image/png";
	const ext = ct.includes("jpeg") || ct.includes("jpg") ? "JPEG" : "PNG";
	const b64 = Buffer.from(buf).toString("base64");
	return { data: `data:${ct};base64,${b64}`, ext };
}

interface ColDef { key: string; label: string; align: "left" | "center" | "right" }

function buildCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",    label: "Ref",     align: "left" },
		{ key: "title",        label: "Service", align: "left" },
		{ key: "employee",     label: "By",      align: "left" },
		{ key: "completed_at", label: "Date",    align: "center" },
		{ key: "rate_type",    label: "Type",    align: "center" },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hrs", align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "Rate", align: "right" });
	cols.push({ key: "subtotal", label: "Amount", align: "right" });
	return cols;
}

function buildColStyles(cols: ColDef[]): Record<number, any> {
	const styles: Record<number, any> = {};
	cols.forEach((c, i) => { styles[i] = { halign: c.align }; });
	return styles;
}

function cellValue(item: any, key: string): string {
	const map: Record<string, string> = {
		ticket_id:      item.ticket_id.slice(-6).toUpperCase(),
		title:          item.title,
		employee:       item.employee,
		completed_at:   item.completed_at,
		rate_type:      rateTypeLabel(item.rate_type),
		billable_hours: item.billable_hours.toFixed(2),
		rate:           item.rate.toFixed(2),
		subtotal:       item.subtotal.toFixed(2),
	};
	return map[key] ?? "";
}
