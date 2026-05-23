"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, Check, Upload, X, ChevronLeft, Eye } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { TEMPLATES } from "@/lib/invoice-templates";
import type { InvoiceConfig, TemplateDefinition } from "@/lib/invoice-templates";
import { DEFAULT_CONFIG } from "@/lib/invoice-templates";

// ── Template previews ─────────────────────────────────────────────────────────

const SAMPLES = [
	{ ref: "A1B2C3", desc: "Website Redesign Phase 1", by: "Jane D.", date: "2026-05-10", hrs: "8.00", rate: "85.00", amt: "680.00" },
	{ ref: "D4E5F6", desc: "API Integration Setup",    by: "Mark S.", date: "2026-05-12", hrs: "5.50", rate: "85.00", amt: "467.50" },
	{ ref: "G7H8I9", desc: "Bug Fix — Auth Module",    by: "Jane D.", date: "2026-05-15", hrs: "2.00", rate: "85.00", amt: "170.00" },
];

function fontStack(f: string) {
	return f === "courier" ? "Courier New, monospace" : f === "times" ? "Georgia, serif" : "Inter, system-ui, sans-serif";
}

// ── XLSX: Classic — corporate/legal ──────────────────────────────────────────
function XlsxClassicPreview({ config, orgName }: { config: InvoiceConfig; orgName: string }) {
	const p = `#${config.primaryColor}`;
	const tdBase: React.CSSProperties = { padding: "4px 5px", borderBottom: "1px solid #d8dce8", fontSize: 9, color: "#2a2d47" };
	return (
		<div style={{ fontFamily: fontStack(config.fontFamily), fontSize: 10 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
				<span style={{ fontWeight: 700, fontSize: 15, color: p }}>{orgName}</span>
				<span style={{ fontWeight: 700, fontSize: 18, color: p }}>INVOICE</span>
			</div>
			<div style={{ height: 2, background: p, marginBottom: 8 }} />
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
				<div>
					<div style={{ fontSize: 7, color: "#a0a5bc", fontWeight: 700, marginBottom: 2 }}>BILL TO</div>
					<div style={{ fontWeight: 700, fontSize: 11, color: p }}>Acme Corporation</div>
					<div style={{ fontSize: 8.5, color: "#8890a8" }}>billing@acme.com</div>
					<div style={{ fontSize: 7.5, color: "#a0a5bc", fontStyle: "italic", marginTop: 2 }}>Per Ticket  ·  Net 30</div>
				</div>
				<div style={{ textAlign: "right", fontSize: 8 }}>
					<div style={{ color: "#9ba0b8" }}>Invoice No. <span style={{ fontWeight: 700, color: "#2a2d47" }}>#TW-ORG-001</span></div>
					<div style={{ color: "#9ba0b8", marginTop: 2 }}>Issue Date <span style={{ fontWeight: 700, color: "#2a2d47" }}>2026-05-23</span></div>
					<div style={{ color: "#9ba0b8", marginTop: 2 }}>Due Date <span style={{ fontWeight: 700, color: "#2a2d47" }}>2026-06-22</span></div>
				</div>
			</div>
			<div style={{ fontSize: 7.5, color: "#a0a5bc", fontStyle: "italic", marginBottom: 6 }}>Period: 2026-05-01 — 2026-05-31</div>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead>
					<tr>
						{["Matter #", "Description", "Fee Earner", "Completed", config.showHours ? "Hours" : null, config.showRate ? "Rate" : null, "Amount"].filter(Boolean).map((h) => (
							<th key={h} style={{ background: p, color: "#fff", fontWeight: 700, fontSize: 8.5, padding: "5px 5px", textAlign: h === "Amount" || h === "Hours" || h === "Rate" ? "right" : "left" }}>{h}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{SAMPLES.map((r, i) => (
						<tr key={r.ref} style={{ background: i % 2 === 1 ? "#f2f4f8" : "#fff" }}>
							<td style={{ ...tdBase, fontFamily: "Courier New", fontSize: 8, color: "#9ba0b8" }}>{r.ref}</td>
							<td style={tdBase}>{r.desc}</td>
							<td style={tdBase}>{r.by}</td>
							<td style={tdBase}>{r.date}</td>
							{config.showHours && <td style={{ ...tdBase, textAlign: "right" }}>{r.hrs}</td>}
							{config.showRate  && <td style={{ ...tdBase, textAlign: "right" }}>{r.rate}</td>}
							<td style={{ ...tdBase, textAlign: "right" }}>{r.amt}</td>
						</tr>
					))}
				</tbody>
			</table>
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 8, fontSize: 8.5, color: "#9ba0b8" }}>
				<span>Subtotal</span><span>USD 1,317.50</span>
			</div>
			{config.showDiscount && <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontSize: 8.5, color: "#9ba0b8" }}><span>Discount (10%)</span><span>− USD 131.75</span></div>}
			<div style={{ borderTop: `1.5px solid ${p}`, marginTop: 4, paddingTop: 4, display: "flex", justifyContent: "flex-end", gap: 16, fontWeight: 700, fontSize: 11, color: p }}>
				<span>TOTAL DUE</span><span>USD 1,185.75</span>
			</div>
			<div style={{ textAlign: "center", fontSize: 7.5, color: "#c0c5d8", marginTop: 10, fontStyle: "italic" }}>{config.footerNote || "Payment due by 2026-06-22. Thank you for your business."}</div>
		</div>
	);
}

// ── XLSX: Modern — creative agency ────────────────────────────────────────────
function XlsxModernPreview({ config, orgName }: { config: InvoiceConfig; orgName: string }) {
	const p = `#${config.primaryColor}`;
	return (
		<div style={{ fontFamily: fontStack(config.fontFamily), fontSize: 11 }}>
			<div style={{ fontWeight: 700, fontSize: 20, color: p, letterSpacing: 1, marginBottom: 2 }}>{orgName.toUpperCase()}</div>
			<div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: "#a8aec8", marginBottom: 4 }}>
				<span>Invoice  #TW-ORG-001</span>
				<span>2026-05-01 — 2026-05-31</span>
			</div>
			<div style={{ height: 3, background: p, marginBottom: 10 }} />
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
				<div>
					<div style={{ fontWeight: 700, fontSize: 13, color: p }}>Acme Corporation</div>
					<div style={{ fontSize: 8.5, color: "#a8aec8" }}>Net 30 days</div>
				</div>
				<div style={{ textAlign: "right", fontSize: 8.5, color: "#a8aec8" }}>
					<div>Issued 2026-05-23</div>
					<div>Due 2026-06-22</div>
				</div>
			</div>
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
				<thead>
					<tr>
						{["Ref", "Deliverable", "Creative", "Date", config.showHours ? "Hours" : null, config.showRate ? "Rate" : null, "Fee"].filter(Boolean).map((h) => (
							<th key={h} style={{ color: "#c0c6dc", fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", borderBottom: `2px solid ${p}`, padding: "5px 4px", textAlign: h === "Fee" || h === "Hours" || h === "Rate" ? "right" : "left" }}>{h}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{SAMPLES.map((r, i) => (
						<tr key={r.ref} style={{ background: i % 2 === 1 ? "#f8f9fc" : "#fff" }}>
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e4e8f2", fontFamily: "Courier New", fontSize: 8.5, color: "#a8aec8" }}>{r.ref}</td>
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e4e8f2", color: "#252840" }}>{r.desc}</td>
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e4e8f2", color: "#252840" }}>{r.by}</td>
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e4e8f2", color: "#252840" }}>{r.date}</td>
							{config.showHours && <td style={{ padding: "4px 4px", borderBottom: "1px solid #e4e8f2", textAlign: "right" }}>{r.hrs}</td>}
							{config.showRate  && <td style={{ padding: "4px 4px", borderBottom: "1px solid #e4e8f2", textAlign: "right" }}>{r.rate}</td>}
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e4e8f2", textAlign: "right" }}>{r.amt}</td>
						</tr>
					))}
				</tbody>
			</table>
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 20, marginTop: 10, fontSize: 9, color: "#a8aec8" }}>
				<span>Subtotal</span><span>USD 1,317.50</span>
			</div>
			{config.showDiscount && <div style={{ display: "flex", justifyContent: "flex-end", gap: 20, fontSize: 9, color: "#a8aec8" }}><span>Discount 10%</span><span>− USD 131.75</span></div>}
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 20, marginTop: 4, fontWeight: 700, fontSize: 12, color: p }}>
				<span>TOTAL DUE</span><span>USD 1,185.75</span>
			</div>
			<div style={{ textAlign: "center", fontSize: 8, color: "#c8cedf", marginTop: 10, fontStyle: "italic" }}>{config.footerNote || "Thank you for your business."}</div>
		</div>
	);
}

