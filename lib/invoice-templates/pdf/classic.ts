import type { InvoiceData, InvoiceConfig } from "../types";
import { currency, paymentTermsLabel, dueDateFrom } from "../helpers";
import { registerFont } from "../font-loader";

export async function buildClassicPdf(data: InvoiceData, config: InvoiceConfig): Promise<ArrayBuffer> {
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

	// ── Header band ───────────────────────────────────────────────────────────
	doc.setFillColor(P[0], P[1], P[2]);
	doc.rect(0, 0, W, 32, "F");

	if (orgLogoUrl) {
		try { const img = await fetchImg(orgLogoUrl); doc.addImage(img.data, img.ext, M, 11, 10, 10); } catch {}
	}

	doc.setFont(HF, "normal"); doc.setFontSize(18); ink(255, 255, 255);
	doc.text(orgName, M, 21);

	doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(190, 205, 215);
	doc.text("INVOICE", W - M, 12, { align: "right" });

	doc.setFont(HF, "normal"); doc.setFontSize(6.5); ink(255, 255, 255);
	const numLines = doc.splitTextToSize(invoiceNumber, 90);
	const numSlice = numLines.slice(0, 2) as string[];
	numSlice.forEach((line: string, i: number) => doc.text(line, W - M, 18 + i * 4.5, { align: "right" }));

	doc.setFont(HF, "normal"); doc.setFontSize(8); ink(190, 205, 215);
	doc.text(issueDate, W - M, 28, { align: "right" });

	let y = 44;

	// ── Bill To ───────────────────────────────────────────────────────────────
	doc.setFont(HF, "bold"); doc.setFontSize(7); ink(155, 158, 175);
	doc.text("BILL TO", M, y);
	doc.setFont(HF, "normal"); doc.setFontSize(7.5);
	doc.text("DUE DATE", W - M, y, { align: "right" });

	y += 5;
	doc.setFont(HF, "bold"); doc.setFontSize(10); ink(25, 28, 48);
	doc.text(clientName, M, y);
	doc.setFont(HF, "bold"); doc.setFontSize(9); ink(28, 31, 50);
	doc.text(dueDate, W - M, y, { align: "right" });

	y += 4.5;
	if (clientEmail && type === "client") {
		doc.setFont(HF, "normal"); doc.setFontSize(8); ink(100, 103, 122);
		doc.text(clientEmail, M, y); y += 4;
	}

	doc.setFont(HF, "normal"); doc.setFontSize(8); ink(120, 123, 142);
	doc.text(`Period: ${dateFrom} to ${dateTo}`, M, y);
	y += 10;

	doc.setFont(HF, "italic"); doc.setFontSize(7.5); ink(140, 143, 160);
	doc.text(`Payment Terms: ${payTerms}`, W / 2, y, { align: "center" });
	y += 8;

	// ── Table header strip ────────────────────────────────────────────────────
	const tintR = Math.round(P[0] + (255 - P[0]) * 0.93);
	const tintG = Math.round(P[1] + (255 - P[1]) * 0.93);
	const tintB = Math.round(P[2] + (255 - P[2]) * 0.93);
	doc.setFillColor(tintR, tintG, tintB);
	doc.rect(M, y, W - 2 * M, 9, "F");

	const isTally = type !== "client";
	const COL = isTally ? {
		client: { x: M        }, desc: { x: M + 42  }, date: { x: M + 107 },
		hrs:    { rx: M + 140 }, rate: { rx: M + 158 }, amt:  { rx: W - M  },
	} : {
		num:  { rx: M + 7  }, desc: { x: M + 10  }, date: { x: M + 108 },
		hrs:  { rx: M + 145 }, rate: { rx: M + 163 }, amt: { rx: W - M  },
	};

	doc.setFont(HF, "bold"); doc.setFontSize(7); ink(105, 108, 128);
	if (isTally) {
		const c = COL as { client:{x:number}, desc:{x:number}, date:{x:number}, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
		doc.text("CLIENT", c.client.x, y + 5.5); doc.text("DESCRIPTION", c.desc.x, y + 5.5);
		doc.text("DATE", c.date.x, y + 5.5);
		if (config.showHours) doc.text("HRS",    c.hrs.rx,  y + 5.5, { align: "right" });
		if (config.showRate)  doc.text("RATE",   c.rate.rx, y + 5.5, { align: "right" });
		doc.text("AMOUNT", c.amt.rx, y + 5.5, { align: "right" });
	} else {
		const c = COL as { num:{rx:number}, desc:{x:number}, date:{x:number}, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
		doc.text("#", c.num.rx, y + 5.5, { align: "right" }); doc.text("DESCRIPTION", c.desc.x, y + 5.5);
		doc.text("DATE", c.date.x, y + 5.5);
		if (config.showHours) doc.text("HRS",  c.hrs.rx,  y + 5.5, { align: "right" });
		if (config.showRate)  doc.text("RATE", c.rate.rx, y + 5.5, { align: "right" });
		doc.text("AMOUNT", c.amt.rx, y + 5.5, { align: "right" });
	}

	y += 9; hline(y, 210, 213, 225, 0.25); y += 5;

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
			doc.text(truncate(item.title, 38), c.desc.x, y);
			if (item.completed_at) {
				doc.setFont(HF, "normal"); doc.setFontSize(7); ink(120, 123, 142);
				doc.text(item.completed_at.slice(0, 10), c.date.x, y);
			}
			if (config.showHours) {
				doc.setFont(NF, "normal"); doc.setFontSize(7.5); ink(25, 28, 48);
				doc.text(item.billable_hours.toFixed(1), c.hrs.rx, y, { align: "right" });
			}
			if (config.showRate) {
				doc.setFont(NF, "normal");
				doc.text(item.rate.toFixed(2), c.rate.rx, y, { align: "right" });
			}
			doc.setFont(NF, "normal");
			doc.text(item.subtotal.toFixed(2), c.amt.rx, y, { align: "right" });
		} else {
			const c = COL as { num:{rx:number}, desc:{x:number}, date:{x:number}, hrs:{rx:number}, rate:{rx:number}, amt:{rx:number} };
			doc.setFont(HF, "normal"); doc.setFontSize(7); ink(175, 178, 195);
			doc.text(`${i + 1}`, c.num.rx, y, { align: "right" });
			doc.setFontSize(7.5); ink(25, 28, 48);
			doc.text(truncate(item.title, 52), c.desc.x, y);
			if (item.completed_at) {
				doc.setFontSize(7); ink(120, 123, 142);
				doc.text(item.completed_at.slice(0, 10), c.date.x, y);
			}
			if (config.showHours) {
				doc.setFont(NF, "normal"); doc.setFontSize(7.5); ink(25, 28, 48);
				doc.text(item.billable_hours.toFixed(1), c.hrs.rx, y, { align: "right" });
			}
			if (config.showRate) {
				doc.setFont(NF, "normal");
				doc.text(item.rate.toFixed(2), c.rate.rx, y, { align: "right" });
			}
			doc.setFont(NF, "normal");
			doc.text(item.subtotal.toFixed(2), c.amt.rx, y, { align: "right" });
		}

		y += 5; hline(y, 225, 228, 238, 0.2); y += 4;
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
		ink(bold ? P[0] : 130, bold ? P[1] : 133, bold ? P[2] : 150);
		doc.text(label, W - M - 46, y, { align: "right" });
		doc.setFont(NF, bold ? "bold" : "normal"); doc.setFontSize(bold ? 9.5 : 8);
		ink(bold ? P[0] : 28, bold ? P[1] : 31, bold ? P[2] : 50);
		doc.text(val, W - M, y, { align: "right" });
		y += bold ? 7 : 5.5;
	};

	totRow("SUB TOTAL", currency(totalSub, cur));
	if (config.showDiscount && totalDisc > 0) totRow(`DISCOUNT (${discPct}%)`, `-${currency(totalDisc, cur)}`);
	y += 3; hline(y, 200, 203, 212, 0.3); y += 6;
	totRow("TOTAL AMOUNT", currency(totalNet, cur), true);

	// ── Footer ────────────────────────────────────────────────────────────────
	const footY = Math.max(y + 10, 252);
	hline(footY, 200, 203, 212, 0.25);
	const fY = footY + 6;

	doc.setFont(HF, "bold"); doc.setFontSize(7.5); ink(28, 31, 50);
	doc.text("Terms & Conditions:", M, fY);
	doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(120, 123, 142);
	doc.text(config.footerNote || "Payment is due by the date specified above. Thank you for your business.", M, fY + 5, { maxWidth: 80 });

	const midX = W / 2 + 8;
	doc.setFont(HF, "bold"); doc.setFontSize(7.5); ink(28, 31, 50);
	doc.text("Payment Information:", midX, fY);
	doc.setFont(HF, "normal"); doc.setFontSize(7.5); ink(120, 123, 142);
	doc.text(payTerms,          midX, fY + 5);
	doc.text(`Due: ${dueDate}`, midX, fY + 10);

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
