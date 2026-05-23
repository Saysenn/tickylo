import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";

// Classic — Invoice Fly / letterhead style
// Org name left + invoice stamp box right. Two-col Bill To / Due. Column-aligned table.
// Thin rules only. Formal subtotal block. Two-col footer.

export async function buildClassicPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const P   = hexToRgb(config.primaryColor);
	const W   = 210, M = 18;

	const ink    = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
	const stroke = (r: number, g: number, b: number, w = 0.25) => { doc.setDrawColor(r, g, b); doc.setLineWidth(w); };
	const hline  = (y: number, r = 200, g = 203, b = 212, w = 0.25) => { stroke(r, g, b, w); doc.line(M, y, W - M, y); };

	const first      = lineItems[0];
	const clientName = type === "client" ? (first?.client_name ?? "—") : "All Clients — Full Tally";
	const clientEmail= first?.client_email ?? "";
	const cur        = first?.currency ?? "USD";
	const payTerms   = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate    = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	let y = 24;

	// ── Header ────────────────────────────────────────────────────────────────
	// Logo
	if (orgLogoUrl) {
		try {
			const img = await fetchImg(orgLogoUrl);
			doc.addImage(img.data, img.ext, M, y - 8, 10, 10);
		} catch {}
	}

	// "INVOICE" small label
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(160, 163, 178);
	doc.text("INVOICE", M, y - 6);

	// Org name
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(15);
	ink(...P);
	doc.text(orgName, M, y);

	// Stamp box top-right
	const bW = 40, bH = 14, bX = W - M - bW, bY = y - 11;
	stroke(...P, 0.4);
	doc.rect(bX, bY, bW, bH);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7);
	ink(155, 158, 175);
	doc.text("NO.", bX + 2, bY + 5);
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(8);
	ink(28, 31, 50);
	doc.text(invoiceNumber, bX + bW - 2, bY + 5, { align: "right" });
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	ink(28, 31, 50);
	doc.text(issueDate, bX + bW - 2, bY + 11, { align: "right" });

	y += 6;
	stroke(...P, 0.5);
	doc.line(M, y, W - M, y);
	y += 10;

	// ── Bill To (left) | Due date (right) ────────────────────────────────────
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(7);
	ink(155, 158, 175);
	doc.text("BILL TO", M, y);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(155, 158, 175);
	doc.text("Due date:", W - M, y, { align: "right" });

	y += 5;
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(10);
	ink(25, 28, 48);
	doc.text(clientName, M, y);

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(9);
	ink(28, 31, 50);
	doc.text(dueDate, W - M, y, { align: "right" });

	y += 4.5;
	if (clientEmail && type === "client") {
		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8);
		ink(100, 103, 122);
		doc.text(clientEmail, M, y);
		y += 4;
	}

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	ink(120, 123, 142);
	doc.text(`Period: ${dateFrom}  –  ${dateTo}`, M, y);
	y += 10;

	// Payment terms centered
	doc.setFont(config.fontFamily, "italic");
	doc.setFontSize(7.5);
	ink(140, 143, 160);
	doc.text(`Payment Terms: ${payTerms}`, W / 2, y, { align: "center" });
	y += 8;

	// ── Table header ──────────────────────────────────────────────────────────
	// Columns: x positions (right-aligned cols use rx)
	const COL = {
		num:  { x: M,         rx: M + 6   },
		desc: { x: M + 9              },
		emp:  { x: M + 88             },
		date: { x: M + 118            },
		hrs:  { rx: M + 150           },
		amt:  { rx: W - M             },
	};

	hline(y, 188, 191, 202, 0.25);
	y += 1;

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(7);
	ink(155, 158, 175);

	doc.text("#",           COL.num.rx!,  y + 4, { align: "right" });
	doc.text("DESCRIPTION", COL.desc.x,   y + 4);
	doc.text("ASSIGNEE",    COL.emp.x,    y + 4);
	doc.text("DATE",        COL.date.x,   y + 4);
	if (config.showHours) doc.text("HRS", COL.hrs.rx!, y + 4, { align: "right" });
	doc.text("AMOUNT",      COL.amt.rx!,  y + 4, { align: "right" });

	y += 6;
	hline(y, 188, 191, 202, 0.25);
	y += 5;

	// ── Items ─────────────────────────────────────────────────────────────────
	const items = lineItems.length > 0 ? lineItems : [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8);
		ink(155, 158, 175);
		doc.text(`${i + 1}`, COL.num.rx!, y, { align: "right" });

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8.5);
		ink(25, 28, 48);
		doc.text(truncate(item.title, 50), COL.desc.x, y);

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8);
		ink(85, 88, 108);
		if (item.employee)     doc.text(truncate(item.employee, 20),    COL.emp.x,  y);
		if (item.completed_at) doc.text(item.completed_at,              COL.date.x, y);

		if (config.showHours && item.billable_hours > 0) {
			doc.text(item.billable_hours.toFixed(1), COL.hrs.rx!, y, { align: "right" });
		}

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8.5);
		ink(25, 28, 48);
		doc.text(item.subtotal.toFixed(2), COL.amt.rx!, y, { align: "right" });

		y += 5;
		hline(y, 222, 225, 234, 0.2);
		y += 3.5;

		if (y > 255 && i < items.length - 1) { doc.addPage(); y = 20; }
	}

	if (items.length === 0) {
		doc.setFont(config.fontFamily, "italic");
		doc.setFontSize(8.5);
		ink(175, 178, 195);
		doc.text("No completed tickets found for this period.", COL.desc.x, y);
		y += 10;
	}

	y += 6;

	// ── Totals ────────────────────────────────────────────────────────────────
	const totalSub  = items.reduce((s, i) => s + i.subtotal, 0);
	const totalDisc = items.reduce((s, i) => s + i.discount_amount, 0);
	const totalNet  = items.reduce((s, i) => s + i.net_total, 0);
	const discPct   = items[0]?.discount_percent ?? 0;

	const totRow = (label: string, val: string, bold = false) => {
		doc.setFont(config.fontFamily, bold ? "bold" : "normal");
		doc.setFontSize(bold ? 9.5 : 8.5);
		ink(bold ? P[0] : 135, bold ? P[1] : 138, bold ? P[2] : 155);
		doc.text(label, W - M - 46, y, { align: "right" });
		ink(bold ? P[0] : 28, bold ? P[1] : 31, bold ? P[2] : 50);
		doc.text(val, W - M, y, { align: "right" });
		y += bold ? 7 : 5;
	};

	totRow("SUB TOTAL", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) totRow(`DISCOUNT (${discPct}%)`, `− ${currency(totalDisc, cur)}`);

	hline(y - 1, 200, 203, 212, 0.25);
	y += 2;
	totRow("TOTAL AMOUNT", currency(totalNet, cur), true);

	// ── Footer ────────────────────────────────────────────────────────────────
	const footY = Math.max(y + 10, 252);
	hline(footY, 200, 203, 212, 0.25);

	const fY = footY + 6;
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(7.5);
	ink(28, 31, 50);
	doc.text("Terms & Conditions:", M, fY);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(120, 123, 142);
	const footNote = config.footerNote || "Payment is due by the date specified above. Thank you for your business.";
	doc.text(footNote, M, fY + 5, { maxWidth: 80 });

	const midX = W / 2 + 8;
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(7.5);
	ink(28, 31, 50);
	doc.text("Payment Information:", midX, fY);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(120, 123, 142);
	doc.text(payTerms, midX, fY + 5);
	doc.text(`Due: ${dueDate}`, midX, fY + 10);

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
