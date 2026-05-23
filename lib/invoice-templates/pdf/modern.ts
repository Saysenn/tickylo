import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";

// Modern — image-2 style (clean white, company left + logo right, bold underline header)
// Org name + address block left. Bill To left | Invoice meta right.
// Table with bold column headers. Thin row rules. Totals right. Payment footer.

export async function buildModernPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
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

	let y = 20;

	// ── Header — org name left, logo placeholder right ─────────────────────
	// Logo (circle-style in reference — we render rectangular)
	if (orgLogoUrl) {
		try {
			const img = await fetchImg(orgLogoUrl);
			doc.addImage(img.data, img.ext, W - M - 18, y - 6, 18, 18);
		} catch {}
	}

	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(11);
	ink(25, 28, 48);
	doc.text(orgName, M, y);

	y += 5;
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	ink(120, 123, 142);
	doc.text(issueDate, M, y);

	y += 12;
	hline(y, 188, 191, 202, 0.3);
	y += 10;

	// ── Bill To (left) | Invoice meta (right) ────────────────────────────────
	// Left
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(7.5);
	ink(155, 158, 175);
	doc.text("BILL TO", M, y);

	// Right header
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(7.5);
	ink(155, 158, 175);
	doc.text("INVOICE", W - M, y, { align: "right" });

	y += 5;
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(10);
	ink(25, 28, 48);
	doc.text(clientName, M, y);

	// Invoice number on its own line — small mono style, right-aligned
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(6.5);
	ink(90, 93, 112);
	doc.text(invoiceNumber, W - M, y, { align: "right" });

	y += 5;

	// Invoice meta — right block, label + value pairs
	const metaRow = (label: string, val: string, yy: number) => {
		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8);
		ink(120, 123, 142);
		doc.text(label, W - M - 34, yy);
		ink(28, 31, 50);
		doc.text(val, W - M, yy, { align: "right" });
	};

	if (clientEmail && type === "client") {
		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8);
		ink(90, 93, 112);
		doc.text(clientEmail, M, y);
		y += 4;
	}
	metaRow("Issue Date:", issueDate, y);         y += 5;
	metaRow("Due Date:",   dueDate, y);           y += 5;
	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(8);
	ink(90, 93, 112);
	doc.text(`Period: ${dateFrom}  –  ${dateTo}`, M, y);

	y += 10;
	hline(y, 188, 191, 202, 0.3);
	y += 8;

	// ── Table ─────────────────────────────────────────────────────────────────
	const COL = {
		desc: { x: M              },
		emp:  { x: M + 90         },   // was M+98, gives more description room
		hrs:  { rx: M + 138       },   // was M+145
		rate: { rx: M + 157       },   // was M+164, now 19mm from amt — no overlap
		amt:  { rx: W - M         },
	};

	// Column headers — bold text, underline rule
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(7.5);
	ink(28, 31, 50);
	doc.text("Description",   COL.desc.x,  y);
	doc.text("Assignee",      COL.emp.x,   y);
	if (config.showHours) doc.text("Hrs",  COL.hrs.rx!,  y, { align: "right" });
	if (config.showRate)  doc.text("Rate", COL.rate.rx!, y, { align: "right" });
	doc.text("Amount",        COL.amt.rx!,  y, { align: "right" });

	y += 3;
	hline(y, 28, 31, 50, 0.4);
	y += 6;

	// ── Items ─────────────────────────────────────────────────────────────────
	const items = lineItems.length > 0 ? lineItems : [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8.5);
		ink(25, 28, 48);
		doc.text(truncate(item.title, 54), COL.desc.x, y);

		doc.setFontSize(8);
		ink(85, 88, 108);
		if (item.employee)     doc.text(truncate(item.employee, 22),  COL.emp.x,   y);
		if (config.showHours && item.billable_hours > 0)
			doc.text(item.billable_hours.toFixed(1), COL.hrs.rx!,  y, { align: "right" });
		if (config.showRate)
			doc.text(item.rate.toFixed(2), COL.rate.rx!, y, { align: "right" });

		doc.setFont(config.fontFamily, "normal");
		doc.setFontSize(8.5);
		ink(25, 28, 48);
		doc.text(item.subtotal.toFixed(2), COL.amt.rx!, y, { align: "right" });

		y += 4.5;

		// Subline: date
		if (item.completed_at) {
			doc.setFont(config.fontFamily, "normal");
			doc.setFontSize(7.5);
			ink(155, 158, 175);
			doc.text(item.completed_at, COL.desc.x, y);
			y += 4;
		}

		hline(y, 218, 221, 230, 0.2);
		y += 4;

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
		ink(bold ? P[0] : 120, bold ? P[1] : 123, bold ? P[2] : 142);
		doc.text(label, W - M - 44, y, { align: "right" });
		ink(bold ? P[0] : 28, bold ? P[1] : 31, bold ? P[2] : 50);
		doc.text(val, W - M, y, { align: "right" });
		y += bold ? 7 : 5;
	};

	totRow("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) totRow(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);

	y += 3;
	hline(y, 188, 191, 202, 0.3);
	y += 6;
	totRow("Total", currency(totalNet, cur), true);

	// ── Footer — Pay by bank / Terms ─────────────────────────────────────────
	const footY = Math.max(y + 10, 248);
	hline(footY, 188, 191, 202, 0.3);

	const fY = footY + 6;
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(8);
	ink(28, 31, 50);
	doc.text("Payment Terms", M, fY);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(110, 113, 132);
	doc.text(payTerms,      M, fY + 5);
	doc.text(`Due: ${dueDate}`, M, fY + 10);

	const midX = W / 2 + 8;
	doc.setFont(config.fontFamily, "bold");
	doc.setFontSize(8);
	ink(28, 31, 50);
	doc.text("Notes", midX, fY);

	doc.setFont(config.fontFamily, "normal");
	doc.setFontSize(7.5);
	ink(110, 113, 132);
	doc.text(config.footerNote || "Thank you for your business.", midX, fY + 5, { maxWidth: 80 });

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
