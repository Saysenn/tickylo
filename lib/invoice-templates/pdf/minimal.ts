import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";
import { registerFont } from "../font-loader";

export async function buildMinimalPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const P   = hexToRgb(config.primaryColor);
	const W   = 210, M = 22;

	const bootsBase64 = config.fonts?.["Bootshaus"];
	const robotoBase64 = config.fonts?.["Roboto"];
	if (bootsBase64) registerFont(doc as any, "Bootshaus", bootsBase64);
	if (robotoBase64) registerFont(doc as any, "Roboto", robotoBase64);
	const HF = bootsBase64 ? "Bootshaus" : config.fontFamily; // everything text
	const NF = robotoBase64 ? "Roboto" : config.fontFamily;   // numbers only

	const ink    = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
	const stroke = (r: number, g: number, b: number, w = 0.2) => { doc.setDrawColor(r, g, b); doc.setLineWidth(w); };

	const first       = lineItems[0];
	const clientName  = type === "client" ? (first?.client_name ?? "") : "All Clients";
	const clientEmail = first?.client_email ?? "";
	const cur         = first?.currency ?? "USD";
	const payTerms    = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate     = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	let y = 24;

	// ── Org name + invoice ref ────────────────────────────────────────────────
	if (orgLogoUrl) {
		try { const img = await fetchImg(orgLogoUrl); doc.addImage(img.data, img.ext, M, y - 8, 10, 10); } catch {}
	}

	doc.setFont(HF, "bold"); doc.setFontSize(13); ink(P[0], P[1], P[2]);
	doc.text(orgName, M, y);

	doc.setFont(HF, "normal"); doc.setFontSize(7); ink(170, 173, 188);
	const numMaxW  = W - M - M - doc.getTextWidth("invoice  ") - 2;
	const numLines = doc.splitTextToSize(invoiceNumber, numMaxW) as string[];
	const numSlice = numLines.slice(0, 2);
	doc.text(`invoice  ${numSlice[0]}`, W - M, y, { align: "right" });
	if (numSlice[1]) doc.text(numSlice[1], W - M, y + 4, { align: "right" });

	y += 5;
	stroke(P[0], P[1], P[2], 0.5); doc.line(M, y, W - M, y); y += 12;

	// ── Recipient info block ──────────────────────────────────────────────────
	const LW = 20;

	const lv = (label: string, val: string) => {
		doc.setFont(HF, "normal"); doc.setFontSize(8); ink(P[0], P[1], P[2]);
		if (label) doc.text(label, M, y);
		doc.setFont(HF, "normal"); doc.setFontSize(8.5); ink(32, 35, 55);
		doc.text(val, M + LW, y);
		y += 5.5;
	};

	lv("to",   clientName);
	if (clientEmail && type === "client") lv("", clientEmail);
	y += 1;
	lv("date", issueDate);
	lv("due",  dueDate);

	doc.setFont(HF, "normal"); doc.setFontSize(8); ink(P[0], P[1], P[2]);
	doc.text("ref", M, y);
	doc.setFont(HF, "normal"); doc.setFontSize(8.5); ink(32, 35, 55);
	const refLines = doc.splitTextToSize(invoiceNumber, W - M - (M + LW)) as string[];
	const refSlice = refLines.slice(0, 2);
	refSlice.forEach((line: string, i: number) => doc.text(line, M + LW, y + i * 5));
	y += refSlice.length * 5 + 0.5;

	lv("period", `${dateFrom} to ${dateTo}`);
	lv("terms",  payTerms);

	y += 8;
	stroke(205, 208, 218, 0.3); doc.line(M, y, W - M, y); y += 10;

	// ── Items ─────────────────────────────────────────────────────────────────
	const items = lineItems;

	if (items.length === 0) {
		doc.setFont(HF, "italic"); doc.setFontSize(7.5); ink(180, 183, 200);
		doc.text("No completed tickets found for this period.", M, y); y += 10;
	}

	for (let i = 0; i < items.length; i++) {
		const item    = items[i];
		const title   = truncate(item.title, 62);
		const amtText = item.subtotal.toFixed(2);

		// Title — Bootshaus, amount — Roboto
		doc.setFont(HF, "normal"); doc.setFontSize(8); ink(28, 31, 52);
		doc.text(title, M, y);
		doc.setFont(NF, "normal"); doc.setFontSize(8);
		doc.text(amtText, W - M, y, { align: "right" });

		// Dotted leader
		doc.setFont(HF, "normal");
		const titleW = doc.getTextWidth(title);
		const amtW   = doc.getTextWidth(amtText);
		const ls = M + titleW + 2, le = W - M - amtW - 2;
		if (le > ls + 3) {
			doc.setFontSize(7); ink(205, 208, 220);
			doc.text(buildLeader(doc, ls, le), ls, y);
		}

		y += 4.5;

		// Meta subline — Bootshaus for text, Roboto for numbers
		const meta: string[] = [];
		if (type !== "client" && item.client_name) meta.push(item.client_name);
		if (item.completed_at) meta.push(item.completed_at.slice(0, 10));

		if (meta.length > 0) {
			doc.setFont(HF, "normal"); doc.setFontSize(6.5); ink(160, 163, 180);
			doc.text(meta.join("  ·  "), M + 4, y);
			// Append numeric parts after
			const numMeta: string[] = [];
			if (config.showHours && item.billable_hours >= 0) numMeta.push(`${item.billable_hours.toFixed(1)} hrs`);
			if (config.showRate) numMeta.push(`@ ${cur} ${item.rate.toFixed(2)}`);
			if (numMeta.length > 0) {
				const metaTextW = doc.getTextWidth(meta.join("  ·  ") + "  ·  ");
				doc.setFont(NF, "normal");
				doc.text(numMeta.join("  ·  "), M + 4 + metaTextW, y);
			}
			y += 4;
		} else {
			// Only numeric meta
			const numMeta: string[] = [];
			if (config.showHours && item.billable_hours >= 0) numMeta.push(`${item.billable_hours.toFixed(1)} hrs`);
			if (config.showRate) numMeta.push(`@ ${cur} ${item.rate.toFixed(2)}`);
			if (numMeta.length > 0) {
				doc.setFont(NF, "normal"); doc.setFontSize(6.5); ink(160, 163, 180);
				doc.text(numMeta.join("  ·  "), M + 4, y); y += 4;
			}
		}

		y += 2.5;
		if (y > 255 && i < items.length - 1) { doc.addPage(); y = 24; }
	}

	y += 5;
	stroke(205, 208, 218, 0.3); doc.line(M, y, W - M, y); y += 9;

	// ── Totals ────────────────────────────────────────────────────────────────
	const totalSub  = items.reduce((s, it) => s + it.subtotal, 0);
	const totalDisc = items.reduce((s, it) => s + it.discount_amount, 0);
	const totalNet  = items.reduce((s, it) => s + it.net_total, 0);
	const discPct   = items[0]?.discount_percent ?? 0;

	const totRow = (label: string, val: string, bold = false) => {
		doc.setFont(HF, bold ? "bold" : "normal"); doc.setFontSize(bold ? 11 : 8);
		ink(bold ? P[0] : 145, bold ? P[1] : 148, bold ? P[2] : 165);
		doc.text(label, W - M - 52, y, { align: "right" });
		doc.setFont(NF, bold ? "bold" : "normal"); doc.setFontSize(bold ? 11 : 8);
		ink(bold ? P[0] : 32, bold ? P[1] : 35, bold ? P[2] : 55);
		doc.text(val, W - M, y, { align: "right" });
		y += bold ? 7 : 5.5;
	};

	totRow("subtotal", totalSub.toFixed(2));
	if (config.showDiscount && totalDisc > 0) totRow(`discount  ${discPct}%`, `-${totalDisc.toFixed(2)}`);
	y += 4; stroke(P[0], P[1], P[2], 0.35); doc.line(W - M - 58, y, W - M, y); y += 6;
	totRow(`total  ${cur}`, totalNet.toFixed(2), true);

	// ── Footer ────────────────────────────────────────────────────────────────
	doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(185, 188, 205);
	doc.text(config.footerNote || "thank you.", M, 285);

	return doc.output("arraybuffer");
}

function hexToRgb(hex: string): [number, number, number] {
	const n = parseInt(hex, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

async function fetchImg(url: string): Promise<{ data: string; ext: string }> {
	const res = await fetch(url);
	if (!res.ok) throw new Error("logo fetch failed");
	const buf = await res.arrayBuffer();
	const ct  = res.headers.get("content-type") ?? "image/png";
	const ext = ct.includes("jpeg") || ct.includes("jpg") ? "JPEG" : "PNG";
	return { data: `data:${ct};base64,${Buffer.from(buf).toString("base64")}`, ext };
}

function truncate(str: string, max: number): string {
	return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function buildLeader(doc: { getTextWidth: (s: string) => number }, start: number, end: number): string {
	const dotW  = doc.getTextWidth(".");
	const count = Math.floor((end - start) / (dotW + 0.3));
	return ".".repeat(Math.max(0, count));
}
