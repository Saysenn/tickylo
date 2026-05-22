"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { FileText, BarChart2, Download, Loader2, Building2, Calendar } from "lucide-react";
import { formatDate } from "@/lib/utils/format";

interface Props {
	orgName: string;
	orgSlug: string;
	orgLogoUrl?: string;
}

interface LineItem {
	ticket_id: string;
	ticket_number: string;
	title: string;
	employee_name: string;
	completed_at: string | null;
	billable_hours: number;
	rate: number;
	subtotal: number;
	discount_percent: number;
	discount_amount: number;
	net_total: number;
	currency: string;
	client_name: string;
	client_email: string | null;
	client_deactivated: boolean;
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

export function InvoiceSection({ orgName, orgLogoUrl }: Props) {
	const [invoiceType, setInvoiceType] = useState<"client" | "tally">("client");
	const [clientId, setClientId] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [previewData, setPreviewData] = useState<PreviewData | null>(null);
	const [isExporting, setIsExporting] = useState(false);
	const [exportError, setExportError] = useState("");

	const tzOffset = new Date().getTimezoneOffset();

	const { data: clientsData } = useQuery({
		queryKey: ["clients"],
		queryFn: () => APIService.clients.list(),
		staleTime: 60_000,
	});
	const clients: any[] = (clientsData as any)?.data ?? [];

	const { mutateAsync: fetchPreview, isPending: isPreviewing } = useMutation({
		mutationFn: () =>
			APIService.invoice.preview({
				type: invoiceType,
				client_id: invoiceType === "client" ? clientId : undefined,
				date_from: dateFrom,
				date_to: dateTo,
				tz_offset: tzOffset,
			}),
		onSuccess: (data: any) => setPreviewData(data),
	});

	const handleExport = async () => {
		setExportError("");
		setIsExporting(true);
		try {
			const response = await APIService.invoice.export({
				type: invoiceType,
				client_id: invoiceType === "client" ? clientId : undefined,
				date_from: dateFrom,
				date_to: dateTo,
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
			setExportError(err?.response?.data?.error ?? "Export failed. Please try again.");
		} finally {
			setIsExporting(false);
		}
	};

	const canPreview = dateFrom && dateTo && (invoiceType === "tally" || clientId);
	const canExport = canPreview;

	// Summary calculations from preview
	const totalBillable = previewData?.line_items.reduce((s, i) => s + i.billable_hours, 0) ?? 0;
	const totalSubtotal = previewData?.summary.reduce((s, i) => s + i.total_billed, 0) ?? 0;
	const totalDiscount = previewData?.summary.reduce((s, i) => s + i.total_discount, 0) ?? 0;
	const totalNet = previewData?.summary.reduce((s, i) => s + i.net_payable, 0) ?? 0;
	const primaryCurrency = previewData?.line_items[0]?.currency ?? "USD";

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-lg font-semibold text-ink">Invoice Export</h2>
				<p className="text-ink-3 text-sm mt-0.5">Generate client invoices or full billing tallies for any date range.</p>
			</div>

			{/* Type selector cards */}
			<div className="grid grid-cols-2 gap-4 max-w-lg">
				<button
					type="button"
					onClick={() => { setInvoiceType("client"); setPreviewData(null); }}
					className={cn(
						"flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
						invoiceType === "client"
							? "border-mint bg-mint/8 text-ink"
							: "border-border bg-background text-ink-3 hover:border-mint/40 hover:text-ink-2",
					)}
				>
					<FileText className={cn("w-5 h-5 shrink-0", invoiceType === "client" ? "text-mint" : "text-ink-3")} />
					<div>
						<p className="text-sm font-medium">Client Invoice</p>
						<p className="text-xs text-ink-3">Single client, detailed</p>
					</div>
					{invoiceType === "client" && (
						<span className="ml-auto w-2 h-2 rounded-full bg-mint shrink-0" />
					)}
				</button>

				<button
					type="button"
					onClick={() => { setInvoiceType("tally"); setPreviewData(null); setClientId(""); }}
					className={cn(
						"flex items-center gap-3 p-4 rounded-xl border text-left transition-all",
						invoiceType === "tally"
							? "border-mint bg-mint/8 text-ink"
							: "border-border bg-background text-ink-3 hover:border-mint/40 hover:text-ink-2",
					)}
				>
					<BarChart2 className={cn("w-5 h-5 shrink-0", invoiceType === "tally" ? "text-mint" : "text-ink-3")} />
					<div>
						<p className="text-sm font-medium">Full Tally</p>
						<p className="text-xs text-ink-3">All clients combined</p>
					</div>
					{invoiceType === "tally" && (
						<span className="ml-auto w-2 h-2 rounded-full bg-mint shrink-0" />
					)}
				</button>
			</div>

			{/* Controls */}
			<div className="flex flex-wrap items-end gap-4 p-4 rounded-xl border bg-accent/20">
				{invoiceType === "client" && (
					<div className="space-y-1.5 min-w-[200px]">
						<Label>Client</Label>
						<Combobox
							options={[
								{ value: "", label: "Select a client…" },
								...clients.map((c: any) => ({
									value: c.id,
									label: c.deleted_at ? `${c.name} [Deactivated]` : c.name,
								})),
							]}
							value={clientId}
							onChange={setClientId}
							placeholder="Select a client…"
							searchPlaceholder="Search clients…"
							emptyText="No clients found."
						/>
					</div>
				)}

				<div className="space-y-1.5">
					<Label htmlFor="inv-date-from">From</Label>
					<input
						id="inv-date-from"
						type="date"
						value={dateFrom}
						onChange={(e) => { setDateFrom(e.target.value); setPreviewData(null); }}
						className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
					/>
				</div>

				<div className="space-y-1.5">
					<Label htmlFor="inv-date-to">To</Label>
					<input
						id="inv-date-to"
						type="date"
						value={dateTo}
						onChange={(e) => { setDateTo(e.target.value); setPreviewData(null); }}
						className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
					/>
				</div>

				{invoiceType === "client" && (
					<Button
						size="sm"
						variant="outline"
						disabled={!canPreview || isPreviewing}
						onClick={() => fetchPreview()}
					>
						{isPreviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
						Generate Preview
					</Button>
				)}

				<Button
					size="sm"
					disabled={!canExport || isExporting}
					onClick={handleExport}
				>
					{isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
					Export to Excel
				</Button>
			</div>

			{invoiceType === "tally" && (
				<p className="text-xs text-ink-3">
					Exports all clients&apos; completed tickets for the selected period into a two-sheet workbook (line items + summary).
				</p>
			)}

			{exportError && <p className="text-sm text-destructive">{exportError}</p>}

			{/* Preview — client invoice only */}
			{invoiceType === "client" && previewData && (
				<div className="rounded-xl border bg-background overflow-hidden">
					{/* Invoice header */}
					<div className="flex items-start justify-between px-6 py-5 border-b bg-accent/20">
						<div className="space-y-0.5">
							{orgLogoUrl && (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={orgLogoUrl} alt={orgName} className="h-8 mb-2 object-contain" />
							)}
							<p className="text-base font-bold text-ink">{orgName}</p>
							<p className="text-xs text-ink-3 flex items-center gap-1.5">
								<Calendar className="w-3 h-3" />
								{previewData.date_from} — {previewData.date_to}
							</p>
						</div>
						<div className="text-right space-y-0.5">
							<p className="text-xs text-ink-3">Invoice Preview</p>
							{previewData.summary[0] && (
								<div className="flex items-center gap-1.5 justify-end">
									<Building2 className="w-3.5 h-3.5 text-ink-3" />
									<p className="text-sm font-medium text-ink">
										{previewData.summary[0].client_name}
										{previewData.summary[0].client_deactivated && (
											<span className="ml-1 text-xs font-normal text-amber-600">[Deactivated]</span>
										)}
									</p>
								</div>
							)}
							{previewData.summary[0]?.client_email && (
								<p className="text-xs text-ink-3">{previewData.summary[0].client_email}</p>
							)}
						</div>
					</div>

					{/* Line items table */}
					{previewData.line_items.length === 0 ? (
						<div className="px-6 py-12 text-center text-sm text-ink-3">
							No completed tickets found for this client in the selected period.
						</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[640px] text-sm">
									<thead>
										<tr className="border-b bg-accent/30">
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Ticket #</th>
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Title</th>
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Employee</th>
											<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Completed</th>
											<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Hrs</th>
											<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Rate</th>
											<th className="text-right px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Amount</th>
										</tr>
									</thead>
									<tbody className="divide-y">
										{previewData.line_items.map((item) => (
											<tr key={item.ticket_id} className="hover:bg-accent/10">
												<td className="px-4 py-2 text-xs font-mono text-ink-3">{item.ticket_number}</td>
												<td className="px-4 py-2 text-xs text-ink max-w-[200px] truncate">{item.title}</td>
												<td className="px-4 py-2 text-xs text-ink-3 hidden md:table-cell">{item.employee_name}</td>
												<td className="px-4 py-2 text-xs text-ink-3 hidden md:table-cell">
													{item.completed_at ? formatDate(item.completed_at) : "—"}
												</td>
												<td className="px-4 py-2 text-xs text-ink-2 text-right">{item.billable_hours.toFixed(2)}</td>
												<td className="px-4 py-2 text-xs text-ink-3 text-right">{item.currency} {item.rate.toFixed(2)}</td>
												<td className="px-4 py-2 text-xs font-medium text-ink text-right">{item.currency} {item.subtotal.toFixed(2)}</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Totals */}
							<div className="px-6 py-4 border-t bg-accent/20 flex flex-col items-end gap-1 text-sm">
								<div className="flex gap-8">
									<span className="text-ink-3">Billable Hours</span>
									<span className="font-medium text-ink w-24 text-right">{totalBillable.toFixed(2)} hrs</span>
								</div>
								<div className="flex gap-8">
									<span className="text-ink-3">Subtotal</span>
									<span className="font-medium text-ink w-24 text-right">{primaryCurrency} {totalSubtotal.toFixed(2)}</span>
								</div>
								{totalDiscount > 0 && (
									<div className="flex gap-8">
										<span className="text-ink-3">
											Discount ({previewData.summary[0]?.client_deactivated === false
												? `${previewData.line_items[0]?.discount_percent ?? 0}%`
												: `${previewData.line_items[0]?.discount_percent ?? 0}%`})
										</span>
										<span className="font-medium text-amber-600 w-24 text-right">-{primaryCurrency} {totalDiscount.toFixed(2)}</span>
									</div>
								)}
								<div className="flex gap-8 pt-1 border-t mt-1">
									<span className="font-semibold text-ink">Net Total</span>
									<span className="font-bold text-ink w-24 text-right">{primaryCurrency} {totalNet.toFixed(2)}</span>
								</div>
							</div>
						</>
					)}
				</div>
			)}

			{/* Status badges */}
			{invoiceType === "client" && previewData && previewData.line_items.length > 0 && (
				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
						{previewData.line_items.length} ticket{previewData.line_items.length !== 1 ? "s" : ""}
					</Badge>
					<Badge variant="outline" className="text-xs">
						{previewData.summary[0]?.currency} {totalNet.toFixed(2)} net
					</Badge>
					<Button size="sm" onClick={handleExport} disabled={isExporting} variant="outline" className="ml-auto">
						{isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
						Export to Excel
					</Button>
				</div>
			)}
		</div>
	);
}
