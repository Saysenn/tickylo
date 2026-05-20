"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Filter, X } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import APIService from "@/lib/infra/api";
import { formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
	SelectRoot,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatInitials } from "@/lib/utils/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditAction =
	| "CREATE" | "UPDATE" | "DELETE"
	| "APPROVE" | "REJECT"
	| "CLAIM" | "COMPLETE" | "HOLD" | "REOPEN" | "TRANSFER"
	| "READ";

type AuditEntityType = "ticket" | "employee" | "leave_request" | "time_entry";

interface AuditLogEntry {
	id: string;
	org_id?: string;
	actor_id: string;
	actor_role: string;
	action: AuditAction;
	entity_type: AuditEntityType;
	entity_id: string;
	before?: Record<string, unknown> | null;
	after?: Record<string, unknown> | null;
	created_at: string;
	actor?: { id: string; name: string | null; email: string } | null;
}

interface AuditLogsResponse {
	data: AuditLogEntry[];
	total: number;
	page: number;
	totalPages: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS: { label: string; value: string }[] = [
	{ label: "All Actions", value: "all" },
	{ label: "Create", value: "CREATE" },
	{ label: "Update", value: "UPDATE" },
	{ label: "Delete", value: "DELETE" },
	{ label: "Approve", value: "APPROVE" },
	{ label: "Reject", value: "REJECT" },
	{ label: "Claim", value: "CLAIM" },
	{ label: "Complete", value: "COMPLETE" },
	{ label: "Hold", value: "HOLD" },
	{ label: "Reopen", value: "REOPEN" },
	{ label: "Transfer", value: "TRANSFER" },
];

const ENTITY_OPTIONS: { label: string; value: string }[] = [
	{ label: "All Entities", value: "all" },
	{ label: "Ticket", value: "ticket" },
	{ label: "Employee", value: "employee" },
	{ label: "Leave Request", value: "leave_request" },
	{ label: "Time Entry", value: "time_entry" },
];

const ACTION_STYLES: Record<string, string> = {
	CREATE:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
	UPDATE:   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
	DELETE:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
	APPROVE:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
	REJECT:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
	CLAIM:    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
	COMPLETE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
	HOLD:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
	REOPEN:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
	TRANSFER: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
	READ:     "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const ENTITY_LABELS: Record<string, string> = {
	ticket:        "Ticket",
	employee:      "Employee",
	leave_request: "Leave Request",
	time_entry:    "Time Entry",
};

// ─── Diff viewer ──────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
	if (v === null || v === undefined) return "";
	if (typeof v === "string") {
		if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
			const d = new Date(v);
			return isNaN(d.getTime()) ? v : d.toLocaleString();
		}
		return v;
	}
	if (typeof v === "boolean" || typeof v === "number") return String(v);
	if (Array.isArray(v)) return v.length ? v.join(", ") : "(empty)";
	if (typeof v === "object") return JSON.stringify(v);
	return String(v);
}

function changed(a: unknown, b: unknown) {
	return JSON.stringify(a) !== JSON.stringify(b);
}

