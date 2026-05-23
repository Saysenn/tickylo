import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";
import { registerFont } from "../font-loader";

// Site palette
const INK  = [13,  31,  20]  as const;
const INK2 = [58,  94,  74]  as const;
const INK3 = [122, 158, 136] as const;

export async function buildModernPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const P   = hexToRgb(config.primaryColor);
	const W   = 210, M = 18;

	const bootsBase64  = config.fonts?.["Bootshaus"];
	const robotoBase64 = config.fonts?.["Roboto"];
	if (bootsBase64) {
		registerFont(doc as any, "Bootshaus", bootsBase64, "normal");
		registerFont(doc as any, "Bootshaus", bootsBase64, "bold");
	}
	if (robotoBase64) {
		registerFont(doc as any, "Roboto", robotoBase64, "normal");
		registerFont(doc as any, "Roboto", robotoBase64, "bold");
	}
	const HF = bootsBase64  ? "Bootshaus" : "helvetica";
	const NF = robotoBase64 ? "Roboto"    : "helvetica";

	const ink    = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
	const stroke = (r: number, g: number, b: number, w = 0.15) => { doc.setDrawColor(r, g, b); doc.setLineWidth(w); };
	const hline  = (y: number) => { stroke(INK3[0], INK3[1], INK3[2], 0.12); doc.line(M, y, W - M, y); };

	const first       = lineItems[0];
	const clientName  = type === "client" ? (first?.client_name ?? "") : "All Clients";
	const clientEmail = first?.client_email ?? "";
	const cur         = first?.currency ?? "USD";
	const payTerms    = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate     = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	// ── Right-bleed accent panel ──────────────────────────────────────────────
	const PANEL_W = 68, PANEL_H = 38, PANEL_X = W - PANEL_W;
	doc.setFillColor(INK[0], INK[1], INK[2]);
	doc.rect(PANEL_X, 0, PANEL_W, PANEL_H, "F");

	const pX = PANEL_X + 6;
	doc.setFont(HF, "bold"); doc.setFontSize(9); ink(P[0], P[1], P[2]);
	doc.text("INVOICE", pX, 11);

	doc.setFont(NF, "normal"); doc.setFontSize(5.5); ink(INK3[0], INK3[1], INK3[2]);
	const numSlice = (doc.splitTextToSize(invoiceNumber, 56) as string[]).slice(0, 2);
	numSlice.forEach((l, i) => doc.text(l, pX, 17 + i * 4.5));

	const issuedY = 17 + numSlice.length * 4.5;
	doc.setFont(HF, "normal"); doc.setFontSize(6.5); ink(INK3[0], INK3[1], INK3[2]);
	doc.text("Issued", pX, issuedY);
	doc.setFont(NF, "normal"); doc.text(issueDate, pX + doc.getTextWidth("Issued  "), issuedY);
	doc.setFont(HF, "normal"); doc.text("Due",    pX, issuedY + 5);
	doc.setFont(NF, "normal"); doc.text(dueDate,  pX + doc.getTextWidth("Due     "), issuedY + 5);

	// ── Left header ───────────────────────────────────────────────────────────
	doc.setFont(HF, "bold"); doc.setFontSize(15); ink(INK[0], INK[1], INK[2]);
	doc.text(orgName, M, 18);
	doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK3[0], INK3[1], INK3[2]);
	doc.text(issueDate, M, 24);

	let y = PANEL_H + 9;
	hline(y); y += 10;

	// ── Bill To ───────────────────────────────────────────────────────────────
	doc.setFont(HF, "bold"); doc.setFontSize(7); ink(INK3[0], INK3[1], INK3[2]);
	doc.text("BILL TO", M, y);
	y += 5;

	doc.setFont(HF, "bold"); doc.setFontSize(10); ink(INK[0], INK[1], INK[2]);
	doc.text(clientName, M, y);
	y += 4.5;

	if (clientEmail && type === "client") {
		doc.setFont(NF, "normal"); doc.setFontSize(7.5); ink(INK2[0], INK2[1], INK2[2]);
		doc.text(clientEmail, M, y); y += 4.5;
	}

	doc.setFont(NF, "normal"); doc.setFontSize(7.5); ink(INK2[0], INK2[1], INK2[2]);
	doc.text(`Period: ${dateFrom} to ${dateTo}`, M, y);
	y += 9; hline(y); y += 8;

	// ── Table header ──────────────────────────────────────────────────────────
	const isTally = type !== "client";
	const COL = isTally ? {
		client: M + 1,       desc: M + 41,       date: M + 101,
		hrs:    { rx: M + 132 }, rate: { rx: M + 154 }, amt: { rx: W - M - 1 },
	} : {
		desc: M + 1,         date: M + 101,
		hrs:  { rx: M + 132 }, rate: { rx: M + 154 }, amt: { rx: W - M - 1 },
	};

	doc.setFont(HF, "bold"); doc.setFontSize(7); ink(INK[0], INK[1], INK[2]);
	if (isTally) {
		const c = COL as { client:number, desc:number, date:number, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
		doc.text("Client",      c.client, y);
		doc.text("Description", c.desc,   y);
		doc.text("Date",        c.date,   y);
		if (config.showHours) doc.text("Hrs",    c.hrs.rx,  y, { align: "right" });
		if (config.showRate)  doc.text("Rate",   c.rate.rx, y, { align: "right" });
		doc.text("Amount", c.amt.rx, y, { align: "right" });
	} else {
		const c = COL as { desc:number, date:number, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
		doc.text("Description", c.desc, y);
		doc.text("Date",        c.date, y);
		if (config.showHours) doc.text("Hrs",  c.hrs.rx, y, { align: "right" });
		if (config.showRate)  doc.text("Rate", c.rate.rx, y, { align: "right" });
		doc.text("Amount", c.amt.rx, y, { align: "right" });
	}

	y += 3;
	stroke(P[0], P[1], P[2], 0.4); doc.line(M, y + 1, W - M, y + 1);
	y += 6;

	// ── Items ─────────────────────────────────────────────────────────────────
	if (lineItems.length === 0) {
		doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(INK3[0], INK3[1], INK3[2]);
		doc.text("No completed tickets found for this period.", M, y); y += 10;
	}

	for (let i = 0; i < lineItems.length; i++) {
		const item = lineItems[i];

		if (isTally) {
			const c = COL as { client:number, desc:number, date:number, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
			doc.setFont(HF, "normal"); doc.setFontSize(7); ink(INK[0], INK[1], INK[2]);
			doc.text(truncate(item.client_name, 19), c.client, y);
			doc.text(truncate(item.title,        35), c.desc,   y);
			if (item.completed_at) {
				doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK2[0], INK2[1], INK2[2]);
				doc.text(item.completed_at.slice(0, 10), c.date, y);
			}
			doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK[0], INK[1], INK[2]);
			if (config.showHours) doc.text(item.billable_hours.toFixed(1), c.hrs.rx,  y, { align: "right" });
			if (config.showRate)  doc.text(item.rate.toFixed(2),           c.rate.rx, y, { align: "right" });
			doc.text(item.subtotal.toFixed(2), c.amt.rx, y, { align: "right" });
		} else {
			const c = COL as { desc:number, date:number, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
			doc.setFont(HF, "normal"); doc.setFontSize(7); ink(INK[0], INK[1], INK[2]);
			doc.text(truncate(item.title, 58), c.desc, y);
			if (item.completed_at) {
				doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK2[0], INK2[1], INK2[2]);
				doc.text(item.completed_at.slice(0, 10), c.date, y);
			}
			doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK[0], INK[1], INK[2]);
			if (config.showHours) doc.text(item.billable_hours.toFixed(1), c.hrs.rx,  y, { align: "right" });
			if (config.showRate)  doc.text(item.rate.toFixed(2),           c.rate.rx, y, { align: "right" });
			doc.text(item.subtotal.toFixed(2), c.amt.rx, y, { align: "right" });
		}

		y += 6; hline(y); y += 5;
		if (y > 240 && i < lineItems.length - 1) { doc.addPage(); y = 20; }
	}

	y += 4;

	// ── Totals ────────────────────────────────────────────────────────────────
	const totalSub  = lineItems.reduce((s, it) => s + it.subtotal, 0);
	const totalDisc = lineItems.reduce((s, it) => s + it.discount_amount, 0);
	const totalNet  = lineItems.reduce((s, it) => s + it.net_total, 0);
	const discPct   = lineItems[0]?.discount_percent ?? 0;

	const totRow = (label: string, val: string, bold = false) => {
		doc.setFont(HF, bold ? "bold" : "normal"); doc.setFontSize(7.5);
		ink(bold ? P[0] : INK3[0], bold ? P[1] : INK3[1], bold ? P[2] : INK3[2]);
		doc.text(label, W - M - 50, y, { align: "right" });
		doc.setFont(NF, bold ? "bold" : "normal"); doc.setFontSize(7.5);
		ink(bold ? P[0] : INK[0], bold ? P[1] : INK[1], bold ? P[2] : INK[2]);
		doc.text(val, W - M - 1, y, { align: "right" });
		y += 5.5;
	};

	totRow("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) totRow(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);
	y += 3;
	stroke(P[0], P[1], P[2], 0.3); doc.line(W - M - 58, y, W - M, y);
	y += 6;
	totRow("Total", currency(totalNet, cur), true);

	// ── Footer — fixed at bottom ──────────────────────────────────────────────
	const footY = 265;
	stroke(INK3[0], INK3[1], INK3[2], 0.12);
	doc.line(M, footY, W - M, footY);

	doc.setFont(HF, "bold"); doc.setFontSize(7.5); ink(P[0], P[1], P[2]);
	doc.text("Payment Terms", M, footY + 7);
	doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK2[0], INK2[1], INK2[2]);
	doc.text(payTerms,          M, footY + 12);
	doc.text(`Due: ${dueDate}`, M, footY + 17);

	doc.setFont(HF, "normal"); doc.setFontSize(10); ink(P[0], P[1], P[2]);
	doc.text(config.footerNote || "thank you.", W - M, footY + 12, { align: "right" });

	return doc.output("arraybuffer");
}

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function truncate(str: string, max: number): string {
	return str.length > max ? str.slice(0, max - 1) + "…" : str;
}