// ── XLSX: Minimal — freelancer/letter ─────────────────────────────────────────
function XlsxMinimalPreview({ config, orgName }: { config: InvoiceConfig; orgName: string }) {
	const p = `#${config.primaryColor}`;
	return (
		<div style={{ fontFamily: fontStack(config.fontFamily), fontSize: 11 }}>
			<div style={{ fontWeight: 700, fontSize: 14, color: p, marginBottom: 2 }}>{orgName}</div>
			<div style={{ height: 2, background: p, marginBottom: 12 }} />
			{[
				["to",      "Acme Corporation"],
				["",        "billing@acme.com"],
				["date",    "2026-05-23"],
				["due",     "2026-06-22"],
				["invoice", "#TW-ORG-001"],
				["period",  "2026-05-01 — 2026-05-31"],
				["terms",   "Net 30 days"],
			].map(([label, val], i) => (
				<div key={i} style={{ display: "flex", gap: 16, fontSize: 9, marginBottom: 3 }}>
					<span style={{ width: 52, color: "#c0c5d5", flexShrink: 0 }}>{label}</span>
					<span style={{ color: "#252840" }}>{val}</span>
				</div>
			))}
			<div style={{ height: 1, background: "#d8dce8", margin: "10px 0" }} />
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
				<thead>
					<tr>
						{["ref", "description", "by", "date", config.showHours ? "hrs" : null, "amount"].filter(Boolean).map((h) => (
							<th key={h} style={{ color: "#d0d5e5", fontSize: 8, fontWeight: 400, borderBottom: `2px solid ${p}`, padding: "4px 3px", textAlign: h === "amount" || h === "hrs" ? "right" : "left" }}>{h}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{SAMPLES.map((r) => (
						<tr key={r.ref}>
							<td style={{ padding: "4px 3px", borderBottom: "1px solid #e8ebf4", fontFamily: "Courier New", fontSize: 8.5, color: "#c0c5d5" }}>{r.ref}</td>
							<td style={{ padding: "4px 3px", borderBottom: "1px solid #e8ebf4", color: "#252840" }}>{r.desc}</td>
							<td style={{ padding: "4px 3px", borderBottom: "1px solid #e8ebf4", color: "#252840" }}>{r.by}</td>
							<td style={{ padding: "4px 3px", borderBottom: "1px solid #e8ebf4", color: "#252840" }}>{r.date}</td>
							{config.showHours && <td style={{ padding: "4px 3px", borderBottom: "1px solid #e8ebf4", textAlign: "right" }}>{r.hrs}</td>}
							<td style={{ padding: "4px 3px", borderBottom: "1px solid #e8ebf4", textAlign: "right" }}>{r.amt}</td>
						</tr>
					))}
				</tbody>
			</table>
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 20, marginTop: 8, fontSize: 9, color: "#c0c5d5" }}>
				<span>subtotal</span><span>USD 1,317.50</span>
			</div>
			{config.showDiscount && <div style={{ display: "flex", justifyContent: "flex-end", gap: 20, fontSize: 9, color: "#c0c5d5" }}><span>discount  10%</span><span>− USD 131.75</span></div>}
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 20, marginTop: 4, fontWeight: 700, fontSize: 12, color: p }}>
				<span>total  USD</span><span>1,185.75</span>
			</div>
			<div style={{ fontSize: 8.5, color: "#d0d5e5", marginTop: 12, fontStyle: "italic" }}>{config.footerNote || "thank you."}</div>
		</div>
	);
}

