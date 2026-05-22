"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils/cn";
import { Download, Loader2, FileText, BarChart2, X } from "lucide-react";

interface Props {
	orgName: string;
	orgSlug: string;
	orgLogoUrl?: string;
}

interface LineItem {
	ticket_id: string;
	billable_hours: number;
	rate: number;
	subtotal: number;
	discount_percent: number;
	discount_amount: number;
	net_total: number;
	currency: string;
}

interface Summary {
	client_name: string;
	client_email: string | null;
	client_deactivated: boolean;
	currency: string;
	ticket_count: number;
	total_billable_hours: number;
	total_billed: number;
	total_discount: number;
	net_payable: number;
}

interface PreviewData {
	type: string;
	date_from: string;
	date_to: string;
	line_items: LineItem[];
	summary: Summary[];
}

interface SessionInvoice {
	id: string;
	type: "client" | "tally";
	clientId: string;
	clientName: string;
	dateFrom: string;
	dateTo: string;
	data: PreviewData;
}

const inputCls = "h-9 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint";

export function InvoiceSection({ orgName, orgLogoUrl }: Props) {
	const [invoiceType, setInvoiceType] = useState<"client" | "tally">("client");
	const [clientId, setClientId]       = useState("");
	const [dateFrom, setDateFrom]       = useState("");
	const [dateTo, setDateTo]           = useState("");
	const [sessions, setSessions]       = useState<SessionInvoice[]>(() => {
		try {
			const stored = localStorage.getItem("tw_invoice_sessions");
			return stored ? JSON.parse(stored) : [];
		} catch { return []; }
	});
	const [exportingId, setExportingId] = useState<string | null>(null);
	const [exportErrors, setExportErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		try { localStorage.setItem("tw_invoice_sessions", JSON.stringify(sessions)); } catch {}
	}, [sessions]);

	const tzOffset = new Date().getTimezoneOffset();

	const { data: clientsData } = useQuery({
		queryKey: ["clients"],
		queryFn: () => APIService.clients.list(),
		staleTime: 60_000,
	});
	const clients: any[] = (clientsData as any)?.data ?? [];

	const { mutateAsync: fetchPreview, isPending: isGenerating } = useMutation({
		mutationFn: () =>
			APIService.invoice.preview({
				type: invoiceType,
				client_id: invoiceType === "client" ? clientId : undefined,
				date_from: dateFrom,
				date_to: dateTo,
				tz_offset: tzOffset,
			}),
		onSuccess: (data: any) => {
			const client = clients.find((c: any) => c.id === clientId);
			const invoice: SessionInvoice = {
				id: `${Date.now()}`,
				type: invoiceType,
				clientId,
				clientName: invoiceType === "tally" ? "All Clients" : (client?.name ?? "Unknown"),
				dateFrom,
				dateTo,
				data,
			};
			setSessions((prev) => [invoice, ...prev]);
		},
	});

	const handleExport = async (invoice: SessionInvoice) => {
		setExportingId(invoice.id);
		setExportErrors((prev) => ({ ...prev, [invoice.id]: "" }));
		try {
			const response = await APIService.invoice.export({
				type: invoice.type,
				client_id: invoice.type === "client" ? invoice.clientId : undefined,
				date_from: invoice.dateFrom,
				date_to: invoice.dateTo,
				tz_offset: tzOffset,
				org_name: orgName,
				org_logo: orgLogoUrl,
			});
			const blob = response.data as Blob;
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			const disposition = response.headers?.["content-disposition"] ?? "";
			const match = disposition.match(/filename="([^"]+)"/);
			a.href = url;
			a.download = match?.[1] ?? "invoice.xlsx";
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err: any) {
			setExportErrors((prev) => ({ ...prev, [invoice.id]: err?.response?.data?.error ?? "Export failed." }));
		} finally {
			setExportingId(null);
		}
	};

	const canGenerate = dateFrom && dateTo && (invoiceType === "tally" || clientId);

	const handleTypeChange = (type: "client" | "tally") => {
		setInvoiceType(type);
		if (type === "tally") setClientId("");
	};

	return (
		<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

			{/* ── LEFT: Configuration ── */}
			<div className="rounded-xl border bg-background p-5 space-y-5">
				<div>
					<p className="text-sm font-semibold text-ink">Invoice Configuration</p>
					<p className="text-xs text-ink-3 mt-0.5">Set your filters and generate an invoice.</p>
				</div>

				{/* Segmented toggle */}
				<div className="flex rounded-lg border border-border overflow-hidden text-sm">
					<button
						type="button"
						onClick={() => handleTypeChange("client")}
						className={cn(
							"flex-1 flex items-center justify-center gap-2 py-2 px-3 transition-colors",
							invoiceType === "client"
								? "bg-mint text-white font-medium"
								: "bg-background text-ink-3 hover:text-ink hover:bg-accent/50",
						)}
					>
						<FileText className="w-3.5 h-3.5" />
						Single Client
					</button>
					<button
						type="button"
						onClick={() => handleTypeChange("tally")}
						className={cn(
							"flex-1 flex items-center justify-center gap-2 py-2 px-3 border-l border-border transition-colors",
							invoiceType === "tally"
								? "bg-mint text-white font-medium"
								: "bg-background text-ink-3 hover:text-ink hover:bg-accent/50",
						)}
					>
						<BarChart2 className="w-3.5 h-3.5" />
						Full Tally
					</button>
				</div>

				{invoiceType === "client" && (
					<div className="space-y-1.5">
						<Label>Client</Label>
						<Combobox
							options={clients.map((c: any) => ({
								value: c.id,
								label: c.deleted_at ? `${c.name} [Deactivated]` : c.name,
							}))}
							value={clientId}
							onChange={setClientId}
							placeholder="Select a client…"
							searchPlaceholder="Search clients…"
							emptyText="No clients found."
						/>
					</div>
				)}

				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label htmlFor="inv-from">From</Label>
						<input
							id="inv-from"
							type="date"
							value={dateFrom}
							onChange={(e) => setDateFrom(e.target.value)}
							className={inputCls}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="inv-to">To</Label>
						<input
							id="inv-to"
							type="date"
							value={dateTo}
							onChange={(e) => setDateTo(e.target.value)}
							className={inputCls}
						/>
					</div>
				</div>

				<Button
					className="w-full"
					disabled={!canGenerate || isGenerating}
					isLoading={isGenerating}
					onClick={() => fetchPreview()}
				>
					Generate Invoice
				</Button>

				{invoiceType === "tally" && (
					<p className="text-xs text-ink-3 leading-relaxed">
						Exports all clients&apos; completed tickets for the period into a two-sheet workbook — line items and a summary.
					</p>
				)}
			</div>

			{/* ── RIGHT: Session invoices ── */}
			<div className="rounded-xl border bg-background min-h-[320px] flex flex-col">
				<div className="px-5 py-4 border-b">
					<p className="text-sm font-semibold text-ink">Generated This Session</p>
					<p className="text-xs text-ink-3 mt-0.5">Saved locally in your browser. Export to keep a permanent copy.</p>
				</div>

				{sessions.length === 0 ? (
					<div className="flex-1 flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
						<div className="w-10 h-10 rounded-full bg-accent/60 flex items-center justify-center">
							<FileText className="w-5 h-5 text-ink-3" />
						</div>
						<p className="text-sm font-medium text-ink-2">No invoices yet</p>
						<p className="text-xs text-ink-3">
							Configure and click Generate Invoice to get started.
						</p>
					</div>
				) : (
					<ul className="divide-y overflow-y-auto">
						{sessions.map((inv) => {
							const totalNet      = inv.data.summary.reduce((s, i) => s + i.net_payable, 0);
							const totalHours    = inv.data.summary.reduce((s, i) => s + i.total_billable_hours, 0);
							const currency      = inv.data.line_items[0]?.currency ?? inv.data.summary[0]?.currency ?? "USD";
							const ticketCount   = inv.data.line_items.length;
							const isExporting   = exportingId === inv.id;

							return (
								<li key={inv.id} className="px-5 py-4 flex items-start gap-4">
									<div className="mt-0.5 w-8 h-8 rounded-lg bg-accent/60 flex items-center justify-center shrink-0">
										{inv.type === "tally"
											? <BarChart2 className="w-4 h-4 text-ink-3" />
											: <FileText className="w-4 h-4 text-ink-3" />
										}
									</div>

									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-ink truncate">{inv.clientName}</p>
										<p className="text-xs text-ink-3 mt-0.5">{inv.dateFrom} — {inv.dateTo}</p>
										<div className="flex items-center gap-3 mt-1.5 text-xs text-ink-3">
											<span>{ticketCount} ticket{ticketCount !== 1 ? "s" : ""}</span>
											<span>·</span>
											<span>{totalHours.toFixed(1)} hrs</span>
											<span>·</span>
											<span className="font-medium text-ink">{currency} {totalNet.toFixed(2)}</span>
										</div>
										{exportErrors[inv.id] && (
											<p className="text-xs text-destructive mt-1">{exportErrors[inv.id]}</p>
										)}
									</div>

									<div className="flex items-center gap-1 shrink-0">
										<Button
											size="sm"
											variant="outline"
											disabled={isExporting}
											isLoading={isExporting}
											onClick={() => handleExport(inv)}
										>
											{!isExporting && <Download className="w-3.5 h-3.5" />}
											Export
										</Button>
										<Button
											size="icon-sm"
											variant="ghost"
											className="text-ink-3 hover:text-destructive"
											onClick={() => setSessions((prev) => prev.filter((s) => s.id !== inv.id))}
										>
											<X className="w-3.5 h-3.5" />
										</Button>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>
		</div>
	);
}
