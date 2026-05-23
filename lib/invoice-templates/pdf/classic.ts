import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";
import { registerFont } from "../font-loader";

// Site palette
const INK  = [13,  31,  20]  as const;
const INK2 = [58,  94,  74]  as const;
const INK3 = [122, 158, 136] as const;

export async function buildClassicPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
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

	// ── Header band ───────────────────────────────────────────────────────────
	doc.setFillColor(INK[0], INK[1], INK[2]);
	doc.rect(0, 0, W, 32, "F");

	doc.setFont(HF, "bold"); doc.setFontSize(16); ink(242, 253, 246);
	doc.text(orgName, M, 19);

	doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(P[0], P[1], P[2]);
	doc.text("INVOICE", W - M, 11, { align: "right" });

	doc.setFont(NF, "normal"); doc.setFontSize(6.5); ink(INK3[0], INK3[1], INK3[2]);
	const numSlice = (doc.splitTextToSize(invoiceNumber, 90) as string[]).slice(0, 2);
	numSlice.forEach((l, i) => doc.text(l, W - M, 17 + i * 4.5, { align: "right" }));

	doc.setFont(NF, "normal"); doc.setFontSize(6.5); ink(INK3[0], INK3[1], INK3[2]);
	doc.text(issueDate, W - M, 28, { align: "right" });

	let y = 44;

	// ── Bill To block ─────────────────────────────────────────────────────────
	doc.setFont(HF, "bold"); doc.setFontSize(6.5); ink(INK3[0], INK3[1], INK3[2]);
	doc.text("BILL TO", M, y);
	doc.setFont(HF, "normal"); doc.setFontSize(6.5);
	doc.text("DUE DATE", W - M, y, { align: "right" });

	y += 5;
	doc.setFont(HF, "bold"); doc.setFontSize(10); ink(INK[0], INK[1], INK[2]);
	doc.text(clientName, M, y);
	doc.setFont(NF, "bold"); doc.setFontSize(9); ink(P[0], P[1], P[2]);
	doc.text(dueDate, W - M, y, { align: "right" });

	y += 4.5;
	if (clientEmail && type === "client") {
		doc.setFont(NF, "normal"); doc.setFontSize(7.5); ink(INK2[0], INK2[1], INK2[2]);
		doc.text(clientEmail, M, y); y += 4.5;
	}

	doc.setFont(NF, "normal"); doc.setFontSize(7.5); ink(INK2[0], INK2[1], INK2[2]);
	doc.text(`Period: ${dateFrom} to ${dateTo}`, M, y);
	y += 9;

	doc.setFont(HF, "normal"); doc.setFontSize(6.5); ink(INK3[0], INK3[1], INK3[2]);
	doc.text(`Payment Terms: ${payTerms}`, W / 2, y, { align: "center" });
	y += 8;

	// ── Table header strip ────────────────────────────────────────────────────
	doc.setFillColor(INK[0], INK[1], INK[2]);
	doc.rect(M, y, W - 2 * M, 8.5, "F");

	const isTally = type !== "client";
	// cell x positions (content starts 2mm inside column boundary)
	const COL = isTally ? {
		client: M + 1,       desc: M + 43,       date: M + 108,
		hrs:    { rx: M + 139 }, rate: { rx: M + 157 }, amt: { rx: W - M - 1 },
	} : {
		num:    { rx: M + 8  }, desc: M + 11,     date: M + 109,
		hrs:    { rx: M + 144 }, rate: { rx: M + 162 }, amt: { rx: W - M - 1 },
	};

	doc.setFont(HF, "bold"); doc.setFontSize(6.5); ink(INK3[0], INK3[1], INK3[2]);
	if (isTally) {
		const c = COL as { client:number, desc:number, date:number, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
		doc.text("CLIENT",      c.client,    y + 5.5);
		doc.text("DESCRIPTION", c.desc,      y + 5.5);
		doc.text("DATE",        c.date,      y + 5.5);
		if (config.showHours) doc.text("HRS",    c.hrs.rx,  y + 5.5, { align: "right" });
		if (config.showRate)  doc.text("RATE",   c.rate.rx, y + 5.5, { align: "right" });
		doc.text("AMOUNT", c.amt.rx, y + 5.5, { align: "right" });
	} else {
		const c = COL as { num:{rx:number}, desc:number, date:number, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
		doc.text("#",           c.num.rx,  y + 5.5, { align: "right" });
		doc.text("DESCRIPTION", c.desc,    y + 5.5);
		doc.text("DATE",        c.date,    y + 5.5);
		if (config.showHours) doc.text("HRS",  c.hrs.rx,  y + 5.5, { align: "right" });
		if (config.showRate)  doc.text("RATE", c.rate.rx, y + 5.5, { align: "right" });
		doc.text("AMOUNT", c.amt.rx, y + 5.5, { align: "right" });
	}

	y += 8.5; y += 5;

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
			doc.text(truncate(item.title,        37), c.desc,   y);
			if (item.completed_at) {
				doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK2[0], INK2[1], INK2[2]);
				doc.text(item.completed_at.slice(0, 10), c.date, y);
			}
			doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK[0], INK[1], INK[2]);
			if (config.showHours) doc.text(item.billable_hours.toFixed(1), c.hrs.rx,  y, { align: "right" });
			if (config.showRate)  doc.text(item.rate.toFixed(2),           c.rate.rx, y, { align: "right" });
			doc.text(item.subtotal.toFixed(2), c.amt.rx, y, { align: "right" });
		} else {
			const c = COL as { num:{rx:number}, desc:number, date:number, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
			doc.setFont(NF, "normal"); doc.setFontSize(6.5); ink(INK3[0], INK3[1], INK3[2]);
			doc.text(`${i + 1}`, c.num.rx, y, { align: "right" });
			doc.setFont(HF, "normal"); doc.setFontSize(7); ink(INK[0], INK[1], INK[2]);
			doc.text(truncate(item.title, 52), c.desc, y);
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

	totRow("SUB TOTAL", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) totRow(`DISCOUNT (${discPct}%)`, `-${currency(totalDisc, cur)}`);
	y += 3;
	stroke(P[0], P[1], P[2], 0.3); doc.line(W - M - 58, y, W - M, y);
	y += 6;
	totRow("TOTAL AMOUNT", currency(totalNet, cur), true);

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