// ── PDF: Classic — Invoice Fly / letterhead style ─────────────────────────────
function PdfClassicPreview({ config, orgName }: { config: InvoiceConfig; orgName: string }) {
	const p = `#${config.primaryColor}`;
	const rows = [
		{ n: 1, desc: "Website Redesign Phase 1", emp: "Jane D.",  date: "2026-05-10", hrs: "8.0",  amt: "680.00"  },
		{ n: 2, desc: "API Integration Setup",    emp: "Mark S.",  date: "2026-05-12", hrs: "5.5",  amt: "467.50"  },
		{ n: 3, desc: "Bug Fix — Auth Module",    emp: "Jane D.",  date: "2026-05-15", hrs: "2.0",  amt: "170.00"  },
	];
	return (
		<div style={{ fontFamily: fontStack(config.fontFamily), fontSize: 10 }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
				<div>
					<div style={{ fontSize: 7.5, color: "#9fa4bc", marginBottom: 2 }}>INVOICE</div>
					<div style={{ fontWeight: 700, fontSize: 15, color: p }}>{orgName}</div>
				</div>
				<div style={{ border: `1px solid ${p}`, padding: "4px 8px", minWidth: 80, textAlign: "right" }}>
					<div style={{ fontSize: 7, color: "#9fa4bc" }}>NO.</div>
					<div style={{ fontWeight: 700, fontSize: 8, color: "#1c1f36" }}>TW-ORG-001</div>
					<div style={{ fontSize: 8, color: "#1c1f36", marginTop: 2 }}>2026-05-23</div>
				</div>
			</div>
			<div style={{ height: 1.5, background: p, marginBottom: 8 }} />
			{/* Bill To / Due */}
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
				<div>
					<div style={{ fontSize: 7, color: "#9fa4bc", fontWeight: 700, marginBottom: 2 }}>BILL TO</div>
					<div style={{ fontWeight: 700, fontSize: 10, color: "#1c1f36" }}>Acme Corporation</div>
					<div style={{ fontSize: 8, color: "#7880a0" }}>billing@acme.com</div>
					<div style={{ fontSize: 8, color: "#9fa4bc", marginTop: 1 }}>Period: 2026-05-01 – 2026-05-31</div>
				</div>
				<div style={{ textAlign: "right", fontSize: 8, color: "#9fa4bc" }}>
					<div>Due date:</div>
					<div style={{ fontWeight: 700, color: "#1c1f36", marginTop: 1 }}>2026-06-22</div>
				</div>
			</div>
			<div style={{ fontSize: 7.5, color: "#9fa4bc", fontStyle: "italic", textAlign: "center", marginBottom: 6 }}>
				Payment Terms: Net 30 days
			</div>
			{/* Table */}
			<div style={{ borderTop: "1px solid #cdd1e0", borderBottom: "1px solid #cdd1e0", display: "grid", gridTemplateColumns: "18px 1fr 60px 50px auto", gap: "0 6px", padding: "4px 0", marginBottom: 2 }}>
				{["#", "DESCRIPTION", "ASSIGNEE", "DATE", "AMOUNT"].map((h) => (
					<div key={h} style={{ fontSize: 7, fontWeight: 700, color: "#9fa4bc" }}>{h}</div>
				))}
			</div>
			{rows.map((r) => (
				<div key={r.n} style={{ display: "grid", gridTemplateColumns: "18px 1fr 60px 50px auto", gap: "0 6px", padding: "4px 0", borderBottom: "1px solid #e8ebf5", alignItems: "center" }}>
					<div style={{ fontSize: 8, color: "#9fa4bc" }}>{r.n}</div>
					<div style={{ fontSize: 8.5, color: "#1c1f36" }}>{r.desc}</div>
					<div style={{ fontSize: 8, color: "#7880a0" }}>{r.emp}</div>
					<div style={{ fontSize: 8, color: "#7880a0" }}>{r.date}</div>
					<div style={{ fontSize: 8.5, color: "#1c1f36", textAlign: "right" }}>{r.amt}</div>
				</div>
			))}
			{/* Totals */}
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 8, fontSize: 8.5, color: "#7880a0" }}>
				<span>SUB TOTAL</span><span>1,317.50</span>
			</div>
			{config.showDiscount && <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontSize: 8.5, color: "#7880a0" }}><span>DISCOUNT (10%)</span><span>− 131.75</span></div>}
			<div style={{ height: 1, background: "#cdd1e0", margin: "4px 0" }} />
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontWeight: 700, fontSize: 10, color: p }}>
				<span>TOTAL AMOUNT</span><span>USD 1,185.75</span>
			</div>
			{/* Footer */}
			<div style={{ borderTop: "1px solid #e0e3ef", marginTop: 10, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#9fa4bc" }}>
				<div><div style={{ fontWeight: 700, color: "#1c1f36", marginBottom: 2 }}>Terms & Conditions:</div>{config.footerNote || "Payment due by date specified."}</div>
				<div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, color: "#1c1f36", marginBottom: 2 }}>Payment Terms:</div><div>Net 30  ·  Due 2026-06-22</div></div>
			</div>
		</div>
	);
}

