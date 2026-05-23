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

// ── Template preview (HTML mockup) ────────────────────────────────────────────

function XlsxPreview({ template, config, orgName }: { template: TemplateDefinition; config: InvoiceConfig; orgName: string }) {
	const primary = `#${config.primaryColor}`;
	const subrow  = template.id === "modern-xlsx" ? "#f5f7ff" : template.id === "minimal-xlsx" ? "#fafbfe" : "#f0f4ff";
	const isMinimal = template.id === "minimal-xlsx";
	const isModern  = template.id === "modern-xlsx";

	const sampleRows = [
		{ ref: "A1B2C3", desc: "Website Redesign Phase 1", by: "Jane D.", date: "2026-05-10", hrs: "8.00", rate: "85.00", amt: "680.00" },
		{ ref: "D4E5F6", desc: "API Integration Setup",    by: "Mark S.", date: "2026-05-12", hrs: "5.50", rate: "85.00", amt: "467.50" },
		{ ref: "G7H8I9", desc: "Bug Fix — Auth Module",    by: "Jane D.", date: "2026-05-15", hrs: "2.00", rate: "85.00", amt: "170.00" },
	];

	const thStyle: React.CSSProperties = isMinimal
		? { color: "#cbd5e1", fontSize: 9, fontWeight: 700, textTransform: "uppercase", borderBottom: `2px solid ${primary}`, padding: "6px 4px" }
		: isModern
			? { color: primary, fontSize: 10, fontWeight: 700, background: "#f1f5f9", padding: "6px 6px", border: "1px solid #e2e8f0" }
			: { color: "#fff", fontSize: 10, fontWeight: 700, background: primary, padding: "6px 6px", border: "1px solid #d0d7e8" };

	return (
		<div style={{ fontFamily: config.fontFamily === "courier" ? "Courier New" : config.fontFamily === "times" ? "Georgia" : "Inter, sans-serif", fontSize: 11, color: "#334155" }}>
			{/* Header */}
			{isModern ? (
				<div style={{ background: primary, color: "#fff", padding: "10px 14px", borderRadius: 4, marginBottom: 10 }}>
					<div style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{orgName.toUpperCase()}</div>
					<div style={{ fontSize: 9, color: "#ccd6f6", marginTop: 2 }}>INVOICE  #TW-ORG-20260523-001</div>
				</div>
			) : isMinimal ? (
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
					<span style={{ fontWeight: 700, fontSize: 15, color: primary }}>{orgName}</span>
					<span style={{ fontSize: 9, color: "#94a3b8" }}>Invoice · #TW-ORG-20260523-001</span>
				</div>
			) : (
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
					<span style={{ fontWeight: 700, fontSize: 14, color: primary }}>{orgName}</span>
					<span style={{ fontWeight: 700, fontSize: 16, color: primary }}>INVOICE</span>
				</div>
			)}

			{/* Bill to */}
			{!isModern && (
				<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
					<div>
						<div style={{ fontSize: 8, color: "#999", marginBottom: 2 }}>BILL TO</div>
						<div style={{ fontWeight: 600, fontSize: 11, color: primary }}>Acme Corporation</div>
						<div style={{ fontSize: 9, color: "#94a3b8" }}>billing@acme.com</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: 9, color: "#94a3b8" }}>#TW-ORG-20260523-001</div>
						<div style={{ fontSize: 9, color: "#94a3b8" }}>2026-05-01 → 2026-05-31</div>
						<div style={{ fontSize: 9, color: "#94a3b8" }}>Issued: 2026-05-23</div>
					</div>
				</div>
			)}

			{isModern && (
				<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
					<div>
						<div style={{ fontSize: 7, color: "#cbd5e1", marginBottom: 3 }}>CLIENT</div>
						<div style={{ fontWeight: 600, fontSize: 11, color: primary }}>Acme Corporation</div>
						<div style={{ fontSize: 9, color: "#94a3b8" }}>billing@acme.com</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: 7, color: "#cbd5e1", marginBottom: 3 }}>PERIOD</div>
						<div style={{ fontSize: 9, color: "#64748b" }}>2026-05-01 — 2026-05-31</div>
						<div style={{ fontSize: 9, color: "#94a3b8" }}>Issued: 2026-05-23  ·  Due: 2026-06-22</div>
					</div>
				</div>
			)}

			{/* Table */}
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
				<thead>
					<tr>
						<th style={{ ...thStyle, textAlign: "left" }}>Ref</th>
						<th style={{ ...thStyle, textAlign: "left" }}>Description</th>
						<th style={{ ...thStyle, textAlign: "left" }}>By</th>
						<th style={{ ...thStyle, textAlign: "left" }}>Date</th>
						{config.showHours && <th style={{ ...thStyle, textAlign: "right" }}>Hrs</th>}
						{config.showRate  && <th style={{ ...thStyle, textAlign: "right" }}>Rate</th>}
						<th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
					</tr>
				</thead>
				<tbody>
					{sampleRows.map((row, idx) => {
						const rowBg = isMinimal ? "#fff" : idx % 2 === 1 ? subrow : "#fff";
						const cellStyle: React.CSSProperties = {
							padding: "5px 4px",
							background: rowBg,
							borderBottom: isMinimal ? "1px solid #e2e8f0" : "1px solid #d0d7e8",
						};
						return (
							<tr key={row.ref}>
								<td style={{ ...cellStyle, fontFamily: "Courier New", fontSize: 9, color: "#94a3b8" }}>{row.ref}</td>
								<td style={cellStyle}>{row.desc}</td>
								<td style={cellStyle}>{row.by}</td>
								<td style={cellStyle}>{row.date}</td>
								{config.showHours && <td style={{ ...cellStyle, textAlign: "right" }}>{row.hrs}</td>}
								{config.showRate  && <td style={{ ...cellStyle, textAlign: "right" }}>{row.rate}</td>}
								<td style={{ ...cellStyle, textAlign: "right" }}>{row.amt}</td>
							</tr>
						);
					})}
				</tbody>
			</table>

			{/* Totals */}
			<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, gap: 24 }}>
				<div style={{ textAlign: "right", fontSize: 9, color: "#94a3b8" }}>
					<div>Subtotal</div>
					{config.showDiscount && <div>Discount (10%)</div>}
				</div>
				<div style={{ textAlign: "right", fontSize: 9, color: "#475569" }}>
					<div>USD 1,317.50</div>
					{config.showDiscount && <div>-USD 131.75</div>}
				</div>
			</div>
			<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
				<div style={{ background: "#eaf4ea", borderRadius: 3, padding: "4px 10px", textAlign: "right" }}>
					<span style={{ fontSize: 10, fontWeight: 700, color: primary }}>Total  USD 1,185.75</span>
				</div>
			</div>

			{/* Footer note */}
			<div style={{ textAlign: "center", fontSize: 8, color: "#cbd5e1", marginTop: 10, fontStyle: "italic" }}>
				{config.footerNote || "Thank you for your business."}
			</div>
		</div>
	);
}