function DiffPanel({ before, after }: { before?: Record<string, unknown> | null; after?: Record<string, unknown> | null }) {
	if (!before && !after) return <p className="text-xs text-ink-3 italic">No details recorded.</p>;

	const allKeys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])];

	if (allKeys.length === 0) return <p className="text-xs text-ink-3 italic">No details recorded.</p>;

	return (
		<div className="grid grid-cols-2 gap-3">
			{before && (
				<div>
					<p className="text-[10px] font-semibold tracking-widest uppercase text-ink-3/60 mb-1.5">Before</p>
					<div className="rounded-lg border bg-surface p-3 space-y-1">
						{allKeys.map((k) => (
							<div key={k} className="flex gap-2 text-xs font-mono">
								<span className="text-ink-3 shrink-0">{k}:</span>
								<span className={cn("break-all", changed(before[k], (after ?? {})[k]) ? "text-red-500" : "text-ink-2")}>
									{before[k] === null || before[k] === undefined ? <em className="text-ink-3/50">null</em> : formatValue(before[k])}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
			{after && (
				<div className={!before ? "col-span-2" : ""}>
					<p className="text-[10px] font-semibold tracking-widest uppercase text-ink-3/60 mb-1.5">After</p>
					<div className="rounded-lg border bg-surface p-3 space-y-1">
						{allKeys.map((k) => (
							<div key={k} className="flex gap-2 text-xs font-mono">
								<span className="text-ink-3 shrink-0">{k}:</span>
								<span className={cn("break-all", changed((before ?? {})[k], after[k]) ? "text-emerald-600" : "text-ink-2")}>
									{after[k] === null || after[k] === undefined ? <em className="text-ink-3/50">null</em> : formatValue(after[k])}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function AuditLogRow({ log }: { log: AuditLogEntry }) {
	const [expanded, setExpanded] = useState(false);
	const hasDiff = !!(log.before || log.after);
	const actorName = log.actor?.name ?? log.actor?.email ?? log.actor_id.slice(0, 8);
	const initials = formatInitials(log.actor?.name ?? null, log.actor?.email ?? log.actor_id.slice(0, 8));

	return (
		<>
			<tr
				className={cn(
					"border-b border-border/50 transition-colors",
					hasDiff ? "cursor-pointer hover:bg-mint/5" : "",
					expanded ? "bg-mint/5" : "",
				)}
				onClick={() => hasDiff && setExpanded((v) => !v)}
			>
				{/* Timestamp */}
				<td className="px-4 py-2 text-[11px] text-ink-3 whitespace-nowrap">
					{formatDateTime(log.created_at)}
				</td>

				{/* Actor */}
				<td className="px-4 py-2">
					<div className="flex items-center gap-2">
						<div className="w-5 h-5 rounded-full bg-mint/20 flex items-center justify-center text-[9px] font-bold text-ink-2 shrink-0">
							{initials}
						</div>
						<div className="min-w-0">
							<p className="text-[11px] font-medium text-ink truncate">{actorName}</p>
							<p className="text-[10px] text-ink-3 capitalize">{log.actor_role.replace("_", " ")}</p>
						</div>
					</div>
				</td>

				{/* Action */}
				<td className="px-4 py-2">
					<span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase", ACTION_STYLES[log.action] ?? "bg-gray-100 text-gray-600")}>
						{log.action}
					</span>
				</td>

				{/* Entity type */}
				<td className="px-4 py-2 text-[11px] text-ink-2">
					{ENTITY_LABELS[log.entity_type] ?? log.entity_type}
				</td>

				{/* Entity ID */}
				<td className="px-4 py-2 font-mono text-[10px] text-ink-3 max-w-[140px] truncate">
					{log.entity_id}
				</td>

				{/* Expand toggle */}
				<td className="px-4 py-2 w-8">
					{hasDiff && (
						<span className="text-ink-3">
							{expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
						</span>
					)}
				</td>
			</tr>

			{expanded && hasDiff && (
				<tr className="bg-mint/3 border-b border-border/50">
					<td colSpan={6} className="px-6 py-4">
						<DiffPanel before={log.before} after={log.after} />
					</td>
				</tr>
			)}
		</>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditLogsTable({
	fetchFn,
	queryKey = "audit-logs",
}: {
	fetchFn?: (params: Record<string, unknown>) => Promise<AuditLogsResponse>;
	queryKey?: string;
}) {
	const [page, setPage] = useState(1);
	const [action, setAction] = useState("all");
	const [entityType, setEntityType] = useState("all");
	const [from, setFrom] = useState("");
	const [to, setTo] = useState("");

	const params = {
		page,
		limit: 20,
		action: action !== "all" ? action : undefined,
		entity_type: entityType !== "all" ? entityType : undefined,
		from: from || undefined,
		to: to || undefined,
	};

	const defaultFetch = (p: Record<string, unknown>) =>
		APIService.auditLogs.list(p) as Promise<AuditLogsResponse>;

	const { data, isLoading } = useQuery<AuditLogsResponse>({
		queryKey: [queryKey, params],
		queryFn: () => (fetchFn ?? defaultFetch)(params),
	});

	const hasFilters = action !== "all" || entityType !== "all" || !!from || !!to;

	function clearFilters() {
		setAction("all");
		setEntityType("all");
		setFrom("");
		setTo("");
		setPage(1);
	}

	function handleFilterChange(fn: () => void) {
		fn();
		setPage(1);
	}

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap items-center gap-2">
				<Filter className="w-3.5 h-3.5 text-ink-3 shrink-0" />

				<SelectRoot value={action} onValueChange={(v) => handleFilterChange(() => setAction(v))}>
					<SelectTrigger className="h-8 text-xs w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ACTION_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
						))}
					</SelectContent>
				</SelectRoot>

				<SelectRoot value={entityType} onValueChange={(v) => handleFilterChange(() => setEntityType(v))}>
					<SelectTrigger className="h-8 text-xs w-36">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ENTITY_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
						))}
					</SelectContent>
				</SelectRoot>

				<Input
					type="date"
					value={from}
					onChange={(e) => handleFilterChange(() => setFrom(e.target.value))}
					className="h-8 text-xs w-36"
					placeholder="From"
				/>
				<Input
					type="date"
					value={to}
					onChange={(e) => handleFilterChange(() => setTo(e.target.value))}
					className="h-8 text-xs w-36"
					placeholder="To"
				/>

				{hasFilters && (
					<Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 text-ink-3">
						<X className="w-3 h-3" /> Clear
					</Button>
				)}

				{data && (
					<span className="ml-auto text-xs text-ink-3">{data.total.toLocaleString()} events</span>
				)}
			</div>

			{/* Table */}
			<div className="rounded-xl border border-border/60 overflow-hidden glass">
				<div className="overflow-x-auto">
					<table className="w-full text-left">
						<thead>
							<tr className="border-b border-border/60 bg-surface/50">
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Time</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Actor</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Action</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">Entity</th>
								<th className="px-4 py-3 text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">ID</th>
								<th className="px-4 py-3 w-8" />
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-3">
										Loading…
									</td>
								</tr>
							)}
							{!isLoading && (!data || data.data.length === 0) && (
								<tr>
									<td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-3">
										No audit events found.
									</td>
								</tr>
							)}
							{data?.data.map((log) => (
								<AuditLogRow key={log.id} log={log} />
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
