"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TaskFormDialog } from "./task-form-dialog";
import { EditTicketDialog } from "./edit-ticket-dialog";
import { TimeOutDialog } from "@/components/dashboard/time-tracker/time-out-dialog";
import { useAppSelector } from "@/store/hooks";
import { formatDueDate, formatDurationMs } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ClipboardList, Plus, Trash2, CheckCheck, UserCog, X, SlidersHorizontal, Clock, CheckSquare, Search, Pencil, GitMerge } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { ROWS_PER_PAGE } from "@/configs/pagination.config";
import {
} from "@/components/ui/select";
import type { Task, TaskPage } from "./types";
import type { TimeEntry } from "@/components/dashboard/time-tracker/types";
import { EmployeePickerModal } from "@/components/dashboard/tickets/employee-picker-modal";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";
import { MergeTicketsDialog } from "./merge-tickets-dialog";

const STATUS_STYLES: Record<string, string> = {
	needs_approval: "bg-purple-500/15 text-purple-700 border-purple-500/20",
	pending:        "bg-accent text-ink-3 border-border/40",
	assigned:       "bg-blue-500/15 text-blue-700 border-blue-500/20",
	in_progress:    "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	on_hold:        "bg-orange-500/15 text-orange-700 border-orange-500/20",
	stale:          "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	completed:      "bg-green-500/15 text-green-700 border-green-500/20",
	closed:         "bg-accent text-ink-3/60 border-border/30",
	rejected:       "bg-zinc-500/15 text-zinc-500 border-zinc-500/20",
};

const STATUS_LABEL: Record<string, string> = {
	needs_approval: "Needs Approval",
	pending:        "Open",
	assigned:       "Assigned",
	in_progress:    "In Progress",
	on_hold:        "On Hold",
	stale:          "Stale",
	completed:      "Resolved",
	closed:         "Closed",
	rejected:       "Rejected",
};

const PRIORITY_STYLES: Record<string, string> = {
	low: "bg-accent text-ink-3 border-border/40",
	medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	high: "bg-red-500/15 text-red-700 border-red-500/20",
	critical: "bg-red-900/20 text-red-700 border-red-700/30",
};


const ALL_STATUSES = ["needs_approval", "pending", "assigned", "in_progress", "on_hold", "stale", "completed", "closed", "rejected", "overdue"];

export { TasksTable as TicketsTable };

export function TasksTable() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
	const statusFilter = searchParams.get("status") ?? "";
	const search = searchParams.get("search") ?? "";
	const queryClient = useQueryClient();

	const [searchInput, setSearchInput] = useState(search);
	const [pendingCompleteTask, setPendingCompleteTask] = useState<Task | null>(null);
	const [viewFilter, setViewFilter] = useState<"assigned" | "unassigned" | "all">("assigned");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [bulkMode, setBulkMode] = useState(false);
	const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
	const [mergeOpen, setMergeOpen] = useState(false);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [editingTask, setEditingTask] = useState<Task | null>(null);

	// Filter state — synced to URL params
	const typeFilter     = searchParams.get("type")      ?? "";
	const priorityFilter = searchParams.get("priority")  ?? "";
	const assigneeFilter = searchParams.get("assignee")  ?? "";
	const dueFilter      = searchParams.get("due")       ?? "";
	const dateFrom       = searchParams.get("date_from") ?? "";
	const dateTo         = searchParams.get("date_to")   ?? "";
	const resolvedFilter = statusFilter === "resolved";

	const activeFilterCount = [priorityFilter, dueFilter, statusFilter, search, dateFrom, dateTo]
		.filter(Boolean).length;

	const clearAllFilters = () => {
		const params = new URLSearchParams();
		params.set("page", "1");
		router.push(`?${params.toString()}`);
		setSearchInput("");
	};

	const updateDateRange = (from: string, to: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (from) params.set("date_from", from); else params.delete("date_from");
		if (to) params.set("date_to", to); else params.delete("date_to");
		params.set("page", "1");
		router.push(`?${params.toString()}`);
	};
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";

	const { data: orgSettings } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 0,
		enabled: !isAdmin,
	});
	const canMerge = isAdmin || (orgSettings?.employees_can_merge_tickets ?? false);

	const updateParam = (key: string, value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value) params.set(key, value);
		else params.delete(key);
		params.set("page", "1");
		router.push(`?${params.toString()}`);
	};

	const updateParams = (updates: Record<string, string>) => {
		const params = new URLSearchParams(searchParams.toString());
		Object.entries(updates).forEach(([key, value]) => {
			if (value) params.set(key, value);
			else params.delete(key);
		});
		params.set("page", "1");
		router.push(`?${params.toString()}`);
	};

	const goToPage = (p: number) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", String(p));
		router.push(`?${params.toString()}`);
	};
	const resetPage = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", "1");
		router.replace(`?${params.toString()}`);
	};

	const submitSearch = () => {
		updateParam("search", searchInput);
	};

	const { data: result, isLoading, isError } = useQuery<TaskPage>({
		queryKey: ["tasks", page, statusFilter, search, viewFilter, typeFilter, priorityFilter, assigneeFilter, dueFilter, dateFrom, dateTo],
		queryFn: () => APIService.tasks.list(
			page,
			ROWS_PER_PAGE,
			statusFilter || undefined,
			search || undefined,
			isAdmin ? undefined : viewFilter,
			{
				type:      typeFilter     || undefined,
				priority:  priorityFilter || undefined,
				assignee:  assigneeFilter || undefined,
				due:       dueFilter      || undefined,
				date_from: dateFrom       || undefined,
				date_to:   dateTo         || undefined,
			},
		),
	});

	// Track active timer so we can stop it when completing a task
	const { data: activeEntry } = useQuery<TimeEntry | null>({
		queryKey: ["time", "active"],
		queryFn: () => APIService.time.active(),
		staleTime: 0,
	});

	const invalidateAll = () =>
		queryClient.invalidateQueries({ queryKey: ["tasks"] });

	const { mutateAsync: createTask, isPending: isCreating } = useMutation({
		mutationFn: (data: {
			title: string;
			description?: string;
			priority?: string;
			due_date?: string;
			assigned_to?: string;
			ticket_type?: string;
			client_name?: string;
			estimated_hours?: number;
			billable_hours?: number;
			implementation_plan?: string;
			rollback_plan?: string;
		}) => APIService.tasks.create(data),
		onSuccess: () => { invalidateAll(); resetPage(); },
	});

