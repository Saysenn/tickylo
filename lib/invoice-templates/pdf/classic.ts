import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, billingCycleLabel, dueDateFrom, rateTypeLabel } from "../helpers";

// Classic — corporate / legal letterhead style
// Numbered line items, dotted leaders, formal section breaks

export async function buildClassicPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");

	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

	const P   = hexToRgb(config.primaryColor);
	const W   = 210;
	const M   = 18;   // margin
	const RW  = W - M * 2;

	const setColor  = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
	const setDraw   = (r: number, g: number, b: number) => doc.setDrawColor(r, g, b);
	const rule      = (y: number, weight = 0.25, r = 180, g = 185, b = 200) => {
		setDraw(r, g, b); doc.setLineWidth(weight); doc.line(M, y, W - M, y);
	};

	// ── Logo + Org name ───────────────────────────────────────────────────────
	let y = 20;

	if (orgLogoUrl) {
		try {
			const img = await fetchImg(orgLogoUrl);
			doc.addImage(img.data, img.ext, M, y - 7, 14, 14);
		} catch {}
	}

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(17);
	setColor(...P);
	doc.text(orgName, M, y);

	// "INVOICE" stamp — top right
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(22);
	setColor(...P);
	doc.text("INVOICE", W - M, y, { align: "right" });

	y += 2;
	rule(y, 0.6, P[0], P[1], P[2]);
	y += 7;

	// ── Invoice meta — right column ───────────────────────────────────────────
	const first      = lineItems[0];
	const clientName = type === "client" ? (first?.client_name ?? "—") : "All Clients — Full Tally";
	const clientEmail= first?.client_email ?? "";
	const cur        = first?.currency ?? "USD";
	const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));
	const billing    = billingCycleLabel(first?.billing_cycle ?? "per_ticket");

	const metaRight = (label: string, val: string, yy: number) => {
		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8);
		setColor(140, 145, 165);
		doc.text(label, W - M - 38, yy, { align: "right" });
		doc.setFont(config.fontFamily, "bold");
		setColor(50, 55, 75);
		doc.text(val, W - M, yy, { align: "right" });
	};

	metaRight("Invoice No.", invoiceNumber, y);      y += 5;
	metaRight("Issue Date", issueDate, y);           y += 5;
	metaRight("Due Date",   dueDate, y);             y += 5;
	metaRight("Terms",      payTerms, y);

	// ── Bill To — left column ─────────────────────────────────────────────────
	let by = y - 10; // align with meta block
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(7.5);
	setColor(160, 165, 180);
	doc.text("BILLED TO", M, by);
	by += 5;
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(12);
	setColor(...P);
	doc.text(clientName, M, by);
	by += 5;
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(9);
	setColor(100, 105, 125);
	if (clientEmail && type === "client") { doc.text(clientEmail, M, by); by += 4; }
	doc.text(`${billing}  ·  ${payTerms}`, M, by);

	y = Math.max(y + 8, by + 8);

	// Period line
	doc.setFont(config.fontFamily, "italic");
	doc.setFontSize(8.5);
	setColor(130, 135, 155);
	doc.text(`Period: ${dateFrom}  –  ${dateTo}`, M, y);
	y += 5;
	rule(y, 0.4);
	y += 8;

	// ── Line items ────────────────────────────────────────────────────────────
	const items = lineItems.length > 0 ? lineItems : [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		// Number
		doc.setFont(config.fontFamily, "bold");
		doc.setFontSize(9);
		setColor(...P);
		doc.text(`${i + 1}.`, M, y);

		// Title — with leader dots to amount
		const title   = truncate(item.title, 60);
		const amtText = `${cur} ${item.subtotal.toFixed(2)}`;

		doc.setFont(config.fontFamily, "bold");
		doc.setFontSize(9.5);
		setColor(30, 35, 55);
		doc.text(title, M + 7, y);

		// Dotted leader
		const titleW = doc.getTextWidth(title);
		const amtW   = doc.getTextWidth(amtText);
		const leaderStart = M + 7 + titleW + 2;
		const leaderEnd   = W - M - amtW - 2;
		if (leaderEnd > leaderStart + 4) {
			doc.setFont(config.fontFamily, "normal");
			doc.setFontSize(8);
			setColor(200, 205, 215);
			const dots = buildLeader(doc, leaderStart, leaderEnd);
			doc.text(dots, leaderStart, y);
		}

		// Amount
		doc.setFont(config.fontFamily, "bold");
		doc.setFontSize(9.5);
		setColor(30, 35, 55);
		doc.text(amtText, W - M, y, { align: "right" });
		y += 5;

		// Metadata line
		const meta: string[] = [];
		if (item.employee) meta.push(item.employee);
		if (item.completed_at) meta.push(`Completed ${item.completed_at}`);
		if (config.showHours && item.billable_hours > 0) meta.push(`${item.billable_hours.toFixed(1)} hrs`);
		if (config.showRate)  meta.push(`@ ${cur} ${item.rate.toFixed(2)}/${rateTypeLabel(item.rate_type).toLowerCase()}`);

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8);
		setColor(150, 155, 175);
		doc.text(meta.join("  ·  "), M + 7, y);
		y += 7;

		if (y > 260 && i < items.length - 1) {
			doc.addPage(); y = 20;
		}
	}

	if (items.length === 0) {
		doc.setFont(config.fontFamily, "italic");
		doc.setFontSize(9);
		setColor(180, 185, 200);
		doc.text("No completed tickets found for this period.", M + 7, y);
		y += 10;
	}

	rule(y, 0.4);
	y += 8;

	// ── Totals ────────────────────────────────────────────────────────────────
	const totalSub  = items.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = items.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = items.reduce((s, i) => s + i.net_total, 0);
	const discPct   = items[0]?.discount_percent ?? 0;

	const totalRow = (label: string, val: string, bold = false) => {
		doc.setFont(config.fontFamily, bold ? "bold" : "normal");
		doc.setFontSize(bold ? 10.5 : 9);
		setColor(bold ? P[0] : 120, bold ? P[1] : 125, bold ? P[2] : 145);
		doc.text(label, W - M - 55, y, { align: "right" });
		doc.setFont(config.fontFamily, bold ? "bold" : "normal");
		setColor(bold ? P[0] : 50, bold ? P[1] : 55, bold ? P[2] : 75);
		doc.text(val, W - M, y, { align: "right" });
		y += bold ? 7 : 5;
	};

	totalRow("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0)
		totalRow(`Discount (${discPct}%)`, `− ${currency(totalDisc, cur)}`);

	// Rule above total
	setDraw(...P); doc.setLineWidth(0.4);
	doc.line(W - M - 65, y - 2, W - M, y - 2);
	totalRow("TOTAL DUE", currency(totalNet, cur), true);

	// ── Footer ────────────────────────────────────────────────────────────────
	rule(280, 0.3, 210, 212, 220);
	doc.setFont(config.fontFamily, "italic");
	doc.setFontSize(8);
	setColor(175, 178, 195);
	doc.text(config.footerNote || `Payment due by ${dueDate}. Thank you for your business.`, W / 2, 285, { align: "center" });

	return doc.output("arraybuffer");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
	const count = Math.floor((end - start) / dotW);
	return ".".repeat(Math.max(0, count));
}
