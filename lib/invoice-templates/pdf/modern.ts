import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";

// Modern — creative agency style
// Each item is its own block: title large, metadata small below, amount floating right
// Editorial feel — no table, no grid, items separated by thin rules

export async function buildModernPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");

	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;
	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

	const P   = hexToRgb(config.primaryColor);
	const W   = 210;
	const M   = 18;

	const ink    = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
	const stroke = (r: number, g: number, b: number, w = 0.25) => { doc.setDrawColor(r, g, b); doc.setLineWidth(w); };
	const rule   = (y: number) => { stroke(220, 222, 230); doc.line(M, y, W - M, y); };

	// ── Header bar ────────────────────────────────────────────────────────────
	// Full-width top bar — primary color, thin
	stroke(...P, 1.5);
	doc.line(0, 0, W, 0);

	let y = 18;

	// Org name — large, left
	if (orgLogoUrl) {
		try {
			const img = await fetchImg(orgLogoUrl);
			doc.addImage(img.data, img.ext, M, y - 8, 12, 12);
		} catch {}
	}

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(20);
	ink(...P);
	doc.text(orgName, M, y);

	// Invoice label — right side, stacked
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	ink(160, 162, 175);
	doc.text("INVOICE", W - M, y - 5, { align: "right" });

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(10);
	ink(40, 42, 60);
	doc.text(`#${invoiceNumber}`, W - M, y, { align: "right" });

	y += 10;
	stroke(...P, 0.6);
	doc.line(M, y, W - M, y);
	y += 8;

	// ── To / Period block ─────────────────────────────────────────────────────
	const first      = lineItems[0];
	const clientName = type === "client" ? (first?.client_name ?? "—") : "All Clients";
	const clientEmail= first?.client_email ?? "";
	const cur        = first?.currency ?? "USD";
	const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	// Left: To block
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(160, 162, 175);
	doc.text("TO", M, y);

	y += 5;
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(13);
	ink(25, 28, 50);
	doc.text(clientName, M, y);

	y += 5;
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8.5);
	ink(130, 133, 155);
	if (clientEmail && type === "client") { doc.text(clientEmail, M, y); y += 4; }
	doc.text(payTerms, M, y);

	// Right: dates block — aligned to right column
	const dateY = y - 14;
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	ink(160, 162, 175);
	doc.text("PERIOD", W - M, dateY, { align: "right" });
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(9.5);
	ink(40, 42, 60);
	doc.text(`${dateFrom}  —  ${dateTo}`, W - M, dateY + 5, { align: "right" });
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	ink(130, 133, 155);
	doc.text(`Issued ${issueDate}`, W - M, dateY + 10, { align: "right" });
	doc.text(`Due ${dueDate}`, W - M, dateY + 15, { align: "right" });

	y += 10;
	rule(y);
	y += 8;

	// ── Line items — block layout ─────────────────────────────────────────────
	const items = lineItems.length > 0 ? lineItems : [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		// Service title — left, prominent
		doc.setFont(config.fontFamily, "bold");
		doc.setFontSize(11);
		ink(22, 25, 48);
		const title = truncate(item.title, 65);
		doc.text(title, M, y);

		// Amount — right, same baseline as title
		const amtLine1 = item.subtotal.toFixed(2);
		doc.setFont(config.fontFamily, "bold");
		doc.setFontSize(11);
		ink(...P);
		doc.text(amtLine1, W - M, y, { align: "right" });

		y += 5;

		// Currency label under amount
		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(7.5);
		ink(170, 173, 190);
		doc.text(cur, W - M, y, { align: "right" });

		// Metadata — left, small
		const meta: string[] = [];
		if (item.employee) meta.push(item.employee);
		if (item.completed_at) meta.push(item.completed_at);
		if (config.showHours && item.billable_hours > 0) meta.push(`${item.billable_hours.toFixed(1)} h`);
		if (config.showRate) meta.push(`@ ${item.rate.toFixed(2)}/${cur}`);

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8);
		ink(150, 153, 172);
		doc.text(meta.join("  /  "), M, y);
		y += 9;

		// Thin rule between items (not after last)
		if (i < items.length - 1) { rule(y); y += 6; }

		if (y > 258 && i < items.length - 1) { doc.addPage(); y = 20; }
	}

	if (items.length === 0) {
		doc.setFont(config.fontFamily, "italic");
		doc.setFontSize(9);
		ink(180, 183, 200);
		doc.text("No completed tickets found for this period.", M, y);
		y += 10;
	}

	y += 4;
	stroke(...P, 0.8);
	doc.line(M, y, W - M, y);
	y += 10;

	// ── Totals — right-aligned stack ─────────────────────────────────────────
	const totalSub  = items.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = items.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = items.reduce((s, i) => s + i.net_total, 0);
	const discPct   = items[0]?.discount_percent ?? 0;

	const totRow = (label: string, val: string, bold = false) => {
		doc.setFont(config.fontFamily, bold ? "bold" : "normal");
		doc.setFontSize(bold ? 11 : 8.5);
		ink(bold ? P[0] : 140, bold ? P[1] : 143, bold ? P[2] : 162);
		doc.text(label, W - M - 50, y, { align: "right" });
		ink(bold ? P[0] : 45, bold ? P[1] : 48, bold ? P[2] : 70);
		doc.text(val, W - M, y, { align: "right" });
		y += bold ? 8 : 5.5;
	};

	totRow("Subtotal", totalSub.toFixed(2));
	if (config.showDiscount && totalDisc > 0)
		totRow(`Discount ${discPct}%`, `− ${totalDisc.toFixed(2)}`);

	y += 1;
	totRow(`TOTAL  ${cur}`, totalNet.toFixed(2), true);

	// ── Footer — bottom, minimal ──────────────────────────────────────────────
	stroke(220, 222, 230, 0.3);
	doc.line(M, 282, W - M, 282);
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(185, 188, 205);
	doc.text(config.footerNote || "Thank you for your business.", M, 287);
	doc.text(`Due ${dueDate}`, W - M, 287, { align: "right" });

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
