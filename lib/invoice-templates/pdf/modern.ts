import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Modern PDF: full-width colored banner, two-column info block, clean table

export async function buildModernPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { default: autoTable } = await import("jspdf-autotable");

	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

	const PRIMARY = hexToRgb(config.primaryColor);
	const W = 210; const MARGIN = 16;

	// ── Full-width banner ─────────────────────────────────────────────────────
	doc.setFillColor(...(PRIMARY as [number, number, number]));
	doc.rect(0, 0, W, 38, "F");

	// Logo left
	let textX = MARGIN;
	if (orgLogoUrl) {
		try {
			const imgData = await fetchImageAsBase64(orgLogoUrl);
			doc.addImage(imgData.data, imgData.ext, MARGIN, 8, 18, 18);
			textX = MARGIN + 22;
		} catch {}
	}

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(18);
	doc.setTextColor(255, 255, 255);
	doc.text(orgName.toUpperCase(), textX, 18);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(9);
	doc.setTextColor(180, 200, 255);
	doc.text(`Invoice  #${invoiceNumber}`, textX, 26);

	// Right side of banner
	doc.setFontSize(9);
	doc.setTextColor(180, 200, 255);
	doc.text(`Issued: ${issueDate}`, W - MARGIN, 18, { align: "right" });
	const first = lineItems[0];
	const dueDate = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));
	doc.text(`Due: ${dueDate}`, W - MARGIN, 26, { align: "right" });

	// ── Two-column info block ─────────────────────────────────────────────────
	let y = 46;
	const mid = W / 2 + 4;
	const cur = first?.currency ?? "USD";
	const clientName = first?.client_name ?? (type === "tally" ? "All Clients" : "—");
	const payTerms = paymentTermsLabel(first?.payment_terms ?? "net_30");

	doc.setFontSize(7);
	doc.setFont(config.fontFamily, "bold");
	doc.setTextColor(180, 190, 210);
	doc.text("CLIENT", MARGIN, y);
	doc.text("PERIOD", mid, y);

	y += 5;
	doc.setFontSize(11);
	doc.setFont(config.fontFamily, "bold");
	doc.setTextColor(...(PRIMARY as [number, number, number]));
	doc.text(clientName, MARGIN, y);

	doc.setFontSize(9);
	doc.setFont(config.fontFamily, "normal");
	doc.setTextColor(80, 90, 120);
	doc.text(`${dateFrom}  —  ${dateTo}`, mid, y);

	y += 5;
	if (first?.client_email && type === "client") {
		doc.setFontSize(8.5);
		doc.setTextColor(100, 110, 140);
		doc.text(first.client_email, MARGIN, y);
	}
	doc.setFontSize(8.5);
	doc.setTextColor(100, 110, 140);
	doc.text(payTerms, mid, y);

	y += 8;

	// ── Line items table ──────────────────────────────────────────────────────
	const cols = buildCols(config);

	autoTable(doc, {
		startY: y,
		head:   [cols.map((c) => c.label)],
		body:   lineItems.length > 0
			? lineItems.map((item) => cols.map((c) => cellValue(item, c.key)))
			: [["No tickets found for this period."]],
		styles:          { fontSize: 8, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, font: config.fontFamily },
		headStyles:      { fillColor: [241, 245, 249] as [number, number, number], textColor: PRIMARY as [number, number, number], fontStyle: "bold", fontSize: 7.5 },
		alternateRowStyles: { fillColor: [245, 247, 255] as [number, number, number] },
		columnStyles:    buildColStyles(cols),
		margin:          { left: MARGIN, right: MARGIN },
	});

	// ── Totals ────────────────────────────────────────────────────────────────
	const fy = (doc as any).lastAutoTable.finalY + 6;
	const totalSub  = lineItems.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = lineItems.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = lineItems.reduce((s, i) => s + i.net_total, 0);
	const discPct   = lineItems[0]?.discount_percent ?? 0;

	let ty = fy;
	const row = (label: string, val: string, bold = false) => {
		doc.setFontSize(bold ? 10 : 8.5);
		doc.setFont(config.fontFamily, bold ? "bold" : "normal");
		doc.setTextColor(...(bold ? PRIMARY : [100, 110, 140]) as [number, number, number]);
		doc.text(label, W - MARGIN - 42, ty, { align: "right" });
		doc.text(val, W - MARGIN, ty, { align: "right" });
		ty += bold ? 7 : 5;
	};

	row("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) row(`Discount ${discPct}%`, `-${currency(totalDisc, cur)}`);
	doc.setFillColor(234, 244, 234);
	doc.roundedRect(W - MARGIN - 58, ty - 3, 58, 11, 1.5, 1.5, "F");
	row("TOTAL DUE", currency(totalNet, cur), true);

	// Footer bar
	doc.setFillColor(...(PRIMARY as [number, number, number]));
	doc.rect(0, 284, W, 14, "F");
	doc.setFontSize(7.5);
	doc.setFont(config.fontFamily, "italic");
	doc.setTextColor(180, 200, 255);
	doc.text(config.footerNote || "Thank you for your business.", W / 2, 292, { align: "center" });

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
		{ key: "ticket_id", label: "REF", align: "left" },
		{ key: "title", label: "DESCRIPTION", align: "left" },
		{ key: "employee", label: "ASSIGNEE", align: "left" },
		{ key: "completed_at", label: "DATE", align: "center" },
	];
	if (config.showHours) cols.push({ key: "billable_hours", label: "HRS", align: "right" });
	if (config.showRate)  cols.push({ key: "rate",           label: "RATE", align: "right" });
	cols.push({ key: "subtotal", label: "AMOUNT", align: "right" });
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
