"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, FileSpreadsheet, Plus, ChevronLeft, ChevronRight, Download, Trash2, CheckSquare } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { GenerateInvoiceModal } from "./generate-invoice-modal";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

interface Props {
	orgName:    string;
	orgLogoUrl: string | null;
}

export function InvoicesClient({ orgName, orgLogoUrl }: Props) {
	const [modalOpen,   setModalOpen]   = useState(false);
	const [page,        setPage]        = useState(1);
	const [dateFrom,    setDateFrom]    = useState("");
	const [dateTo,      setDateTo]      = useState("");
	const [exporting,   setExporting]   = useState<string | null>(null);
	const [bulkMode,    setBulkMode]    = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const queryClient = useQueryClient();

	const inputCls = "rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint";

	const params: any = { page, limit: 20 };
	if (dateFrom) params.date_from = dateFrom;
	if (dateTo)   params.date_to   = dateTo;

	const { data, isLoading } = useQuery({
		queryKey: ["invoices", page, dateFrom, dateTo],
		queryFn:  () => APIService.invoices.list(params),
		staleTime: 30_000,
	});

	const invoices = (data as any)?.data ?? [];
	const total    = (data as any)?.total ?? 0;
	const pages    = (data as any)?.pages ?? 1;

	const { mutate: bulkDelete, isPending: isDeleting } = useMutation({
		mutationFn: (ids: string[]) => Promise.all(ids.map((id) => APIService.invoices.delete(id))),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["invoices"] });
			setSelectedIds(new Set());
			setBulkMode(false);
		},
	});

	async function handleExport(inv: any) {
		setExporting(inv.id);
		try {
			const res  = await APIService.invoices.export(inv.id);
			const ext  = inv.format === "pdf" ? "pdf" : "xlsx";
			const mime = inv.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
			const blob = new Blob([res.data], { type: mime });
			const url  = URL.createObjectURL(blob);
			const a    = document.createElement("a");
			a.href     = url;
			a.download = `${inv.invoice_number}.${ext}`;
			a.click();
			URL.revokeObjectURL(url);
		} finally {
			setExporting(null);
		}
	}

	function toggleRow(id: string, checked: boolean) {
		const next = new Set(selectedIds);
		if (checked) next.add(id);
		else next.delete(id);
		setSelectedIds(next);
	}

	return (
		<>
			{/* Filter + actions row */}
			<div className="flex items-center gap-3 flex-wrap">
				<div className="flex items-center gap-2">
					<label className="text-sm text-ink-3">From</label>
					<input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className={inputCls} />
				</div>
				<div className="flex items-center gap-2">
					<label className="text-sm text-ink-3">To</label>
					<input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className={inputCls} />
				</div>
				{(dateFrom || dateTo) && (
					<Button variant="ghost" size="sm" className="text-ink-3" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>
						Clear
					</Button>
				)}
				<div className="ml-auto flex items-center gap-2">
					<Button
						size="sm"
						variant={bulkMode ? "outline" : "ghost"}
						className={cn("h-8 text-xs gap-1.5", bulkMode ? "border-mint/40 text-mint" : "text-ink-3")}
						onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
					>
						<CheckSquare className="w-3.5 h-3.5" />
						{bulkMode ? "Exit Bulk" : "Bulk"}
					</Button>
					<Button onClick={() => setModalOpen(true)} className="gap-2">
						<Plus className="w-4 h-4" />
						Generate Invoice
					</Button>
				</div>
			</div>

			{/* Bulk action bar */}
			{bulkMode && (
				<div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-mint/8 border border-mint/20">
					<span className="text-xs font-medium text-ink-2">
						{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select invoices to act on"}
					</span>
					<div className="flex items-center gap-2 ml-auto">
						<Button
							size="sm"
							variant="outline"
							className="h-8 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
							disabled={isDeleting || selectedIds.size === 0}
							onClick={() => bulkDelete([...selectedIds])}
						>
							<Trash2 className="w-3.5 h-3.5" />
							{isDeleting ? "Deleting…" : `Delete${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
						</Button>
						<Button variant="ghost" size="sm" className="h-8 text-xs text-ink-3" onClick={() => { setSelectedIds(new Set()); setBulkMode(false); }}>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="rounded-xl border bg-background overflow-hidden">
				<div className="px-4 py-3 border-b bg-accent/20">
					<p className="text-xs font-semibold uppercase tracking-widest text-ink-3/70">Generated Invoices</p>
					{total > 0 && <p className="text-xs text-ink-3 mt-0.5">{total} invoice{total !== 1 ? "s" : ""} total</p>}
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-16 text-ink-3 text-sm">Loading…</div>
				) : invoices.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-20 gap-3 text-ink-3">
						<div className="w-12 h-12 rounded-full bg-accent/60 flex items-center justify-center">
							<FileText className="w-5 h-5" />
						</div>
						<p className="font-medium text-ink">No invoices yet</p>
						<p className="text-sm">Configure and click Generate Invoice to get started.</p>
					</div>
				) : (
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b">
								<th className={cn("w-8 px-3 py-3", !bulkMode && "hidden")}>
									<input
										type="checkbox"
										checked={invoices.length > 0 && selectedIds.size === invoices.length}
										onChange={(e) => {
											if (e.target.checked) setSelectedIds(new Set(invoices.map((i: any) => i.id)));
											else setSelectedIds(new Set());
										}}
										className="accent-mint cursor-pointer"
									/>
								</th>
								{["Invoice #", "Type", "Format", "Client", "Period", "Generated", ""].map((h) => (
									<th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-ink-3/60 first:pl-5">{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{invoices.map((inv: any) => (
								<tr key={inv.id} className={cn("border-b last:border-0 transition-colors", selectedIds.has(inv.id) ? "bg-mint/5" : "hover:bg-accent/30")}>
									<td className={cn("w-8 px-3 py-3", !bulkMode && "hidden")} onClick={(e) => e.stopPropagation()}>
										<input
											type="checkbox"
											checked={selectedIds.has(inv.id)}
											onChange={(e) => toggleRow(inv.id, e.target.checked)}
											className="accent-mint cursor-pointer"
										/>
									</td>
									<td className="pl-5 pr-4 py-3 font-mono text-xs text-ink-2">{inv.invoice_number}</td>
									<td className="px-4 py-3">
										<span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${inv.type === "client" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"}`}>
											{inv.type === "client" ? "Single Client" : "Full Tally"}
										</span>
									</td>
									<td className="px-4 py-3">
										<span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${inv.format === "pdf" ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"}`}>
											{inv.format === "pdf"
												? <><FileText className="w-3 h-3" /> PDF</>
												: <><FileSpreadsheet className="w-3 h-3" /> XLSX</>
											}
										</span>
									</td>
									<td className="px-4 py-3 text-ink-2">{inv.client_name ?? <span className="text-ink-3">—</span>}</td>
									<td className="px-4 py-3 text-ink-3 text-xs">{inv.date_from}  →  {inv.date_to}</td>
									<td className="px-4 py-3 text-ink-3 text-xs">{formatDate(inv.generated_at)}</td>
									<td className="px-4 py-3 pr-5">
										<button
											type="button"
											onClick={() => handleExport(inv)}
											disabled={exporting === inv.id}
											className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink px-2.5 py-1.5 rounded-lg hover:bg-accent/60 transition-colors disabled:opacity-40"
										>
											<Download className="w-3.5 h-3.5" />
											{exporting === inv.id ? "…" : "Export"}
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>

			{/* Pagination */}
			{pages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-xs text-ink-3">Page {page} of {pages}</p>
					<div className="flex gap-1.5">
						<Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
							<ChevronLeft className="w-4 h-4" />
						</Button>
						<Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
							<ChevronRight className="w-4 h-4" />
						</Button>
					</div>
				</div>
			)}

			<GenerateInvoiceModal
				open={modalOpen}
				onOpenChange={setModalOpen}
				orgName={orgName}
				orgLogoUrl={orgLogoUrl}
			/>
		</>
	);
}
