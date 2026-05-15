"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, ArrowRightLeft, Calendar, Check, X, Search, Filter, ChevronRight, Users, CheckSquare } from "lucide-react";
import Link from "next/link";
import APIService from "@/lib/infra/api";
import { formatDate, formatDateTime, formatInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { EmployeePickerModal } from "@/components/dashboard/tickets/employee-picker-modal";
import { Pagination } from "@/components/ui/pagination";

// ─── Types ────────────────────────────────────────────────────────────────────

type RequestType = "reopen" | "transfer" | "due_date";

interface TicketRequest {
	id: string;
	type: RequestType;
	ticket_id: string;
	ticket_title: string;
	ticket_type: string;
	ticket_status: string;
	requester: { id: string; name: string | null; email: string };
	created_at: string;
	requested_date?: string;
	reason?: string | null;
	requested_to?: { id: string; name: string | null; email: string } | null;
}

interface TicketRequestsResponse {
	data: TicketRequest[];
	total: number;
	page: number;
	totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
	{ label: "All Types", value: "all" },
	{ label: "Reopen", value: "reopen" },
	{ label: "Transfer", value: "transfer" },
	{ label: "Due Date", value: "due_date" },
];

const TYPE_STYLES: Record<RequestType, string> = {
	reopen:   "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
	transfer: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
	due_date: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

const TYPE_ICONS: Record<RequestType, React.ElementType> = {
	reopen:   RotateCcw,
	transfer: ArrowRightLeft,
	due_date: Calendar,
};

const TYPE_LABELS: Record<RequestType, string> = {
	reopen:   "Reopen",
	transfer: "Transfer",
	due_date: "Due Date",
};

// ─── Row ──────────────────────────────────────────────────────────────────────

function RequestRow({
	req,
	bulkMode,
	selected,
	onSelect,
	onActionDone,
}: {
	req: TicketRequest;
	bulkMode: boolean;
	selected: boolean;
	onSelect: (id: string, checked: boolean) => void;
	onActionDone: () => void;
}) {
	const [reassignOpen, setReassignOpen] = useState(false);

	const approveMutation = useMutation({
		mutationFn: () => {
			if (req.type === "reopen") return APIService.tasks.reopenRequest.approve(req.ticket_id);
			return APIService.tasks.dueDateRequest.approve(req.ticket_id);
		},
		onSuccess: onActionDone,
	});

	const rejectMutation = useMutation({
		mutationFn: () => {
			if (req.type === "reopen") return APIService.tasks.reopenRequest.reject(req.ticket_id);
			if (req.type === "transfer") return APIService.tasks.transferRequest.reject(req.ticket_id);
			return APIService.tasks.dueDateRequest.reject(req.ticket_id);
		},
		onSuccess: onActionDone,
	});

	const Icon = TYPE_ICONS[req.type];
	const requesterLabel = req.requester.name ?? req.requester.email;
	const initials = formatInitials(req.requester.name, req.requester.email);

	const details = () => {
		if (req.type === "due_date" && req.requested_date) return `→ ${formatDate(req.requested_date)}`;
		if (req.type === "transfer") return req.requested_to ? `→ ${req.requested_to.name ?? req.requested_to.email}` : "No preference";
		return "from stale";
	};

	const transferApproveMutation = useMutation({
		mutationFn: (employeeId: string) => APIService.tasks.transferRequest.approve(req.ticket_id, employeeId),
		onSuccess: () => { setReassignOpen(false); onActionDone(); },
	});

	return (
		<>
			<EmployeePickerModal
				open={reassignOpen}
				title="Reassign Ticket"
				subtitle={req.ticket_title}
				initialSelectedId={req.requested_to?.id}
				isPending={transferApproveMutation.isPending}
				confirmLabel="Confirm Reassign"
				onConfirm={(id) => transferApproveMutation.mutate(id)}
				onClose={() => setReassignOpen(false)}
			/>

			<tr className="border-b border-border/50 hover:bg-mint/3 transition-colors">
				{/* Checkbox — only visible in bulk mode */}
				<td className={cn("px-4 py-3 w-8", !bulkMode && "hidden")}>
					<input
						type="checkbox"
						checked={selected}
						onChange={(e) => onSelect(req.id, e.target.checked)}
						className="w-3.5 h-3.5 rounded accent-mint cursor-pointer"
					/>
				</td>

				{/* Ticket */}
				<td className="px-4 py-3 min-w-[180px]">
					<Link
						href={`/dashboard/tickets/${req.ticket_id}`}
						className="text-xs font-medium text-ink hover:text-mint transition-colors line-clamp-1 flex items-center gap-1 group"
					>
						{req.ticket_title}
						<ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
					</Link>
					<p className="text-[10px] text-ink-3 mt-0.5 capitalize">{req.ticket_type?.replace("_", " ")}</p>
				</td>

				{/* From */}
				<td className="px-4 py-3">
					<div className="flex items-center gap-1.5">
						<div className="w-5 h-5 rounded-full bg-mint/20 flex items-center justify-center text-[9px] font-bold text-ink-2 shrink-0">
							{initials}
						</div>
						<span className="text-xs text-ink truncate max-w-[110px]">{requesterLabel}</span>
					</div>
				</td>

				{/* Type badge */}
				<td className="px-4 py-3">
					<span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase", TYPE_STYLES[req.type])}>
						<Icon className="w-2.5 h-2.5" />
						{TYPE_LABELS[req.type]}
					</span>
				</td>

				{/* Details */}
				<td className="px-4 py-3 text-xs text-ink-3">
					{details()}
					{req.reason && <p className="text-[10px] text-ink-3/70 truncate max-w-[140px] mt-0.5">{req.reason}</p>}
				</td>

				{/* Date */}
				<td className="px-4 py-3 text-[11px] text-ink-3 whitespace-nowrap">
					{formatDateTime(req.created_at)}
				</td>

				{/* Actions */}
				<td className="px-4 py-3">
					<div className="flex items-center gap-1">
						{req.type === "transfer" ? (
							<Button
								size="sm" variant="ghost"
								className="h-7 px-2.5 text-xs text-sky-700 hover:bg-sky-500/10 gap-1"
								onClick={() => setReassignOpen(true)}
							>
								<Users className="w-3 h-3" /> Reassign
							</Button>
						) : (
							<Button
								size="sm" variant="ghost"
								className="h-7 px-2.5 text-xs text-green-700 hover:bg-green-500/10 hover:text-green-800 gap-1"
								disabled={approveMutation.isPending} isLoading={approveMutation.isPending}
								onClick={() => approveMutation.mutate()}
							>
								<Check className="w-3 h-3" /> Approve
							</Button>
						)}
						<Button
							size="sm" variant="ghost"
							className="h-7 px-2.5 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-700 gap-1"
							disabled={rejectMutation.isPending} isLoading={rejectMutation.isPending}
							onClick={() => rejectMutation.mutate()}
						>
							<X className="w-3 h-3" /> Reject
						</Button>
					</div>
				</td>
			</tr>
		</>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TicketRequestsTable() {
	const queryClient = useQueryClient();
	const [typeFilter, setTypeFilter] = useState("all");
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [page, setPage] = useState(1);
	const [bulkMode, setBulkMode] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const params = { page, limit: 20, type: typeFilter !== "all" ? typeFilter : undefined, search: search || undefined };

	const { data, isLoading } = useQuery<TicketRequestsResponse>({
		queryKey: ["ticket-requests", params],
		queryFn: () => APIService.ticketRequests.list(params) as Promise<TicketRequestsResponse>,
	});

	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["ticket-requests"] });
		queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		setSelected(new Set());
	}, [queryClient]);

	const bulkRejectMutation = useMutation({
		mutationFn: async () => {
			if (!data) return;
			const selectedReqs = data.data.filter((r) => selected.has(r.id));
			await Promise.all(selectedReqs.map((r) => {
				if (r.type === "reopen") return APIService.tasks.reopenRequest.reject(r.ticket_id);
				if (r.type === "transfer") return APIService.tasks.transferRequest.reject(r.ticket_id);
				return APIService.tasks.dueDateRequest.reject(r.ticket_id);
			}));
		},
		onSuccess: invalidate,
	});

	const bulkApproveMutation = useMutation({
		mutationFn: async () => {
			if (!data) return;
			const approvable = data.data.filter((r) => selected.has(r.id) && r.type !== "transfer");
			await Promise.all(approvable.map((r) => {
				if (r.type === "reopen") return APIService.tasks.reopenRequest.approve(r.ticket_id);
				return APIService.tasks.dueDateRequest.approve(r.ticket_id);
			}));
		},
		onSuccess: invalidate,
	});

	const rows = data?.data ?? [];
	const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
	const someSelected = selected.size > 0;
	const bulkApprovable = data?.data.filter((r) => selected.has(r.id) && r.type !== "transfer").length ?? 0;
	const hasTransferSelected = data?.data.some((r) => selected.has(r.id) && r.type === "transfer") ?? false;

	function toggleBulkMode() {
		setBulkMode((v) => !v);
		setSelected(new Set());
	}

	function toggleAll(checked: boolean) {
		setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
	}

	function toggleOne(id: string, checked: boolean) {
		setSelected((prev) => {
			const next = new Set(prev);
			checked ? next.add(id) : next.delete(id);
			return next;
		});
	}

	function handleFilterChange(fn: () => void) {
		fn();
		setPage(1);
		setSelected(new Set());
	}

	function handleSearch(e: React.FormEvent) {
		e.preventDefault();
		setSearch(searchInput);
		setPage(1);
		setSelected(new Set());
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
				<Filter className="w-3.5 h-3.5 text-ink-3 shrink-0" />

				<SelectRoot value={typeFilter} onValueChange={(v) => handleFilterChange(() => setTypeFilter(v))}>
					<SelectTrigger className="h-8 text-xs w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TYPE_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
						))}
					</SelectContent>
				</SelectRoot>

				<form onSubmit={handleSearch} className="flex items-center gap-1.5">
					<div className="relative">
						<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" />
						<Input
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							placeholder="Search ticket or employee…"
							className="h-8 text-xs pl-8 w-52"
						/>
					</div>
					<Button type="submit" size="sm" className="h-8 w-8 p-0 bg-mint hover:bg-mint/90 text-ink" title="Search"><Search className="w-3.5 h-3.5" /></Button>
					{search && (
						<Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-ink-3"
							onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}>
							Clear
						</Button>
					)}
				</form>

				<div className="ml-auto flex items-center gap-2">
					{data && <span className="text-xs text-ink-3">{data.total} pending</span>}
					<Button
						size="sm" variant={bulkMode ? "outline" : "ghost"}
						className={cn("h-8 text-xs gap-1.5", bulkMode ? "border-mint/40 text-mint" : "text-ink-3")}
						onClick={toggleBulkMode}
					>
						<CheckSquare className="w-3.5 h-3.5" />
						{bulkMode ? "Exit Bulk" : "Bulk"}
					</Button>
				</div>
			</div>

			{/* Bulk actions bar — only visible in bulk mode with selections */}
			{bulkMode && someSelected && (
				<div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-mint/8 border border-mint/20">
					<span className="text-xs font-medium text-ink-2">{selected.size} selected</span>
					{hasTransferSelected && (
						<span className="text-[10px] text-ink-3/70">Transfer requests require individual reassignment</span>
					)}
					<div className="flex items-center gap-2 ml-auto">
						{bulkApprovable > 0 && (
							<Button
								size="sm" variant="outline"
								className="h-7 text-xs text-green-700 border-green-500/30 hover:bg-green-500/10 gap-1"
								disabled={bulkApproveMutation.isPending} isLoading={bulkApproveMutation.isPending}
								onClick={() => bulkApproveMutation.mutate()}
							>
								<Check className="w-3 h-3" /> Approve {bulkApprovable}
							</Button>
						)}
						<Button
							size="sm" variant="outline"
							className="h-7 text-xs text-red-600 border-red-500/30 hover:bg-red-500/10 gap-1"
							disabled={bulkRejectMutation.isPending} isLoading={bulkRejectMutation.isPending}
							onClick={() => bulkRejectMutation.mutate()}
						>
							<X className="w-3 h-3" /> Reject {selected.size}
						</Button>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="rounded-xl border border-border/60 overflow-hidden glass">
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-border/60 bg-surface/50">
								<th className={cn("px-4 py-3 w-8", !bulkMode && "hidden")}>
									<input
										type="checkbox"
										checked={allSelected}
										onChange={(e) => toggleAll(e.target.checked)}
										className="w-3.5 h-3.5 rounded accent-mint cursor-pointer"
									/>
								</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Ticket</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">From</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Type</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Details</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Requested</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Actions</th>
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-3">Loading…</td>
								</tr>
							)}
							{!isLoading && rows.length === 0 && (
								<tr>
									<td colSpan={7} className="px-4 py-16 text-center">
										<p className="text-sm font-medium text-ink-2">No pending requests</p>
										<p className="text-xs text-ink-3 mt-1">All caught up.</p>
									</td>
								</tr>
							)}
							{rows.map((req) => (
								<RequestRow
									key={req.id}
									req={req}
									bulkMode={bulkMode}
									selected={selected.has(req.id)}
									onSelect={toggleOne}
									onActionDone={invalidate}
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
