import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";
import { registerFont } from "../font-loader";

export async function buildModernPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
	const { default: jsPDF } = await import("jspdf");
	const { lineItems, invoiceNumber, issueDate, orgName, orgLogoUrl, dateFrom, dateTo, type } = data;

	const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
	const P   = hexToRgb(config.primaryColor);
	const W   = 210, M = 18;

	const bootsBase64 = config.fonts?.["Bootshaus"];
	const robotoBase64 = config.fonts?.["Roboto"];
	if (bootsBase64) registerFont(doc as any, "Bootshaus", bootsBase64);
	if (robotoBase64) registerFont(doc as any, "Roboto", robotoBase64);
	const HF = bootsBase64 ? "Bootshaus" : config.fontFamily; // everything text
	const NF = robotoBase64 ? "Roboto" : config.fontFamily;   // numbers only

	const ink    = (r: number, g: number, b: number) => doc.setTextColor(r, g, b);
	const stroke = (r: number, g: number, b: number, w = 0.25) => { doc.setDrawColor(r, g, b); doc.setLineWidth(w); };
	const hline  = (y: number, r = 200, g = 203, b = 212, w = 0.25) => { stroke(r, g, b, w); doc.line(M, y, W - M, y); };

	const first       = lineItems[0];
	const clientName  = type === "client" ? (first?.client_name ?? "") : "All Clients";
	const clientEmail = first?.client_email ?? "";
	const cur         = first?.currency ?? "USD";
	const payTerms    = paymentTermsLabel(first?.payment_terms ?? "net_30");
	const dueDate     = dueDateFrom(first?.payment_terms ?? "net_30", new Date(issueDate));

	// ── Right-bleed accent panel ──────────────────────────────────────────────
	const PANEL_W = 70, PANEL_H = 38, PANEL_X = W - PANEL_W;
	doc.setFillColor(P[0], P[1], P[2]);
	doc.rect(PANEL_X, 0, PANEL_W, PANEL_H, "F");

	const pX = PANEL_X + 5;

	doc.setFont(HF, "bold"); doc.setFontSize(10); ink(255, 255, 255);
	doc.text("INVOICE", pX, 12);

	doc.setFont(HF, "normal"); doc.setFontSize(5.5); ink(190, 210, 215);
	const numLines = doc.splitTextToSize(invoiceNumber, 60) as string[];
	const numSlice = numLines.slice(0, 2);
	numSlice.forEach((line: string, i: number) => doc.text(line, pX, 18 + i * 4.5));

	const issuedY = 18 + numSlice.length * 4.5;
	doc.setFontSize(7); ink(190, 210, 215);

	doc.setFont(HF, "normal"); doc.text("Issued", pX, issuedY);
	doc.text(issueDate, pX + doc.getTextWidth("Issued  "), issuedY);
	doc.text("Due", pX, issuedY + 5);
	doc.text(dueDate, pX + doc.getTextWidth("Due     "), issuedY + 5);

	// ── Left header ───────────────────────────────────────────────────────────
	if (orgLogoUrl) {
		try { const img = await fetchImg(orgLogoUrl); doc.addImage(img.data, img.ext, M, 8, 10, 10); } catch {}
	}

	doc.setFont(HF, "normal"); doc.setFontSize(14); ink(25, 28, 48);
	doc.text(orgName, M, 16);
	doc.setFont(HF, "normal"); doc.setFontSize(8); ink(140, 143, 160);
	doc.text(issueDate, M, 21);

	let y = PANEL_H + 10;
	hline(y, 188, 191, 202, 0.3); y += 10;

	// ── Bill To ───────────────────────────────────────────────────────────────
	doc.setFont(HF, "bold"); doc.setFontSize(7.5); ink(155, 158, 175);
	doc.text("BILL TO", M, y);
	y += 5;

	doc.setFont(HF, "bold"); doc.setFontSize(10); ink(25, 28, 48);
	doc.text(clientName, M, y);
	y += 4.5;

	if (clientEmail && type === "client") {
		doc.setFont(HF, "normal"); doc.setFontSize(8); ink(100, 103, 122);
		doc.text(clientEmail, M, y); y += 4;
	}

	doc.setFont(HF, "normal"); doc.setFontSize(8); ink(120, 123, 142);
	doc.text(`Period: ${dateFrom} to ${dateTo}`, M, y);
	y += 10; hline(y, 188, 191, 202, 0.3); y += 8;

	// ── Table header ──────────────────────────────────────────────────────────
	const isTally = type !== "client";
	const COL = isTally ? {
		client: { x: M       }, desc: { x: M + 40  }, date: { x: M + 100 },
		hrs:    { rx: M + 133 }, rate: { rx: M + 155 }, amt: { rx: W - M  },
	} : {
		desc: { x: M       }, date: { x: M + 100 },
		hrs:  { rx: M + 133 }, rate: { rx: M + 155 }, amt: { rx: W - M },
	};

	doc.setFont(HF, "bold"); doc.setFontSize(7.5); ink(28, 31, 50);
	if (isTally) {
		const c = COL as { client:{x:number}, desc:{x:number}, date:{x:number}, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
		doc.text("Client", c.client.x, y); doc.text("Description", c.desc.x, y); doc.text("Date", c.date.x, y);
		if (config.showHours) doc.text("Hrs",    c.hrs.rx, y, { align: "right" });
		if (config.showRate)  doc.text("Rate",   c.rate.rx, y, { align: "right" });
		doc.text("Amount", c.amt.rx, y, { align: "right" });
	} else {
		const c = COL as { desc:{x:number}, date:{x:number}, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
		doc.text("Description", c.desc.x, y); doc.text("Date", c.date.x, y);
		if (config.showHours) doc.text("Hrs",  c.hrs.rx, y, { align: "right" });
		if (config.showRate)  doc.text("Rate", c.rate.rx, y, { align: "right" });
		doc.text("Amount", c.amt.rx, y, { align: "right" });
	}

	y += 3; stroke(P[0], P[1], P[2], 0.5); doc.line(M, y + 1, W - M, y + 1); y += 6;

	// ── Items ─────────────────────────────────────────────────────────────────
	const items = lineItems;

	if (items.length === 0) {
		doc.setFont(HF, "italic"); doc.setFontSize(7.5); ink(175, 178, 195);
		doc.text("No completed tickets found for this period.", M, y); y += 10;
	}

	for (let i = 0; i < items.length; i++) {
		const item = items[i];

		if (isTally) {
			const c = COL as { client:{x:number}, desc:{x:number}, date:{x:number}, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
			doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(25, 28, 48);
			doc.text(truncate(item.client_name, 20), c.client.x, y);
			doc.text(truncate(item.title, 36), c.desc.x, y);
			if (config.showHours) { doc.setFont(NF, "normal"); doc.text(item.billable_hours.toFixed(1), c.hrs.rx, y, { align: "right" }); }
			if (config.showRate)  { doc.setFont(NF, "normal"); doc.text(item.rate.toFixed(2), c.rate.rx, y, { align: "right" }); }
			doc.setFont(NF, "normal"); doc.text(item.subtotal.toFixed(2), c.amt.rx, y, { align: "right" });
			y += 4;
			if (item.completed_at) {
				doc.setFont(HF, "normal"); doc.setFontSize(6.5); ink(160, 163, 178);
				doc.text(item.completed_at.slice(0, 10), c.date.x, y); y += 4;
			}
		} else {
			const c = COL as { desc:{x:number}, date:{x:number}, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
			doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(25, 28, 48);
			doc.text(truncate(item.title, 60), c.desc.x, y);
			if (config.showHours) { doc.setFont(NF, "normal"); doc.text(item.billable_hours.toFixed(1), c.hrs.rx, y, { align: "right" }); }
			if (config.showRate)  { doc.setFont(NF, "normal"); doc.text(item.rate.toFixed(2), c.rate.rx, y, { align: "right" }); }
			doc.setFont(NF, "normal"); doc.text(item.subtotal.toFixed(2), c.amt.rx, y, { align: "right" });
			y += 4;
			if (item.completed_at) {
				doc.setFont(HF, "normal"); doc.setFontSize(6.5); ink(160, 163, 178);
				doc.text(item.completed_at.slice(0, 10), c.date.x, y); y += 4;
			}
		}

		hline(y, 220, 223, 232, 0.2); y += 4;
		if (y > 255 && i < items.length - 1) { doc.addPage(); y = 20; }
	}

	y += 6;

	// ── Totals ────────────────────────────────────────────────────────────────
	const totalSub  = items.reduce((s, it) => s + it.subtotal, 0);
	const totalDisc = items.reduce((s, it) => s + it.discount_amount, 0);
	const totalNet  = items.reduce((s, it) => s + it.net_total, 0);
	const discPct   = items[0]?.discount_percent ?? 0;

	const totRow = (label: string, val: string, bold = false) => {
		doc.setFont(HF, bold ? "bold" : "normal"); doc.setFontSize(bold ? 9.5 : 8);
		ink(bold ? P[0] : 120, bold ? P[1] : 123, bold ? P[2] : 142);
		doc.text(label, W - M - 44, y, { align: "right" });
		doc.setFont(NF, bold ? "bold" : "normal"); doc.setFontSize(bold ? 9.5 : 8);
		ink(bold ? P[0] : 28, bold ? P[1] : 31, bold ? P[2] : 50);
		doc.text(val, W - M, y, { align: "right" });
		y += bold ? 7 : 5.5;
	};

	totRow("Subtotal", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) totRow(`Discount (${discPct}%)`, `-${currency(totalDisc, cur)}`);
	y += 4; hline(y, 188, 191, 202, 0.3); y += 6;
	totRow("Total", currency(totalNet, cur), true);

	// ── Footer ────────────────────────────────────────────────────────────────
	const footY = Math.max(y + 10, 248);
	hline(footY, 188, 191, 202, 0.3);
	const fY = footY + 6;

	doc.setFont(HF, "bold"); doc.setFontSize(8); ink(28, 31, 50);
	doc.text("Payment Terms", M, fY);
	doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(110, 113, 132);
	doc.text(payTerms, M, fY + 5);
	doc.text(`Due: ${dueDate}`, M, fY + 10);

	const midX = W / 2 + 8;
	doc.setFont(HF, "bold"); doc.setFontSize(8); ink(28, 31, 50);
	doc.text("Notes", midX, fY);
	doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(110, 113, 132);
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