const { mutateAsync: claimTask, isPending: isClaiming } = useMutation({
		mutationFn: (id: string) => APIService.tasks.claim(id),
		onSuccess: invalidateAll,
	});

	const { mutateAsync: startTask, isPending: isStarting } = useMutation({
		mutationFn: (id: string) => APIService.tasks.start(id),
		onSuccess: invalidateAll,
	});

	const { mutateAsync: startTimer, isPending: isStartingTimer } = useMutation({
		mutationFn: (data: { title?: string; ticket_id?: string }) => APIService.time.start(data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["time", "active"] }),
	});

	const { mutateAsync: stopTimer, isPending: isStopping } = useMutation({
		mutationFn: (data: { title?: string; description?: string }) =>
			APIService.time.stop(activeEntry!.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["time", "active"] });
			queryClient.invalidateQueries({ queryKey: ["time"] });
		},
	});

	const { mutateAsync: completeTask, isPending: isCompleting } = useMutation({
		mutationFn: (id: string) => APIService.tasks.complete(id),
		onSuccess: invalidateAll,
	});


	const { mutateAsync: deleteTask, isPending: isDeleting } = useMutation({
		mutationFn: (id: string) => APIService.tasks.remove(id),
		onSuccess: invalidateAll,
	});


	const handleDeleteTask = async (e: React.MouseEvent, id: string, title: string) => {
		e.stopPropagation();
		if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
		await deleteTask(id);
	};

	const { mutateAsync: bulkAction, isPending: isBulkPending } = useMutation({
		mutationFn: ({ action, ...payload }: { action: "assign" | "complete" | "delete" | "status" | "priority" | "due_date"; user_id?: string; status?: string; priority?: string; due_date?: string | null }) =>
			APIService.tasks.bulk(action, [...selectedIds], payload),
		onSuccess: () => {
			setSelectedIds(new Set());
			setBulkMode(false);
						setBulkAssignOpen(false);
			invalidateAll();
		},
	});

	const handleStart = async (task: Task) => {
		// If a timer is already running, stop it first so the new start doesn't 409
		if (activeEntry) {
			await stopTimer({ title: activeEntry.ticket?.title ?? activeEntry.title ?? undefined });
		}
		await Promise.all([
			startTask(task.id),
			startTimer({ title: task.title, ticket_id: task.id }),
		]);
	};

	// If there's an active timer, open the dialog so the user can add notes before stopping it.
	// If the timer was already stopped (e.g. from the header), complete the task immediately.
	const handleCompleteClick = async (task: Task) => {
		if (activeEntry) {
			setPendingCompleteTask(task);
		} else {
			await completeTask(task.id);
		}
	};

	const handleCompleteConfirm = async ({ title, description }: { title?: string; description?: string }) => {
		if (!pendingCompleteTask) return;
		await stopTimer({ title: title ?? pendingCompleteTask.title, description });
		await completeTask(pendingCompleteTask.id);
		setPendingCompleteTask(null);
	};

	if (isLoading) {
		return <TablePageSkeleton />;
	}

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<p className="text-sm text-ink-3">Failed to load tasks. Please try again.</p>
			</div>
		);
	}

	const list = result?.data ?? [];
	const totalPages = result?.totalPages ?? 1;

	const emptyStateCopy = isAdmin
		? "Create a ticket and optionally assign it to a team member."
		: viewFilter === "assigned"
		? "No tickets are assigned to you yet."
		: viewFilter === "unassigned"
		? "There are no unassigned tickets available to claim."
		: "No tickets found matching your filters.";

	return (
		<div className="space-y-3">
			{/* Toolbar */}
			<div className="space-y-2">
				{/* Row 1: search + filter toggle + actions */}
				<div className="flex items-center gap-2 flex-wrap">
					<input
						type="text"
						placeholder="Search employee…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submitSearch()}
						className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint w-48"
					/>
					<Button size="sm" className="h-8 w-8 p-0 bg-mint hover:bg-mint/90 text-ink" onClick={submitSearch} title="Search"><Search className="w-3.5 h-3.5" /></Button>

					{/* Filter toggle button */}
					<button
						type="button"
						onClick={() => setFiltersOpen((v) => !v)}
						className={cn(
							"relative h-8 w-8 flex items-center justify-center rounded-md border transition-colors",
							filtersOpen || activeFilterCount > 0
								? "border-mint/50 bg-mint/10 text-mint"
								: "border-border bg-background text-ink-3 hover:text-ink hover:border-border/80",
						)}
						title="Filters"
					>
						<SlidersHorizontal className="w-3.5 h-3.5" />
						{activeFilterCount > 0 && (
							<span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-mint text-[9px] font-bold text-black flex items-center justify-center leading-none">
								{activeFilterCount}
							</span>
						)}
					</button>

					{/* Overdue pill */}
					<button
						type="button"
						onClick={() => updateParams({
							due:    dueFilter === "overdue" ? "" : "overdue",
							status: dueFilter === "overdue" ? statusFilter : "",
						})}
						className={cn(
							"h-8 px-3 rounded-md border text-xs font-medium transition-colors",
							dueFilter === "overdue"
								? "bg-destructive/10 border-destructive/30 text-destructive"
								: "border-border bg-background text-ink-3 hover:text-ink hover:border-border/80",
						)}
					>
						Overdue
					</button>

					{/* Resolved pill */}
					<button
						type="button"
						onClick={() => updateParams({
							status: resolvedFilter ? "" : "resolved",
							due:    "",
						})}
						className={cn(
							"h-8 px-3 rounded-md border text-xs font-medium transition-colors",
							resolvedFilter
								? "bg-green-500/10 border-green-500/30 text-green-600"
								: "border-border bg-background text-ink-3 hover:text-ink hover:border-border/80",
						)}
					>
						Resolved
					</button>

					<div className="flex items-center gap-2 ml-auto">
						<p className="text-sm text-ink-3">{result?.total ?? 0} {(result?.total ?? 0) === 1 ? "ticket" : "tickets"}</p>
						<Button
							size="sm"
							variant={bulkMode ? "outline" : "ghost"}
							className={cn("h-8 text-xs gap-1.5", bulkMode ? "border-mint/40 text-mint" : "text-ink-3")}
							onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
						>
							<CheckSquare className="w-3.5 h-3.5" />
							{bulkMode ? "Exit Bulk" : "Bulk"}
						</Button>
						<TaskFormDialog
							isPending={isCreating}
							onSubmit={async (data) => { await createTask(data); }}
							trigger={<Button size="sm"><Plus className="w-4 h-4" />New ticket</Button>}
						/>
					</div>
				</div>

				{/* Filter row — shown when toggled */}
				{filtersOpen && (
					<div className="flex items-center gap-2 flex-wrap">
						{/* View toggle (employee only) */}
						{!isAdmin && (
							<Combobox
								className="w-36"
								options={[
									{ value: "assigned", label: "My Tickets" },
									{ value: "unassigned", label: "Unassigned" },
									{ value: "all", label: "All Tickets" },
								]}
								value={viewFilter}
								onChange={(v) => { setViewFilter(v as typeof viewFilter); resetPage(); }}
								placeholder="My Tickets"
							/>
						)}

						{/* Status */}
						<Combobox
							className="w-36"
							options={[
								{ value: "", label: "Active tickets" },
								...ALL_STATUSES.filter(s => !["completed","closed","rejected"].includes(s)).map((s) => ({ value: s, label: s === "overdue" ? "Overdue" : (STATUS_LABEL[s] ?? s) })),
							]}
							value={resolvedFilter ? "" : statusFilter}
							onChange={(v) => updateParam("status", v)}
							placeholder="Active tickets"
						/>

						{/* Priority */}
						<Combobox
							className="w-36"
							options={[
								{ value: "", label: "All priorities" },
								{ value: "low", label: "Low" },
								{ value: "medium", label: "Medium" },
								{ value: "high", label: "High" },
								{ value: "critical", label: "Critical" },
							]}
							value={priorityFilter}
							onChange={(v) => updateParam("priority", v)}
							placeholder="All priorities"
						/>

						{/* Date range */}
						<input
							type="date"
							value={dateFrom}
							max={dateTo || undefined}
							onChange={(e) => updateDateRange(e.target.value, dateTo)}
							className="h-8 rounded-md border border-border bg-background px-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-mint"
						/>
						<span className="text-xs text-ink-3">—</span>
						<input
							type="date"
							value={dateTo}
							min={dateFrom || undefined}
							onChange={(e) => updateDateRange(dateFrom, e.target.value)}
							className="h-8 rounded-md border border-border bg-background px-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-mint"
						/>

						{/* Clear filters */}
						{activeFilterCount > 0 && (
							<button
								type="button"
								onClick={clearAllFilters}
								className="flex items-center gap-1 h-8 px-2 text-xs text-ink-3 hover:text-destructive transition-colors"
							>
								<X className="w-3.5 h-3.5" />
								Clear {activeFilterCount > 1 ? `${activeFilterCount} filters` : "filter"}
							</button>
						)}
					</div>
				)}
			</div>

			{/* Inline bulk action bar */}
			{bulkMode && (
				<div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-mint/8 border border-mint/20">
					<span className="text-xs font-medium text-ink-2">
						{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select tickets to act on"}
					</span>
					<div className="flex items-center gap-2 ml-auto">
						{isAdmin && (
							<Button
								size="sm" variant="outline"
								className="h-7 text-xs gap-1.5"
								disabled={isBulkPending || selectedIds.size === 0}
								onClick={() => setBulkAssignOpen(true)}
							>
								<UserCog className="w-3.5 h-3.5" />
								Reassign
							</Button>
						)}
						{canMerge && (
							<Button
								size="sm" variant="outline"
								className="h-7 text-xs gap-1.5 text-mint border-mint/30 hover:bg-mint/10"
								disabled={isBulkPending || selectedIds.size < 2 || selectedIds.size > 5}
								title={selectedIds.size < 2 ? "Select 2–5 tickets to merge" : selectedIds.size > 5 ? "Maximum 5 tickets at once" : ""}
								onClick={() => setMergeOpen(true)}
							>
								<GitMerge className="w-3.5 h-3.5" />
								Merge
							</Button>
						)}
						<Button
							size="sm" variant="outline"
							className="h-7 text-xs gap-1.5 text-success-fg border-success/30 hover:bg-success/10"
							disabled={isBulkPending || selectedIds.size === 0}
							onClick={() => bulkAction({ action: "complete" })}
						>
							<CheckCheck className="w-3.5 h-3.5" />
							Complete
						</Button>
						{isAdmin && (
							<Button
								size="sm" variant="outline"
								className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
								disabled={isBulkPending || selectedIds.size === 0}
								onClick={() => bulkAction({ action: "delete" })}
							>
								<Trash2 className="w-3.5 h-3.5" />
								Delete
							</Button>
						)}
						{isAdmin && (
							<Combobox
								className="w-[120px]"
								options={[
									{ value: "", label: "Set status" },
									{ value: "open", label: "Open" },
									{ value: "in_progress", label: "In Progress" },
									{ value: "assigned", label: "Assigned" },
									{ value: "stale", label: "Stale" },
									{ value: "completed", label: "Completed" },
								]}
								value=""
								onChange={(v) => v && bulkAction({ action: "status", status: v })}
								placeholder="Set status"
								disabled={isBulkPending || selectedIds.size === 0}
							/>
						)}
						{isAdmin && (
							<Combobox
								className="w-[120px]"
								options={[
									{ value: "", label: "Set priority" },
									{ value: "low", label: "Low" },
									{ value: "medium", label: "Medium" },
									{ value: "high", label: "High" },
								]}
								value=""
								onChange={(v) => v && bulkAction({ action: "priority", priority: v })}
								placeholder="Set priority"
								disabled={isBulkPending || selectedIds.size === 0}
							/>
						)}
						<Button
							size="sm" variant="ghost"
							className="h-7 text-xs text-ink-3"
							onClick={() => { setSelectedIds(new Set()); setBulkMode(false); }}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* Empty state */}
			{list.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-xl bg-mint/15 flex items-center justify-center mb-4">
						<ClipboardList className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No tickets found</h3>
					<p className="text-sm text-ink-3 max-w-xs">{emptyStateCopy}</p>
				</div>
			)}

			{/* Table */}
			{list.length > 0 && (
				<div key={`${page}-${statusFilter}`} className="animate-fade-in space-y-3">
					<div className="rounded-lg border overflow-x-auto">
						<table className="w-full min-w-[640px] text-sm">
							<thead>
								<tr className="border-b bg-accent/30">
									<th className={cn("w-8 px-3 py-2", !bulkMode && "hidden")}>
										<input
											type="checkbox"
											checked={list.length > 0 && selectedIds.size === list.length}
											onChange={(e) => {
												if (e.target.checked) setSelectedIds(new Set(list.map((t: Task) => t.id)));
												else setSelectedIds(new Set());
											}}
											className="accent-mint cursor-pointer"
										/>
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
										Title
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">
										Assignee
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
										Priority
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
										Status
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">
										{resolvedFilter ? "Completed" : "Due"}
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden lg:table-cell">
										Created
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden lg:table-cell">
										Time Spent
									</th>
									<th className="px-4 py-2" />
								</tr>
							</thead>
							<tbody className="divide-y">
								{list.map((task: Task) => (
									<tr
										key={task.id}
										className={cn("hover:bg-accent/20 transition-colors cursor-pointer", selectedIds.has(task.id) && "bg-mint/5")}
										onClick={() => router.push(`/dashboard/tickets/${task.id}`)}
									>
										<td className={cn("w-8 px-3 py-2", !bulkMode && "hidden")} onClick={(e) => e.stopPropagation()}>
											<input
												type="checkbox"
												checked={selectedIds.has(task.id)}
												onChange={(e) => {
													const next = new Set(selectedIds);
														if (e.target.checked) next.add(task.id);
														else next.delete(task.id);
														setSelectedIds(next);
													}}
													className="accent-mint cursor-pointer"
												/>
											</td>
										<td className="px-4 py-2">
											<div className="flex items-center gap-1.5">
												<p className="text-xs font-medium text-ink truncate max-w-[200px]">
													{task.title}
												</p>
												{isAdmin && (task.pending_actions?.length ?? 0) > 0 && (
													<span title={`${task.pending_actions!.length} pending action${task.pending_actions!.length > 1 ? "s" : ""}`}>
														<Clock className="w-3 h-3 text-warning shrink-0" />
													</span>
												)}
											</div>
										</td>


										<td className="px-4 py-2 hidden md:table-cell">
											{task.assignee ? (
												<p className="text-xs text-ink truncate">
													{task.assignee.name ?? task.assignee.email}
												</p>
											) : (
												<span className="text-xs text-ink-3">Unassigned</span>
											)}
										</td>

										<td className="px-4 py-2 hidden sm:table-cell">
											{task.priority ? (
												<Badge
													variant="outline"
													className={cn("capitalize text-xs", PRIORITY_STYLES[task.priority])}
												>
													{task.priority}
												</Badge>
											) : (
												<span className="text-ink-3 text-xs">—</span>
											)}
										</td>

										<td className="px-4 py-2">
											<Badge
												variant="outline"
												className={cn("text-xs", STATUS_STYLES[task.status])}
											>
												{STATUS_LABEL[task.status] ?? task.status}
											</Badge>
										</td>

										<td className="px-4 py-2 hidden md:table-cell whitespace-nowrap">
											{resolvedFilter ? (
												task.completed_at ? (
													<span className="text-xs text-ink-3">{formatDueDate(task.completed_at)}</span>
												) : (
													<span className="text-ink-3 text-xs">—</span>
												)
											) : task.due_date ? (
												<div className="flex flex-col gap-0.5">
													<span className={cn("text-xs whitespace-nowrap", task.status !== "completed" && new Date(task.due_date) < new Date() ? "text-destructive font-medium" : "text-ink-3")}>
														{formatDueDate(task.due_date)}
													</span>
													{task.status !== "completed" && new Date(task.due_date) < new Date() && (
														<Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20 w-fit">
															Overdue
														</Badge>
													)}
												</div>
											) : (
												<span className="text-ink-3 text-xs">—</span>
											)}
										</td>

										<td className="px-4 py-2 hidden lg:table-cell whitespace-nowrap">
											<span className="text-xs text-ink-3">{formatDueDate(task.created_at)}</span>
										</td>

										<td className="px-4 py-2 hidden lg:table-cell">
											<span className="text-xs text-ink-3">
												{task.total_time_ms && task.total_time_ms > 0 ? formatDurationMs(task.total_time_ms) : "—"}
											</span>
										</td>

										<td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center justify-end gap-1">
												{isAdmin && (
													<>
														<Button
															variant="ghost"
															size="icon-sm"
															title="Edit"
															onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
														>
															<Pencil className="w-3.5 h-3.5" />
														</Button>
														<Button
															variant="ghost"
															size="icon-sm"
															title="Delete"
															className="text-destructive hover:text-destructive"
															disabled={isDeleting}
															onClick={(e) => handleDeleteTask(e, task.id, task.title)}
														>
															<Trash2 className="w-3.5 h-3.5" />
														</Button>
													</>
												)}
												{!isAdmin && task.status === "pending" && (
													<Button
														size="sm"
														variant="outline"
														className="h-7 text-xs"
														disabled={isClaiming}
														onClick={() => claimTask(task.id)}
													>
														Claim
													</Button>
												)}
												{!isAdmin &&
													task.status === "assigned" &&
													task.user_id === user?.id && (
														<Button
															size="sm"
															variant="outline"
															className="h-7 text-xs"
															disabled={isStarting || isStartingTimer}
															onClick={() => handleStart(task)}
														>
															Start
														</Button>
													)}
												{!isAdmin &&
													task.status === "in_progress" &&
													task.user_id === user?.id && (
														<Button
															size="sm"
															className="h-7 text-xs bg-success hover:bg-success/90 text-success-foreground"
															disabled={isCompleting || isStopping}
															onClick={() => handleCompleteClick(task)}
														>
															Complete
														</Button>
													)}

											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<Pagination
						page={page}
						totalPages={totalPages}
						onPrev={() => goToPage(Math.max(1, page - 1))}
						onNext={() => goToPage(Math.min(totalPages, page + 1))}
						onGoTo={goToPage}
					/>
				</div>
			)}

			{editingTask && (
				<EditTicketDialog
					ticket={editingTask}
					open={!!editingTask}
					onOpenChange={(v) => { if (!v) setEditingTask(null); }}
				/>
			)}

			{/* Complete task dialog — stops timer + marks task done */}
			<TimeOutDialog
				open={!!pendingCompleteTask}
				isTask
				defaultTitle={pendingCompleteTask?.title}
				isPending={isCompleting || isStopping}
				onConfirm={handleCompleteConfirm}
				onCancel={() => setPendingCompleteTask(null)}
			/>

{/* Bulk assign dialog */}
			{isAdmin && (
				<EmployeePickerModal
					open={bulkAssignOpen}
					title={`Reassign ${selectedIds.size} ticket${selectedIds.size !== 1 ? "s" : ""}`}
					isPending={isBulkPending}
					confirmLabel="Confirm"
					onConfirm={(eid) => bulkAction({ action: "assign", user_id: eid })}
					onClose={() => setBulkAssignOpen(false)}
				/>
			)}

			{/* Merge tickets dialog */}
			{canMerge && mergeOpen && (
				<MergeTicketsDialog
					open={mergeOpen}
					onOpenChange={setMergeOpen}
					tickets={list.filter((t: Task) => selectedIds.has(t.id))}
					onSuccess={() => { setSelectedIds(new Set()); setBulkMode(false); }}
				/>
			)}
		</div>
	);
}
