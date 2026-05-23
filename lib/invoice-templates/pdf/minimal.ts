import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Minimal PDF: logo small top-left, clean typography, borderless table, subtle footer

export async function buildMinimalPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { default: autoTable } = await import("jspdf-autotable");

	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

	const PRIMARY = hexToRgb(config.primaryColor);
	const W = 210; const MARGIN = 18;

	// ── Small logo + org name ─────────────────────────────────────────────────
	let y = 16;
	let logoEndX = MARGIN;
	if (orgLogoUrl) {
		try {
			const imgData = await fetchImageAsBase64(orgLogoUrl);
			doc.addImage(imgData.data, imgData.ext, MARGIN, y - 6, 12, 12);
			logoEndX = MARGIN + 15;
		} catch {}
	}

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(13);
	doc.setTextColor(...(PRIMARY as [number, number, number]));
	doc.text(orgName, logoEndX, y);

	// Invoice label top-right
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	doc.setTextColor(160, 175, 195);
	doc.text(`Invoice  ·  #${invoiceNumber}`, W - MARGIN, y, { align: "right" });

	y += 12;
	// Thin rule under header
	doc.setDrawColor(220, 225, 235);
	doc.setLineWidth(0.3);
	doc.line(MARGIN, y, W - MARGIN, y);
	y += 8;

	// ── Client info ───────────────────────────────────────────────────────────
	const first = lineItems[0];
	const clientName = type === "client" ? (first?.client_name ?? "—") : "All Clients — Full Tally";
	const clientEmail = first?.client_email ?? "";
	const cur = first?.currency ?? "USD";
	const payTerms = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(11);
	doc.setTextColor(30, 41, 59);
	doc.text(clientName, MARGIN, y);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8.5);
	doc.setTextColor(100, 115, 140);
	doc.text(`${dateFrom} — ${dateTo}`, W - MARGIN, y, { align: "right" });

	y += 5;
	if (clientEmail && type === "client") {
		doc.setFontSize(8.5);
		doc.setTextColor(150, 165, 185);
		doc.text(clientEmail, MARGIN, y);
	}
	doc.setFontSize(8);
	doc.setTextColor(150, 165, 185);
	doc.text(`Issued ${issueDate}   ·   Due ${dueDate}   ·   ${payTerms}`, W - MARGIN, y, { align: "right" });

	y += 10;

	// ── Line items table — borderless ────────────────────────────────────────
	const cols = buildCols(config);

	autoTable(doc, {
		startY: y,
		head:   [cols.map((c) => c.label.toUpperCase())],
		body:   lineItems.length > 0
			? lineItems.map((item) => cols.map((c) => cellValue(item, c.key)))
			: [["No tickets found for this period."]],
		styles: {
			fontSize: 8.5,
			cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 },
			font: config.fontFamily,
			lineColor: [230, 235, 245],
			lineWidth: 0.2,
		},
		headStyles: {
			fillColor: [255, 255, 255] as [number, number, number],
			textColor: [180, 195, 215] as [number, number, number],
			fontStyle: "bold",
			fontSize: 7,
			lineColor: [PRIMARY[0], PRIMARY[1], PRIMARY[2]] as [number, number, number],
			lineWidth: { bottom: 0.5 },
		},
		bodyStyles:        { fillColor: [255, 255, 255] as [number, number, number] },
		alternateRowStyles:{ fillColor: [250, 251, 254] as [number, number, number] },
		columnStyles:      buildColStyles(cols),
		margin:            { left: MARGIN, right: MARGIN },
	});

	// ── Totals ────────────────────────────────────────────────────────────────
	const fy = (doc as any).lastAutoTable.finalY + 8;
	const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
	const discPct   = lineItems[0]?.discount_percent ?? 0;

	let ty = fy;
	const row = (label: string, val: string, bold = false) => {
		doc.setFontSize(bold ? 10.5 : 8.5);
		doc.setFont(config.fontFamily, bold ? "bold" : "normal");
		doc.setTextColor(...(bold ? PRIMARY : [130, 145, 170]) as [number, number, number]);
		doc.text(label, W - MARGIN - 44, ty, { align: "right" });
		doc.text(val, W - MARGIN, ty, { align: "right" });
		ty += bold ? 7 : 5;
	};

	row("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) row(`Discount ${discPct}%`, `-${currency(totalDisc, cur)}`);
	// Accent line above total
	doc.setDrawColor(...(PRIMARY as [number, number, number]));
	doc.setLineWidth(0.4);
	doc.line(W - MARGIN - 58, ty - 2, W - MARGIN, ty - 2);
	ty += 1;
	row("Total Due", currency(totalNet, cur), true);

	// ── Footer ────────────────────────────────────────────────────────────────
	doc.setFontSize(7.5);
	doc.setFont(config.fontFamily, "italic");
	doc.setTextColor(190, 200, 215);
	doc.text(config.footerNote || "Thank you.", W / 2, 285, { align: "center" });

	return doc.output("arraybuffer");
}

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
	return { data: `data:${ct};base64,${Buffer.from(buf).toString("base64")}`, ext };
}

interface ColDef { key: string; label: string; align: "left" | "center" | "right" }

function buildCols(config: InvoiceConfig): ColDef[] {
	const cols: ColDef[] = [
		{ key: "ticket_id",    label: "Ref",         align: "left" },
		{ key: "title",        label: "Description", align: "left" },
		{ key: "employee",     label: "By",          align: "left" },
		{ key: "completed_at", label: "Date",        align: "center" },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "Hrs",    align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "Rate",   align: "right" });
	cols.push({ key: "subtotal", label: "Amount", align: "right" });
	return cols;
}

function buildColStyles(cols: ColDef[]): Record<number, any> {
	const s: Record<number, any> = {};
	cols.forEach((c, i) => { s[i] = { halign: c.align }; });
	return s;
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