function PdfPreview({ template, config, orgName }: { template: TemplateDefinition; config: InvoiceConfig; orgName: string }) {
	const primary = `#${config.primaryColor}`;
	const isModern  = template.id === "modern-pdf";
	const isMinimal = template.id === "minimal-pdf";

	const sampleRows = [
		{ ref: "A1B2C3", desc: "Website Redesign", by: "Jane D.", date: "2026-05-10", hrs: "8.00", amt: "680.00" },
		{ ref: "D4E5F6", desc: "API Integration",  by: "Mark S.", date: "2026-05-12", hrs: "5.50", amt: "467.50" },
	];

	return (
		<div style={{ fontFamily: config.fontFamily === "courier" ? "Courier New" : config.fontFamily === "times" ? "Georgia" : "Inter, sans-serif", fontSize: 11, color: "#334155" }}>
			{/* Header */}
			{isModern ? (
				<div style={{ background: primary, color: "#fff", padding: "10px 14px", borderRadius: 4, marginBottom: 10 }}>
					<div style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>{orgName.toUpperCase()}</div>
					<div style={{ fontSize: 9, color: "#ccd6f6", marginTop: 1 }}>Invoice  #TW-ORG-20260523-001</div>
					<div style={{ fontSize: 9, color: "#ccd6f6", marginTop: 1 }}>Issued: 2026-05-23  ·  Due: 2026-06-22</div>
				</div>
			) : isMinimal ? (
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid #e2e8f0", paddingBottom: 8, marginBottom: 12 }}>
					<span style={{ fontWeight: 700, fontSize: 13, color: primary }}>{orgName}</span>
					<span style={{ fontSize: 8, color: "#94a3b8" }}>Invoice · #TW-ORG-20260523-001</span>
				</div>
			) : (
				<div style={{ background: primary, color: "#fff", padding: "10px 14px", borderRadius: 4, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
					<div>
						<div style={{ fontWeight: 700, fontSize: 14 }}>{orgName}</div>
						<div style={{ fontSize: 9, color: "#ccd6f6", marginTop: 1 }}>INVOICE</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: 9, color: "#ccd6f6" }}>#TW-ORG-20260523-001</div>
						<div style={{ fontSize: 9, color: "#ccd6f6" }}>Issued: 2026-05-23</div>
					</div>
				</div>
			)}

			{/* Info block */}
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
				<div>
					{!isMinimal && <div style={{ fontSize: 7, color: "#94a3b8", marginBottom: 2 }}>BILL TO</div>}
					<div style={{ fontWeight: 600, fontSize: 11, color: primary }}>Acme Corporation</div>
					<div style={{ fontSize: 9, color: "#94a3b8" }}>billing@acme.com</div>
				</div>
				<div style={{ textAlign: "right", fontSize: 9, color: "#64748b" }}>
					<div>2026-05-01 — 2026-05-31</div>
					<div style={{ color: "#94a3b8" }}>Net 30 days</div>
				</div>
			</div>

			{/* Table */}
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9.5 }}>
				<thead>
					<tr style={{
						background: isMinimal ? "transparent" : isModern ? "#f1f5f9" : primary,
						color: isMinimal ? "#cbd5e1" : isModern ? primary : "#fff",
						borderBottom: isMinimal ? `2px solid ${primary}` : undefined,
					}}>
						<th style={{ padding: "5px 4px", textAlign: "left", fontWeight: isMinimal ? 700 : 600, fontSize: 8, textTransform: "uppercase" }}>Ref</th>
						<th style={{ padding: "5px 4px", textAlign: "left", fontWeight: isMinimal ? 700 : 600, fontSize: 8, textTransform: "uppercase" }}>Description</th>
						<th style={{ padding: "5px 4px", textAlign: "left", fontWeight: isMinimal ? 700 : 600, fontSize: 8, textTransform: "uppercase" }}>By</th>
						<th style={{ padding: "5px 4px", textAlign: "center", fontWeight: isMinimal ? 700 : 600, fontSize: 8, textTransform: "uppercase" }}>Date</th>
						{config.showHours && <th style={{ padding: "5px 4px", textAlign: "right", fontWeight: isMinimal ? 700 : 600, fontSize: 8, textTransform: "uppercase" }}>Hrs</th>}
						<th style={{ padding: "5px 4px", textAlign: "right", fontWeight: isMinimal ? 700 : 600, fontSize: 8, textTransform: "uppercase" }}>Amount</th>
					</tr>
				</thead>
				<tbody>
					{sampleRows.map((row, idx) => (
						<tr key={row.ref} style={{ background: idx % 2 === 1 ? "#f8faff" : "#fff" }}>
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e8edf5", fontFamily: "Courier New", fontSize: 8, color: "#94a3b8" }}>{row.ref}</td>
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e8edf5" }}>{row.desc}</td>
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e8edf5" }}>{row.by}</td>
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e8edf5", textAlign: "center" }}>{row.date}</td>
							{config.showHours && <td style={{ padding: "4px 4px", borderBottom: "1px solid #e8edf5", textAlign: "right" }}>{row.hrs}</td>}
							<td style={{ padding: "4px 4px", borderBottom: "1px solid #e8edf5", textAlign: "right" }}>{row.amt}</td>
						</tr>
					))}
				</tbody>
			</table>

			{/* Totals */}
			<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
				<div style={{ borderLeft: isMinimal ? `2px solid ${primary}` : undefined, paddingLeft: isMinimal ? 8 : 0 }}>
					<div style={{ display: "flex", gap: 20, fontSize: 9, color: "#94a3b8", marginBottom: 2 }}>
						<span>Subtotal</span><span>USD 1,147.50</span>
					</div>
					<div style={{ display: "flex", gap: 20, fontSize: 10, fontWeight: 700, color: primary }}>
						<span>Total Due</span><span>USD 1,147.50</span>
					</div>
				</div>
			</div>

			<div style={{ textAlign: "center", fontSize: 8, color: "#cbd5e1", marginTop: 10, fontStyle: "italic" }}>
				{config.footerNote || "Thank you for your business."}
			</div>
		</div>
	);
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
