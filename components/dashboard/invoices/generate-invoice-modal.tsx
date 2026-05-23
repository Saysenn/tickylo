"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, FileText, SwitchCamera } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { TEMPLATES } from "@/lib/invoice-templates";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

interface Props {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	orgName: string;
	orgLogoUrl?: string | null;
}

export function GenerateInvoiceModal({ open, onOpenChange, orgName, orgLogoUrl }: Props) {
	const queryClient = useQueryClient();

	const [invoiceType,       setInvoiceType]       = useState<"client" | "tally">("client");
	const [clientId,          setClientId]           = useState("");
	const [dateFrom,          setDateFrom]           = useState("");
	const [dateTo,            setDateTo]             = useState("");
	const [activeTemplateId,  setActiveTemplateId]   = useState<string | null>(null);
	const [showTemplatePicker, setShowTemplatePicker] = useState(false);
	const [isGenerating,      setIsGenerating]       = useState(false);
	const [error,             setError]              = useState("");

	const { data: orgSettings } = useQuery({
		queryKey: ["org-settings"],
		queryFn:  () => APIService.orgSettings.get(),
		staleTime: 300_000,
		enabled:  open,
	});

	const { data: clientsData } = useQuery({
		queryKey: ["clients"],
		queryFn:  () => APIService.clients.list(),
		staleTime: 60_000,
		enabled:  open,
	});

	const resolvedTemplateId = activeTemplateId ?? (orgSettings as any)?.invoice_template ?? "classic-xlsx";
	const activeTemplate     = TEMPLATES.find((t) => t.id === resolvedTemplateId) ?? TEMPLATES[0];
	const clients: any[]     = (clientsData as any)?.data ?? [];
	const activeClients      = clients.filter((c: any) => !c.deleted_at);

	const canGenerate = dateFrom && dateTo && (invoiceType === "tally" || clientId);

	async function handleGenerate() {
		if (!canGenerate) return;
		setIsGenerating(true);
		setError("");
		try {
			const tzOffset = new Date().getTimezoneOffset();
			const res = await APIService.invoice.export({
				type:        invoiceType === "client" ? "client" : "tally",
				client_id:   invoiceType === "client" ? clientId : undefined,
				date_from:   dateFrom,
				date_to:     dateTo,
				tz_offset:   tzOffset,
				org_name:    orgName,
				template_id: resolvedTemplateId,
			});

			const ext  = activeTemplate.format === "pdf" ? "pdf" : "xlsx";
			const mime = activeTemplate.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			const blob = new Blob([res.data], { type: mime });
			const url  = URL.createObjectURL(blob);
			const a    = document.createElement("a");
			a.href     = url;
			a.download = `invoice-${dateFrom}-${dateTo}.${ext}`;
			a.click();
			URL.revokeObjectURL(url);

			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			onOpenChange(false);
		} catch {
			setError("Failed to generate invoice. Please try again.");
		} finally {
			setIsGenerating(false);
		}
	}

	if (showTemplatePicker) {
		return (
			<DialogRoot open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-lg p-0">
					<div className="sticky top-0 bg-background/95 backdrop-blur border-b px-6 py-4">
						<DialogHeader>
							<DialogTitle className="text-base font-semibold">Choose Template</DialogTitle>
							<DialogDescription className="sr-only">Select an invoice template</DialogDescription>
						</DialogHeader>
					</div>
					<div className="px-6 py-5 space-y-3">
						{TEMPLATES.map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => { setActiveTemplateId(t.id); setShowTemplatePicker(false); }}
								className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left hover:border-mint/60 transition-colors"
							>
								<div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.format === "xlsx" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
									{t.format === "xlsx"
										? <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
										: <FileText className="w-4 h-4 text-rose-500" />
									}
								</div>
								<div>
									<p className="text-sm font-medium text-ink">{t.name} <span className="text-ink-3 font-normal">({t.format.toUpperCase()})</span></p>
									<p className="text-xs text-ink-3">{t.description}</p>
								</div>
								{t.id === resolvedTemplateId && <div className="ml-auto w-2 h-2 rounded-full bg-mint shrink-0" />}
							</button>
						))}
					</div>
					<div className="px-6 pb-5">
						<Button variant="outline" className="w-full" onClick={() => setShowTemplatePicker(false)}>Back</Button>
					</div>
				</DialogContent>
			</DialogRoot>
		);
	}

	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md p-0">
				<div className="sticky top-0 bg-background/95 backdrop-blur border-b px-6 py-4">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">Generate Invoice</DialogTitle>
						<DialogDescription className="text-sm text-ink-3">Select an employee, date range, and format.</DialogDescription>
					</DialogHeader>
				</div>

				<div className="px-6 py-5 space-y-5">
					{/* Type toggle */}
					<div className="grid grid-cols-2 rounded-xl border p-1 gap-1">
						{(["client", "tally"] as const).map((t) => (
							<button
								key={t}
								type="button"
								onClick={() => { setInvoiceType(t); if (t === "tally") setClientId(""); }}
								className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${invoiceType === t ? "bg-mint text-white" : "text-ink-3 hover:text-ink"}`}
							>
								{t === "client" ? <FileText className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
								{t === "client" ? "Single Client" : "Full Tally"}
							</button>
						))}
					</div>

					{/* Client picker */}
					{invoiceType === "client" && (
						<div className="space-y-1.5">
							<Label>Client</Label>
							<Combobox
								options={activeClients.map((c: any) => ({ value: c.id, label: c.name }))}
								value={clientId}
								onChange={setClientId}
								placeholder="Select a client…"
								searchPlaceholder="Search clients…"
								emptyText="No clients found."
							/>
						</div>
					)}

					{/* Date range */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="inv-from">From</Label>
							<input
								id="inv-from"
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="inv-to">To</Label>
							<input
								id="inv-to"
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
							/>
						</div>
					</div>

					{/* Template row */}
					<div className="flex items-center gap-3 rounded-xl border px-4 py-3">
						<div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${activeTemplate.format === "xlsx" ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
							{activeTemplate.format === "xlsx"
								? <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
								: <FileText className="w-4 h-4 text-rose-500" />
							}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-ink truncate">
								{activeTemplate.name} <span className="text-ink-3 font-normal">({activeTemplate.format.toUpperCase()})</span>
							</p>
							<p className="text-xs text-ink-3">Template for export</p>
						</div>
						<Button size="sm" variant="ghost" className="text-mint text-xs shrink-0 gap-1" onClick={() => setShowTemplatePicker(true)}>
							<SwitchCamera className="w-3.5 h-3.5" />
							Change
						</Button>
					</div>

					{error && <p className="text-xs text-destructive">{error}</p>}
				</div>

				<div className="px-6 pb-6 flex gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
					<Button
						onClick={handleGenerate}
						isLoading={isGenerating}
						disabled={!canGenerate}
						className="flex-1"
					>
						Generate Invoice
					</Button>
				</div>
			</DialogContent>
		</DialogRoot>
	);
}
