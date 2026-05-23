import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";
import { registerFont } from "../font-loader";

// Site palette
const INK  = [13,  31,  20]  as const; // #0D1F14
const INK2 = [58,  94,  74]  as const; // #3A5E4A
const INK3 = [122, 158, 136] as const; // #7A9E88

export async function buildMinimalPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { lineItems, invoiceNumber, issueDate, orgName, dateFrom, dateTo, type } = data;

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const P   = hexToRgb(config.primaryColor); // org accent color
	const W   = 210, M = 22;

	const bootsBase64 = config.fonts?.["Bootshaus"];
	const robotoBase64 = config.fonts?.["Roboto"];
	if (bootsBase64) {
		registerFont(doc as any, "Bootshaus", bootsBase64, "normal");
		registerFont(doc as any, "Bootshaus", bootsBase64, "bold");
	}
	if (robotoBase64) {
		registerFont(doc as any, "Roboto", robotoBase64, "normal");
		registerFont(doc as any, "Roboto", robotoBase64, "bold");
	}
	const HF = bootsBase64 ? "Bootshaus" : "helvetica"; // labels, headings, structure
	const NF = robotoBase64 ? "Roboto"    : "helvetica"; // values, numbers, meta

	const ink    = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
	const stroke = (r: number, g: number, b: number, w = 0.12) => { doc.setDrawColor(r, g, b); doc.setLineWidth(w); };

	const first      = lineItems[0];
	const clientName = type === "client" ? (first?.client_name ?? "") : "All Clients";
	const clientEmail= first?.client_email ?? "";
	const cur        = first?.currency ?? "USD";
	const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	// ── Header ────────────────────────────────────────────────────────────────
	// Org name — Bootshaus, ink
	doc.setFont(HF, "bold"); doc.setFontSize(15);
	ink(INK[0], INK[1], INK[2]);
	doc.text(orgName, M, 20);

	// "INVOICE" label — accent, right
	doc.setFont(HF, "normal"); doc.setFontSize(7.5);
	ink(P[0], P[1], P[2]);
	doc.text("INVOICE", W - M, 12, { align: "right" });

	// Invoice number — ink-3, Roboto
	doc.setFont(NF, "normal"); doc.setFontSize(6);
	ink(INK3[0], INK3[1], INK3[2]);
	const numLines = doc.splitTextToSize(invoiceNumber, 85) as string[];
	numLines.slice(0, 2).forEach((l: string, i: number) => doc.text(l, W - M, 17 + i * 4, { align: "right" }));

	// Issued date — ink-3, Bootshaus
	doc.setFont(HF, "normal"); doc.setFontSize(6.5);
	doc.text(`Issued: ${issueDate}`, W - M, 25, { align: "right" });

	// Primary rule
	const ruleY = 33;
	stroke(P[0], P[1], P[2], 0.35);
	doc.line(M, ruleY, W - M, ruleY);

	let y = ruleY + 13;

	// ── Info block ────────────────────────────────────────────────────────────
	const LW = 22;
	const lv = (label: string, val: string) => {
		// Label — Bootshaus, accent color
		doc.setFont(HF, "normal"); doc.setFontSize(7.5);
		ink(P[0], P[1], P[2]);
		if (label) doc.text(label, M, y);
		// Value — Roboto, ink-2
		doc.setFont(NF, "normal"); doc.setFontSize(7.5);
		ink(INK2[0], INK2[1], INK2[2]);
		doc.text(val, M + LW, y);
		y += 6;
	};

	lv("to",     clientName);
	if (clientEmail && type === "client") lv("", clientEmail);
	y += 1;
	lv("date",   issueDate);
	lv("due",    dueDate);

	// ref — split label vs value
	doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(P[0], P[1], P[2]);
	doc.text("ref", M, y);
	doc.setFont(NF, "normal"); doc.setFontSize(7); ink(INK2[0], INK2[1], INK2[2]);
	const refLines = doc.splitTextToSize(invoiceNumber, W - M - (M + LW)) as string[];
	refLines.slice(0, 2).forEach((l: string, i: number) => doc.text(l, M + LW, y + i * 4.5));
	y += refLines.slice(0, 2).length * 4.5 + 1;

	lv("period", `${dateFrom} to ${dateTo}`);
	lv("terms",  payTerms);

	y += 8;
	stroke(INK3[0], INK3[1], INK3[2], 0.12);
	doc.line(M, y, W - M, y);
	y += 10;

	// ── Items ─────────────────────────────────────────────────────────────────
	const items = lineItems;

	if (items.length === 0) {
		doc.setFont(HF, "italic"); doc.setFontSize(7.5);
		ink(INK3[0], INK3[1], INK3[2]);
		doc.text("No completed tickets found for this period.", M, y); y += 10;
	}

	for (let i = 0; i < items.length; i++) {
		const item    = items[i];
		const title   = truncate(item.title, 62);
		const amtText = item.subtotal.toFixed(2);

		// Title — Bootshaus, ink
		doc.setFont(HF, "normal"); doc.setFontSize(7);
		ink(INK[0], INK[1], INK[2]);
		doc.text(title, M, y);

		// Amount — Roboto, ink
		doc.setFont(NF, "normal"); doc.setFontSize(7);
		doc.text(amtText, W - M, y, { align: "right" });

		// Dotted leader — ink-3
		doc.setFont(NF, "normal");
		const ls = M + doc.getTextWidth(title) + 2;
		const le = W - M - doc.getTextWidth(amtText) - 2;
		if (le > ls + 3) {
			doc.setFontSize(7); ink(INK3[0], INK3[1], INK3[2]);
			doc.text(buildLeader(doc, ls, le), ls, y);
		}
		y += 4.5;

		// Meta subline — Roboto, ink-3
		const meta: string[] = [];
		if (type !== "client" && item.client_name) meta.push(item.client_name);
		if (item.completed_at) meta.push(item.completed_at.slice(0, 10));
		if (config.showHours && item.billable_hours >= 0) meta.push(`${item.billable_hours.toFixed(1)} hrs`);
		if (config.showRate) meta.push(`@ ${cur} ${item.rate.toFixed(2)}`);
		if (meta.length > 0) {
			doc.setFont(NF, "normal"); doc.setFontSize(6.5);
			ink(INK3[0], INK3[1], INK3[2]);
			doc.text(meta.join("  ·  "), M + 4, y); y += 4;
		}
		y += 2.5;

		if (y > 240 && i < items.length - 1) { doc.addPage(); y = 24; }
	}

	y += 5;
	stroke(INK3[0], INK3[1], INK3[2], 0.12);
	doc.line(M, y, W - M, y);
	y += 9;

	// ── Totals — Bootshaus labels, Roboto numbers ─────────────────────────────
	const totalSub  = items.reduce((s, it) => s + it.subtotal, 0);
	const totalDisc = items.reduce((s, it) => s + it.discount_amount, 0);
	const totalNet  = items.reduce((s, it) => s + it.net_total, 0);
	const discPct   = items[0]?.discount_percent ?? 0;

	const totRow = (label: string, val: string, bold = false) => {
		doc.setFont(HF, bold ? "bold" : "normal"); doc.setFontSize(7.5);
		ink(bold ? P[0] : INK3[0], bold ? P[1] : INK3[1], bold ? P[2] : INK3[2]);
		doc.text(label, W - M - 52, y, { align: "right" });
		doc.setFont(NF, bold ? "bold" : "normal"); doc.setFontSize(7.5);
		ink(bold ? P[0] : INK[0], bold ? P[1] : INK[1], bold ? P[2] : INK[2]);
		doc.text(val, W - M, y, { align: "right" });
		y += 5.5;
	};

	totRow("subtotal", totalSub.toFixed(2));
	if (config.showDiscount && totalDisc > 0) totRow(`discount  ${discPct}%`, `-${totalDisc.toFixed(2)}`);
	y += 4;
	stroke(P[0], P[1], P[2], 0.25);
	doc.line(W - M - 60, y, W - M, y);
	y += 6;
	totRow(`total  ${cur}`, totalNet.toFixed(2), true);

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

function buildLeader(doc: { getTextWidth: (s: string) => number }, start: number, end: number): string {
	const dotW  = doc.getTextWidth(".");
	const count = Math.floor((end - start) / (dotW + 0.3));
	return ".".repeat(Math.max(0, count));
}