// ── PDF: Modern — image-2 style (clean, bold underline header) ────────────────
function PdfModernPreview({ config, orgName }: { config: InvoiceConfig; orgName: string }) {
	const p = `#${config.primaryColor}`;
	const rows = [
		{ desc: "Website Redesign Phase 1", emp: "Jane D.",  date: "2026-05-10", hrs: "8.0",  amt: "680.00"  },
		{ desc: "API Integration Setup",    emp: "Mark S.",  date: "2026-05-12", hrs: "5.5",  amt: "467.50"  },
		{ desc: "Bug Fix — Auth Module",    emp: "Jane D.",  date: "2026-05-15", hrs: "2.0",  amt: "170.00"  },
	];
	return (
		<div style={{ fontFamily: fontStack(config.fontFamily), fontSize: 10 }}>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
				<div>
					<div style={{ fontWeight: 700, fontSize: 11, color: "#1c1f36" }}>{orgName}</div>
					<div style={{ fontSize: 8, color: "#8890b0", marginTop: 2 }}>2026-05-23</div>
				</div>
				<div style={{ width: 28, height: 28, borderRadius: "50%", background: "#e8eaf0", display: "flex", alignItems: "center", justifyContent: "center" }}>
					<span style={{ fontSize: 7, color: "#9fa4bc" }}>LOGO</span>
				</div>
			</div>
			<div style={{ height: 1, background: "#d0d4e8", marginBottom: 8 }} />
			{/* Bill To / Invoice Meta */}
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
				<div>
					<div style={{ fontSize: 7, fontWeight: 700, color: "#9fa4bc", marginBottom: 2 }}>BILL TO</div>
					<div style={{ fontWeight: 700, fontSize: 10, color: "#1c1f36" }}>Acme Corporation</div>
					<div style={{ fontSize: 8, color: "#7880a0" }}>billing@acme.com</div>
				</div>
				<div style={{ fontSize: 8, color: "#7880a0" }}>
					<div style={{ fontSize: 7, fontWeight: 700, color: "#9fa4bc", marginBottom: 2 }}>INVOICE</div>
					<div style={{ display: "flex", gap: 8 }}><span style={{ color: "#9fa4bc" }}>Invoice No:</span><span style={{ color: "#1c1f36" }}>TW-ORG-001</span></div>
					<div style={{ display: "flex", gap: 8 }}><span style={{ color: "#9fa4bc" }}>Issue Date:</span><span style={{ color: "#1c1f36" }}>2026-05-23</span></div>
					<div style={{ display: "flex", gap: 8 }}><span style={{ color: "#9fa4bc" }}>Due Date:</span><span style={{ color: "#1c1f36" }}>2026-06-22</span></div>
				</div>
			</div>
			<div style={{ height: 1, background: "#d0d4e8", marginBottom: 6 }} />
			{/* Column headers */}
			<div style={{ display: "grid", gridTemplateColumns: "1fr 60px auto", gap: "0 6px", paddingBottom: 4, borderBottom: `1.5px solid #1c1f36`, marginBottom: 4 }}>
				{["Description", "Assignee", "Amount"].map((h) => (
					<div key={h} style={{ fontSize: 7.5, fontWeight: 700, color: "#1c1f36" }}>{h}</div>
				))}
			</div>
			{rows.map((r, i) => (
				<div key={i}>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 60px auto", gap: "0 6px", padding: "4px 0", alignItems: "baseline" }}>
						<div style={{ fontSize: 8.5, color: "#1c1f36" }}>{r.desc}</div>
						<div style={{ fontSize: 8, color: "#7880a0" }}>{r.emp}</div>
						<div style={{ fontSize: 8.5, color: "#1c1f36", textAlign: "right" }}>{r.amt}</div>
					</div>
					<div style={{ fontSize: 7.5, color: "#9fa4bc", marginBottom: 3 }}>{r.date}</div>
					<div style={{ height: 1, background: "#eaecf5" }} />
				</div>
			))}
			{/* Totals */}
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 8, fontSize: 8.5, color: "#7880a0" }}>
				<span>Subtotal</span><span>1,317.50</span>
			</div>
			{config.showDiscount && <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontSize: 8.5, color: "#7880a0" }}><span>Discount (10%)</span><span>− 131.75</span></div>}
			<div style={{ height: 1, background: "#d0d4e8", margin: "4px 0" }} />
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 16, fontWeight: 700, fontSize: 10, color: p }}>
				<span>Total</span><span>USD 1,185.75</span>
			</div>
			{/* Footer */}
			<div style={{ borderTop: "1px solid #e0e3ef", marginTop: 10, paddingTop: 6, display: "flex", justifyContent: "space-between", fontSize: 7.5, color: "#9fa4bc" }}>
				<div><div style={{ fontWeight: 700, color: "#1c1f36", marginBottom: 2 }}>Payment Terms</div><div>Net 30  ·  Due 2026-06-22</div></div>
				<div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, color: "#1c1f36", marginBottom: 2 }}>Notes</div><div>{config.footerNote || "Thank you for your business."}</div></div>
			</div>
		</div>
	);
}

