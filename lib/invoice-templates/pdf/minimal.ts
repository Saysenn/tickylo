import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";

// Minimal — freelancer / letter style
// Org name left + invoice ref right. Recipient label+value block. Dotted leaders.
// No borders. Single primary rule. Quiet totals.

export async function buildMinimalPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const P   = hexToRgb(config.primaryColor);
	const W   = 210, M = 22;

	const ink    = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
	const stroke = (r: number, g: number, b: number, w = 0.2) => { doc.setDrawColor(r, g, b); doc.setLineWidth(w); };

	const first      = lineItems[0];
	const clientName = type === "client" ? (first?.client_name ?? "—") : "All Clients";
	const clientEmail= first?.client_email ?? "";
	const cur        = first?.currency ?? "USD";
	const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	let y = 24;

	// ── Org name left + invoice ref right ────────────────────────────────────
	if (orgLogoUrl) {
		try {
			const img = await fetchImg(orgLogoUrl);
			doc.addImage(img.data, img.ext, M, y - 8, 10, 10);
		} catch {}
	}

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(13);
	ink(...P);
	doc.text(orgName, M, y);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	ink(165, 168, 182);
	doc.text(`invoice  ${invoiceNumber}`, W - M, y, { align: "right" });

	y += 5;
	stroke(...P, 0.5);
	doc.line(M, y, W - M, y);
	y += 12;

	// ── Recipient block — two columns ─────────────────────────────────────────
	// Left: to / date / due / ref / period / terms
	const LW = 18; // label column

	const lv = (label: string, val: string) => {
		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8.5);
		ink(165, 168, 182);
		doc.text(label, M, y);
		ink(32, 35, 55);
		doc.text(val, M + LW, y);
		y += 5.5;
	};

	lv("to",     clientName);
	if (clientEmail && type === "client") lv("",      clientEmail);
	y += 1;
	lv("date",   issueDate);
	lv("due",    dueDate);
	lv("ref",    invoiceNumber);
	lv("period", `${dateFrom}  —  ${dateTo}`);
	lv("terms",  payTerms);

	y += 8;
	stroke(205, 208, 218, 0.3);
	doc.line(M, y, W - M, y);
	y += 10;

	// ── Items — dotted leaders ────────────────────────────────────────────────
	const items = lineItems.length > 0 ? lineItems : [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		const title   = truncate(item.title, 62);
		const amtText = item.subtotal.toFixed(2);

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(9);
		ink(28, 31, 52);
		doc.text(title,   M, y);
		doc.text(amtText, W - M, y, { align: "right" });

		// Leader dots
		const titleW = doc.getTextWidth(title);
		const amtW   = doc.getTextWidth(amtText);
		const ls = M + titleW + 2;
		const le = W - M - amtW - 2;
		if (le > ls + 3) {
			doc.setFont(config.fontFamily, "normal");
			doc.setFontSize(7.5);
			ink(205, 208, 220);
			doc.text(buildLeader(doc, ls, le), ls, y);
		}

		y += 5;

		// Optional meta subline
		const meta: string[] = [];
		if (item.employee)     meta.push(item.employee);
		if (item.completed_at) meta.push(item.completed_at);
		if (config.showHours && item.billable_hours > 0) meta.push(`${item.billable_hours.toFixed(1)} hrs`);
		if (config.showRate)   meta.push(`@ ${cur} ${item.rate.toFixed(2)}`);

		if (meta.length > 0) {
			doc.setFont(config.fontFamily, "normal");
			doc.setFontSize(7.5);
			ink(170, 173, 190);
			doc.text(meta.join("  ·  "), M + 2, y);
			y += 4.5;
		}

		if (y > 258 && i < items.length - 1) { doc.addPage(); y = 24; }
	}

	if (items.length === 0) {
		doc.setFont(config.fontFamily, "italic");
		doc.setFontSize(8.5);
		ink(180, 183, 200);
		doc.text("No completed tickets found for this period.", M, y);
		y += 10;
	}

	y += 5;
	stroke(205, 208, 218, 0.3);
	doc.line(M, y, W - M, y);
	y += 9;

	// ── Totals — right-aligned, plain ────────────────────────────────────────
	const totalSub  = items.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = items.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = items.reduce((s, i) => s + i.net_total, 0);
	const discPct   = items[0]?.discount_percent ?? 0;

	const totRow = (label: string, val: string, bold = false) => {
		doc.setFont(config.fontFamily, bold ? "bold" : "normal");
		doc.setFontSize(bold ? 10 : 8.5);
		ink(bold ? P[0] : 145, bold ? P[1] : 148, bold ? P[2] : 165);
		doc.text(label, W - M - 46, y, { align: "right" });
		ink(bold ? P[0] : 32, bold ? P[1] : 35, bold ? P[2] : 55);
		doc.text(val, W - M, y, { align: "right" });
		y += bold ? 7 : 5;
	};

	totRow("subtotal", totalSub.toFixed(2));
	if (config.showDiscount && totalDisc > 0) totRow(`discount  ${discPct}%`, `-${totalDisc.toFixed(2)}`);

	// Accent rule above total
	y += 3;
	stroke(...P, 0.35);
	doc.line(W - M - 52, y, W - M, y);
	y += 6;
	totRow(`total  ${cur}`, totalNet.toFixed(2), true);

	// ── Footer ────────────────────────────────────────────────────────────────
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(185, 188, 205);
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

function buildLeader(doc: any, start: number, end: number): string {
	const dotW = doc.getTextWidth(".");
	const count = Math.floor((end - start) / (dotW + 0.3));
	return ".".repeat(Math.max(0, count));
}
