"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import {
	SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { RotateCcw, ArrowRightLeft, Calendar, Inbox, Filter, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";

type RequestType = "reopen" | "transfer" | "due_date";

interface MyRequest {
	id: string;
	type: RequestType;
	ticket_id: string;
	ticket_title: string;
	ticket_type: string;
	ticket_status: string;
	status: string;
	reason?: string | null;
	requested_date?: string | null;
	requested_to?: { id: string; name: string | null; email: string } | null;
	reject_reason?: string | null;
	created_at: string;
}

interface MyRequestsResponse {
	data: MyRequest[];
	page: number;
	totalPages: number;
	total: number;
}

const TYPE_OPTIONS = [
	{ label: "All Types", value: "all" },
	{ label: "Reopen", value: "reopen" },
	{ label: "Transfer", value: "transfer" },
	{ label: "Due Date", value: "due_date" },
];

const TYPE_ICONS: Record<RequestType, React.ElementType> = {
	reopen: RotateCcw,
	transfer: ArrowRightLeft,
	due_date: Calendar,
};

const TYPE_LABELS: Record<RequestType, string> = {
	reopen: "Reopen",
	transfer: "Transfer",
	due_date: "Due Date",
};

const TYPE_STYLES: Record<RequestType, string> = {
	reopen: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
	transfer: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
	due_date: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const STATUS_STYLES: Record<string, string> = {
	pending: "bg-warning/15 text-warning-fg border-warning/30",
	approved: "bg-mint/15 text-mint border-mint/30",
	rejected: "bg-destructive/15 text-destructive border-destructive/30",
	cancelled: "bg-ink-3/15 text-ink-3 border-ink-3/30",
};

// ─── Row ─────────────────────────────────────────────────────────────────────

function RequestRow({ req, onWithdraw, isWithdrawing }: {
	req: MyRequest;
	onWithdraw: (id: string, type: RequestType) => void;
	isWithdrawing: boolean;
}) {
	const [confirming, setConfirming] = useState(false);
	const Icon = TYPE_ICONS[req.type];

	const details = () => {
		if (req.type === "due_date" && req.requested_date) return `→ ${formatDate(req.requested_date)}`;
		if (req.type === "transfer") return req.requested_to ? `→ ${req.requested_to.name ?? req.requested_to.email}` : "No preference";
		return "Reopen from completed";
	};

	return (
		<tr className="border-b border-border/50 hover:bg-mint/3 transition-colors">
			{/* Ticket */}
			<td className="px-4 py-3 min-w-[200px]">
				<Link
					href={`/dashboard/tickets/${req.ticket_id}`}
					className="text-xs font-medium text-ink hover:text-mint transition-colors line-clamp-1 flex items-center gap-1 group"
				>
					{req.ticket_title}
					<ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
				</Link>
				<p className="text-[10px] text-ink-3 mt-0.5 capitalize">{req.ticket_type?.replace(/_/g, " ")}</p>
			</td>

			{/* Type */}
			<td className="px-4 py-3">
				<span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase", TYPE_STYLES[req.type])}>
					<Icon className="w-2.5 h-2.5" />
					{TYPE_LABELS[req.type]}
				</span>
			</td>

			{/* Details */}
			<td className="px-4 py-3 text-xs text-ink-3 hidden sm:table-cell max-w-[180px]">
				<span className="block truncate">{details()}</span>
				{req.reason && <span className="block text-[10px] text-ink-3/70 truncate mt-0.5">{req.reason}</span>}
				{req.status === "rejected" && req.reject_reason && (
					<span className="block text-[10px] text-destructive/80 truncate mt-0.5">Reason: {req.reject_reason}</span>
				)}
			</td>

			{/* Status */}
			<td className="px-4 py-3">
				<span className={cn(
					"inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize",
					STATUS_STYLES[req.status] ?? "bg-ink-3/10 text-ink-3 border-ink-3/20",
				)}>
					{req.status}
				</span>
			</td>

			{/* Date */}
			<td className="px-4 py-3 text-[11px] text-ink-3 whitespace-nowrap hidden md:table-cell">
				{formatDateTime(req.created_at)}
			</td>

			{/* Action */}
			<td className="px-4 py-3 text-right">
				{req.status === "pending" && (
					confirming ? (
						<div className="flex items-center justify-end gap-1.5">
							<span className="text-[10px] text-ink-3 whitespace-nowrap">Withdraw?</span>
							<Button
								size="sm"
								className="h-6 px-2 text-[10px] bg-destructive hover:bg-destructive/90 text-white"
								isLoading={isWithdrawing}
								onClick={() => onWithdraw(req.id, req.type)}
							>
								Yes
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="h-6 px-2 text-[10px] text-ink-3"
								disabled={isWithdrawing}
								onClick={() => setConfirming(false)}
							>
								No
							</Button>
						</div>
					) : (
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2.5 text-xs text-destructive hover:bg-destructive/10 gap-1"
							onClick={() => setConfirming(true)}
						>
							<X className="w-3 h-3" />
							Withdraw
						</Button>
					)
				)}
			</td>
		</tr>
	);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
	const [page, setPage] = useState(1);
	const [typeFilter, setTypeFilter] = useState("all");
	const queryClient = useQueryClient();

	const params = { page, limit: 20, type: typeFilter !== "all" ? typeFilter : undefined };

	const { data, isLoading } = useQuery<MyRequestsResponse>({
		queryKey: ["my-requests", params],
		queryFn: () => APIService.myRequests.list(params),
	});

	const { mutate: cancelRequest, isPending: isCancelling, variables: cancellingId } = useMutation({
		mutationFn: ({ id, type }: { id: string; type: RequestType }) =>
			APIService.myRequests.cancel(id, type),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["my-requests"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});

	function handleFilterChange(type: string) {
		setTypeFilter(type);
		setPage(1);
	}

	const rows = data?.data ?? [];

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">My Requests</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Ticket requests you have submitted and their current status.
				</p>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-2">
				<Filter className="w-3.5 h-3.5 text-ink-3 shrink-0" />
				<SelectRoot value={typeFilter} onValueChange={handleFilterChange}>
					<SelectTrigger className="h-8 text-xs w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TYPE_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
						))}
					</SelectContent>
				</SelectRoot>
				{data && (
					<span className="text-xs text-ink-3 ml-auto">{data.total} request{data.total !== 1 ? "s" : ""}</span>
				)}
			</div>

			{/* Table */}
			<div className="rounded-xl border border-border/60 overflow-hidden glass">
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-border/60 bg-surface/50">
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Ticket</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Type</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70 hidden sm:table-cell">Details</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Status</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70 hidden md:table-cell">Submitted</th>
								<th className="px-4 py-3" />
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={6} className="px-4 py-12 text-center">
										<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin mx-auto" />
									</td>
								</tr>
							)}
							{!isLoading && rows.length === 0 && (
								<tr>
									<td colSpan={6} className="px-4 py-16 text-center">
										<Inbox className="w-8 h-8 text-ink-3/40 mx-auto mb-2" />
										<p className="text-sm font-medium text-ink-2">No requests yet</p>
										<p className="text-xs text-ink-3 mt-0.5">Requests you submit on tickets will appear here.</p>
									</td>
								</tr>
							)}
							{rows.map((req) => (
								<RequestRow
									key={req.id}
									req={req}
									onWithdraw={(id, type) => cancelRequest({ id, type })}
									isWithdrawing={isCancelling && (cancellingId as any)?.id === req.id}
								/>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<Pagination
				page={page}
				totalPages={data?.totalPages ?? 1}
				onPrev={() => setPage((p) => p - 1)}
				onNext={() => setPage((p) => p + 1)}
				onGoTo={setPage}
			/>
		</div>
	);
}
