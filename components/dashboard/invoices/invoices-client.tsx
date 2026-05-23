"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { GenerateInvoiceModal } from "./generate-invoice-modal";
import { formatDate } from "@/lib/utils/format";

interface Props {
	orgName:    string;
	orgLogoUrl: string | null;
}

export function InvoicesClient({ orgName, orgLogoUrl }: Props) {
	const [modalOpen,  setModalOpen]  = useState(false);
	const [page,       setPage]       = useState(1);
	const [dateFrom,   setDateFrom]   = useState("");
	const [dateTo,     setDateTo]     = useState("");

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

	return (
		<>
			{/* Filter row */}
			<div className="flex items-center gap-3 flex-wrap">
				<div className="flex items-center gap-2">
					<label className="text-sm text-ink-3">From</label>
					<input
						type="date"
						value={dateFrom}
						onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
						className={inputCls}
					/>
				</div>
				<div className="flex items-center gap-2">
					<label className="text-sm text-ink-3">To</label>
					<input
						type="date"
						value={dateTo}
						onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
						className={inputCls}
					/>
				</div>
				{(dateFrom || dateTo) && (
					<Button variant="ghost" size="sm" className="text-ink-3" onClick={() => { setDateFrom(""); setDateTo(""); setPage(1); }}>
						Clear
					</Button>
				)}
				<div className="ml-auto">
					<Button onClick={() => setModalOpen(true)} className="gap-2">
						<Plus className="w-4 h-4" />
						Generate Invoice
					</Button>
				</div>
			</div>

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
								{["Invoice #", "Type", "Client", "Period", "Generated"].map((h) => (
									<th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-ink-3/60 first:pl-5">{h}</th>
								))}
							</tr>
						</thead>
						<tbody>
							{invoices.map((inv: any) => (
								<tr key={inv.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
									<td className="pl-5 pr-4 py-3 font-mono text-xs text-ink-2">{inv.invoice_number}</td>
									<td className="px-4 py-3">
										<span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${inv.type === "client" ? "bg-blue-500/10 text-blue-600" : "bg-purple-500/10 text-purple-600"}`}>
											{inv.type === "client" ? "Single Client" : "Full Tally"}
										</span>
									</td>
									<td className="px-4 py-3 text-ink-2">{inv.client_name ?? <span className="text-ink-3">—</span>}</td>
									<td className="px-4 py-3 text-ink-3 text-xs">{inv.date_from}  →  {inv.date_to}</td>
									<td className="px-4 py-3 text-ink-3 text-xs">{formatDate(inv.generated_at)}</td>
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