// ── PDF: Minimal — letter style, dotted leaders ───────────────────────────────
function PdfMinimalPreview({ config, orgName }: { config: InvoiceConfig; orgName: string }) {
	const p = `#${config.primaryColor}`;
	const items = [
		{ title: "Website Redesign Phase 1", meta: "Jane D.  ·  2026-05-10  ·  8.0 hrs", amt: "680.00" },
		{ title: "API Integration Setup",    meta: "Mark S.  ·  2026-05-12  ·  5.5 hrs", amt: "467.50" },
		{ title: "Bug Fix — Auth Module",    meta: "Jane D.  ·  2026-05-15  ·  2.0 hrs", amt: "170.00" },
	];
	return (
		<div style={{ fontFamily: fontStack(config.fontFamily), fontSize: 10 }}>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
				<span style={{ fontWeight: 700, fontSize: 13, color: p }}>{orgName}</span>
				<span style={{ fontSize: 8, color: "#b0b5c8" }}>invoice  #TW-ORG-001</span>
			</div>
			<div style={{ height: 1.5, background: p, marginBottom: 10 }} />
			{[
				["to",     "Acme Corporation"],
				["",       "billing@acme.com"],
				["date",   "2026-05-23"],
				["due",    "2026-06-22"],
				["ref",    "TW-ORG-001"],
				["period", "2026-05-01 — 2026-05-31"],
				["terms",  "Net 30 days"],
			].map(([l, v], i) => (
				<div key={i} style={{ display: "flex", gap: 12, fontSize: 8.5, marginBottom: 3 }}>
					<span style={{ width: 40, color: "#b0b5c8", flexShrink: 0 }}>{l}</span>
					<span style={{ color: "#20223a" }}>{v}</span>
				</div>
			))}
			<div style={{ height: 1, background: "#d5d9ea", margin: "8px 0" }} />
			{items.map((item, i) => (
				<div key={i} style={{ marginBottom: 6 }}>
					<div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
						<span style={{ fontSize: 9, color: "#20223a" }}>{item.title}</span>
						<span style={{ borderBottom: "1px dotted #cdd1e2", flex: 1, margin: "0 5px", height: 0, minWidth: 12 }} />
						<span style={{ fontSize: 9, color: "#20223a", flexShrink: 0 }}>{item.amt}</span>
					</div>
					{config.showHours && <div style={{ fontSize: 7.5, color: "#b0b5c8", marginTop: 2, paddingLeft: 2 }}>{item.meta}</div>}
				</div>
			))}
			<div style={{ height: 1, background: "#d5d9ea", margin: "6px 0" }} />
			<div style={{ display: "flex", justifyContent: "flex-end", gap: 20, fontSize: 8.5, color: "#b0b5c8" }}>
				<span>subtotal</span><span>1,317.50</span>
			</div>
			{config.showDiscount && <div style={{ display: "flex", justifyContent: "flex-end", gap: 20, fontSize: 8.5, color: "#b0b5c8" }}><span>discount  10%</span><span>− 131.75</span></div>}
			<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 3 }}>
				<div style={{ borderTop: `1.5px solid ${p}`, paddingTop: 4, display: "flex", gap: 20, fontWeight: 700, fontSize: 10, color: p }}>
					<span>total  USD</span><span>1,185.75</span>
				</div>
			</div>
			<div style={{ fontSize: 7.5, color: "#c5c9da", marginTop: 12 }}>{config.footerNote || "thank you."}</div>
		</div>
	);
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

function XlsxPreview({ template, config, orgName }: { template: TemplateDefinition; config: InvoiceConfig; orgName: string }) {
	if (template.id === "modern-xlsx") return <XlsxModernPreview config={config} orgName={orgName} />;
	if (template.id === "minimal-xlsx") return <XlsxMinimalPreview config={config} orgName={orgName} />;
	return <XlsxClassicPreview config={config} orgName={orgName} />;
}

function PdfPreview({ template, config, orgName }: { template: TemplateDefinition; config: InvoiceConfig; orgName: string }) {
	if (template.id === "modern-pdf") return <PdfModernPreview config={config} orgName={orgName} />;
	if (template.id === "minimal-pdf") return <PdfMinimalPreview config={config} orgName={orgName} />;
	return <PdfClassicPreview config={config} orgName={orgName} />;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function InvoiceSettingsSection() {
	const queryClient = useQueryClient();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const { data: orgSettings } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});

	const orgName        = (orgSettings as any)?.name ?? "Your Organization";
	const savedTemplate  = (orgSettings as any)?.invoice_template ?? "classic-xlsx";
	const savedConfig    = (orgSettings as any)?.invoice_config as Partial<InvoiceConfig> | null ?? {};
	const logoUrl        = (orgSettings as any)?.logo_url as string | null ?? null;

	const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(null);
	const [config, setConfig] = useState<InvoiceConfig>({ ...DEFAULT_CONFIG, ...savedConfig });
	const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);
	const [logoUploading, setLogoUploading] = useState(false);
	const [logoError, setLogoError] = useState("");

	// Sync config when org settings load
	useEffect(() => {
		if (savedConfig && Object.keys(savedConfig).length > 0) {
			setConfig({ ...DEFAULT_CONFIG, ...savedConfig });
		}
	}, [JSON.stringify(savedConfig)]);

	useEffect(() => { setLogoPreview(logoUrl); }, [logoUrl]);

	const { mutate: saveSettings, isPending: isSaving } = useMutation({
		mutationFn: (data: { invoice_template: string; invoice_config: InvoiceConfig }) =>
			APIService.orgSettings.update(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["org-settings"] });
			setSelectedTemplate(null);
		},
	});

	const handleSave = () => {
		if (!selectedTemplate) return;
		saveSettings({ invoice_template: selectedTemplate.id, invoice_config: config });
	};

	const handleLogoUpload = async (file: File) => {
		setLogoUploading(true);
		setLogoError("");
		try {
			const result = await APIService.orgLogo.upload(file);
			setLogoPreview(result.logo_url);
			queryClient.invalidateQueries({ queryKey: ["org-settings"] });
		} catch (err: any) {
			setLogoError(err?.response?.data?.error ?? "Upload failed.");
		} finally {
			setLogoUploading(false);
		}
	};

	const handleLogoRemove = async () => {
		setLogoUploading(true);
		try {
			await APIService.orgLogo.remove();
			setLogoPreview(null);
			queryClient.invalidateQueries({ queryKey: ["org-settings"] });
		} finally {
			setLogoUploading(false);
		}
	};

	const xlsxTemplates = TEMPLATES.filter((t) => t.format === "xlsx");
	const pdfTemplates  = TEMPLATES.filter((t) => t.format === "pdf");

	// ── Customization panel ───────────────────────────────────────────────────
	if (selectedTemplate) {
		return (
			<div>
				<button
					type="button"
					onClick={() => setSelectedTemplate(null)}
					className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink mb-5 transition-colors"
				>
					<ChevronLeft className="w-4 h-4" />
					Back to templates
				</button>

				<div className="flex items-center gap-3 mb-6">
					<div className={cn(
						"w-8 h-8 rounded-lg flex items-center justify-center",
						selectedTemplate.format === "xlsx" ? "bg-emerald-500/15" : "bg-rose-500/15",
					)}>
						{selectedTemplate.format === "xlsx"
							? <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
							: <FileText className="w-4 h-4 text-rose-500" />
						}
					</div>
					<div>
						<p className="text-sm font-semibold text-ink">{selectedTemplate.name} <span className="text-ink-3 font-normal">({selectedTemplate.format.toUpperCase()})</span></p>
						<p className="text-xs text-ink-3">{selectedTemplate.description}</p>
					</div>
				</div>

				<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
					{/* ── Left: controls ── */}
					<div className="space-y-5">
						{/* Logo (PDF only) */}
						{selectedTemplate.format === "pdf" && (
							<div className="rounded-xl border bg-background p-4 space-y-3">
								<p className="text-xs font-semibold text-ink-2 uppercase tracking-widest">Logo</p>
								<div className="flex items-center gap-3">
									{logoPreview ? (
										<div className="relative w-16 h-10 rounded border bg-accent/40 overflow-hidden flex items-center justify-center">
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img src={logoPreview} alt="logo" className="max-w-full max-h-full object-contain p-1" />
										</div>
									) : (
										<div className="w-16 h-10 rounded border border-dashed border-border flex items-center justify-center text-ink-3">
											<Upload className="w-4 h-4" />
										</div>
									)}
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											isLoading={logoUploading}
											onClick={() => fileInputRef.current?.click()}
										>
											{!logoUploading && <Upload className="w-3 h-3" />}
											{logoPreview ? "Change" : "Upload"}
										</Button>
										{logoPreview && (
											<Button size="sm" variant="ghost" className="text-destructive" onClick={handleLogoRemove} disabled={logoUploading}>
												<X className="w-3.5 h-3.5" />
											</Button>
										)}
									</div>
									<input
										ref={fileInputRef}
										type="file"
										accept="image/png,image/jpeg,image/webp,image/svg+xml"
										className="hidden"
										onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
									/>
								</div>
								{logoError && <p className="text-xs text-destructive">{logoError}</p>}
								<p className="text-xs text-ink-3">PNG, JPEG, WebP, or SVG — max 2 MB. Shown in the PDF header.</p>
							</div>
						)}

						{/* Brand */}
						<div className="rounded-xl border bg-background p-4 space-y-4">
							<p className="text-xs font-semibold text-ink-2 uppercase tracking-widest">Brand</p>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<Label>Primary color</Label>
									<div className="flex items-center gap-2">
										<input
											type="color"
											value={`#${config.primaryColor}`}
											onChange={(e) => setConfig((c) => ({ ...c, primaryColor: e.target.value.replace("#", "") }))}
											className="w-9 h-9 rounded border border-border cursor-pointer bg-transparent p-0.5"
										/>
										<Input
											value={config.primaryColor}
											maxLength={6}
											onChange={(e) => setConfig((c) => ({ ...c, primaryColor: e.target.value.replace("#", "").toUpperCase() }))}
											className="h-9 font-mono uppercase"
											placeholder="1A1A2E"
										/>
									</div>
								</div>
								<div className="space-y-1.5">
									<Label>Accent color</Label>
									<div className="flex items-center gap-2">
										<input
											type="color"
											value={`#${config.accentColor}`}
											onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value.replace("#", "") }))}
											className="w-9 h-9 rounded border border-border cursor-pointer bg-transparent p-0.5"
										/>
										<Input
											value={config.accentColor}
											maxLength={6}
											onChange={(e) => setConfig((c) => ({ ...c, accentColor: e.target.value.replace("#", "").toUpperCase() }))}
											className="h-9 font-mono uppercase"
											placeholder="16213E"
										/>
									</div>
								</div>
							</div>

							<div className="space-y-1.5">
								<Label>Font</Label>
								<div className="flex gap-2">
									{(["helvetica", "times", "courier"] as const).map((f) => (
										<button
											key={f}
											type="button"
											onClick={() => setConfig((c) => ({ ...c, fontFamily: f }))}
											className={cn(
												"px-3 py-1.5 rounded-lg border text-sm transition-colors",
												config.fontFamily === f
													? "border-mint bg-mint/10 text-ink font-medium"
													: "border-border text-ink-3 hover:border-border/80 hover:text-ink",
											)}
											style={{ fontFamily: f === "courier" ? "Courier New" : f === "times" ? "Georgia" : undefined }}
										>
											{f === "helvetica" ? "Sans" : f === "times" ? "Serif" : "Mono"}
										</button>
									))}
								</div>
							</div>
						</div>

						{/* Content */}
						<div className="rounded-xl border bg-background p-4 space-y-4">
							<p className="text-xs font-semibold text-ink-2 uppercase tracking-widest">Content</p>

							<div className="space-y-1.5">
								<Label htmlFor="footer-note">Footer note</Label>
								<Input
									id="footer-note"
									value={config.footerNote}
									onChange={(e) => setConfig((c) => ({ ...c, footerNote: e.target.value }))}
									placeholder="Thank you for your business."
									maxLength={120}
								/>
							</div>

							<div className="space-y-2">
								<Label>Visible columns</Label>
								<div className="flex flex-col gap-2">
									{([
										{ key: "showHours",    label: "Hours" },
										{ key: "showRate",     label: "Rate" },
										{ key: "showDiscount", label: "Discount" },
									] as const).map(({ key, label }) => (
										<label key={key} className="flex items-center gap-2.5 cursor-pointer select-none">
											<button
												type="button"
												role="checkbox"
												aria-checked={config[key]}
												onClick={() => setConfig((c) => ({ ...c, [key]: !c[key] }))}
												className={cn(
													"w-4 h-4 rounded border transition-colors flex items-center justify-center",
													config[key] ? "bg-mint border-mint" : "border-border",
												)}
											>
												{config[key] && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
											</button>
											<span className="text-sm text-ink">{label}</span>
										</label>
									))}
								</div>
							</div>
						</div>

						<div className="flex gap-2">
							<Button onClick={handleSave} isLoading={isSaving} className="flex-1">
								{!isSaving && <Check className="w-4 h-4" />}
								Save as default
							</Button>
							<Button variant="outline" onClick={() => setSelectedTemplate(null)}>
								Cancel
							</Button>
						</div>
					</div>

					{/* ── Right: live preview ── */}
					<div className="rounded-xl border bg-background overflow-hidden">
						<div className="px-4 py-3 border-b flex items-center gap-2 bg-accent/30">
							<Eye className="w-3.5 h-3.5 text-ink-3" />
							<span className="text-xs font-medium text-ink-2">Live Preview</span>
							<span className="ml-auto text-[10px] text-ink-3">Sample data</span>
						</div>
						<div className="p-5 overflow-auto max-h-[600px]">
							{selectedTemplate.format === "xlsx"
								? <XlsxPreview template={selectedTemplate} config={config} orgName={orgName} />
								: <PdfPreview  template={selectedTemplate} config={config} orgName={orgName} />
							}
						</div>
					</div>
				</div>
			</div>
		);
	}

	// ── Template grid ─────────────────────────────────────────────────────────
	return (
		<div className="space-y-6">
			<div>
				<p className="text-sm font-semibold text-ink">Invoice Templates</p>
				<p className="text-xs text-ink-3 mt-0.5">
					Choose a default template for invoice exports. Customize colors, font, and content for each.
				</p>
			</div>

			{/* Active template badge */}
			{savedTemplate && (
				<div className="flex items-center gap-2 text-xs text-ink-3 bg-accent/40 rounded-lg px-3 py-2">
					<Check className="w-3.5 h-3.5 text-mint" />
					Active: <span className="font-medium text-ink">
						{TEMPLATES.find((t) => t.id === savedTemplate)?.name ?? savedTemplate}
						{" "}({savedTemplate.includes("pdf") ? "PDF" : "XLSX"})
					</span>
				</div>
			)}

			{/* XLSX */}
			<div>
				<div className="flex items-center gap-2 mb-3">
					<FileSpreadsheet className="w-4 h-4 text-emerald-600" />
					<p className="text-xs font-semibold text-ink-2 uppercase tracking-widest">Excel / XLSX</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					{xlsxTemplates.map((t) => (
						<TemplateCard
							key={t.id}
							template={t}
							isActive={savedTemplate === t.id}
							onSelect={() => setSelectedTemplate(t)}
						/>
					))}
				</div>
			</div>

			{/* PDF */}
			<div>
				<div className="flex items-center gap-2 mb-3">
					<FileText className="w-4 h-4 text-rose-500" />
					<p className="text-xs font-semibold text-ink-2 uppercase tracking-widest">PDF</p>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
					{pdfTemplates.map((t) => (
						<TemplateCard
							key={t.id}
							template={t}
							isActive={savedTemplate === t.id}
							onSelect={() => setSelectedTemplate(t)}
						/>
					))}
				</div>
			</div>
		</div>
	);
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
	template,
	isActive,
	onSelect,
}: {
	template: TemplateDefinition;
	isActive: boolean;
	onSelect: () => void;
}) {
	const isXlsx = template.format === "xlsx";

	return (
		<button
			type="button"
			onClick={onSelect}
			className={cn(
				"relative w-full rounded-xl border bg-background p-4 text-left transition-all hover:border-mint/60 hover:shadow-sm group",
				isActive && "border-mint ring-1 ring-mint/30",
			)}
		>
			{isActive && (
				<span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-mint flex items-center justify-center">
					<Check className="w-3 h-3 text-white" strokeWidth={3} />
				</span>
			)}

			<div className={cn(
				"w-9 h-9 rounded-lg flex items-center justify-center mb-3",
				isXlsx ? "bg-emerald-500/10" : "bg-rose-500/10",
			)}>
				{isXlsx
					? <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-600" />
					: <FileText className="w-4.5 h-4.5 text-rose-500" />
				}
			</div>

			<p className="text-sm font-semibold text-ink">{template.name}</p>
			<p className="text-xs text-ink-3 mt-0.5 leading-relaxed">{template.description}</p>

			<div className="mt-3 flex items-center gap-1.5 text-xs text-mint font-medium opacity-0 group-hover:opacity-100 transition-opacity">
				<Eye className="w-3 h-3" />
				Customize &amp; preview
			</div>
		</button>
	);
}
