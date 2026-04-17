"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TaskFormDialog } from "./task-form-dialog";
import { TaskDeleteDialog } from "./task-delete-dialog";
import { TimeOutDialog } from "@/components/dashboard/time-tracker/time-out-dialog";
import { useAppSelector } from "@/store/hooks";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ClipboardList, Plus, Trash2, CheckCheck, UserCog } from "lucide-react";
import { ROWS_PER_PAGE } from "@/configs/pagination.config";
import {
	SelectRoot,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import type { Task, TaskPage } from "./types";
import type { TimeEntry } from "@/components/dashboard/time-tracker/types";

const STATUS_STYLES: Record<string, string> = {
	pending: "bg-accent text-ink-3 border-border/40",
	assigned: "bg-blue-500/15 text-blue-700 border-blue-500/20",
	in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	completed: "bg-green-500/15 text-green-700 border-green-500/20",
};

const STATUS_LABEL: Record<string, string> = {
	pending: "Unassigned",
	assigned: "Assigned",
	in_progress: "In Progress",
	completed: "Completed",
};

const PRIORITY_STYLES: Record<string, string> = {
	low: "bg-accent text-ink-3 border-border/40",
	medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	high: "bg-red-500/15 text-red-700 border-red-500/20",
};

const ALL_STATUSES = ["pending", "assigned", "in_progress", "completed", "overdue"];

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
	const [bulkAssignTo, setBulkAssignTo] = useState("");
	const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";

	const updateParam = (key: string, value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value) params.set(key, value);
		else params.delete(key);
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
		queryKey: ["tasks", page, statusFilter, search, viewFilter],
		queryFn: () => APIService.tasks.list(
			page,
			ROWS_PER_PAGE,
			statusFilter || undefined,
			search || undefined,
			isAdmin ? undefined : viewFilter,
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
		}) => APIService.tasks.create(data),
		onSuccess: () => { invalidateAll(); resetPage(); },
	});

	const { mutateAsync: removeTask, isPending: isDeleting } = useMutation({
		mutationFn: (id: string) => APIService.tasks.remove(id),
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
		mutationFn: (data: { title?: string }) => APIService.time.start(data),
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

	// Employees for bulk-assign (admin only, loaded lazily)
	const { data: employeesResult } = useQuery<{ data: { id: string; name: string | null; email: string }[] }>({
		queryKey: ["employees-list"],
		queryFn: () => APIService.employees.list(1, 50),
		enabled: isAdmin && bulkAssignOpen,
	});
	const employees = employeesResult?.data ?? [];

	const { mutateAsync: bulkAction, isPending: isBulkPending } = useMutation({
		mutationFn: ({ action, user_id }: { action: "assign" | "complete" | "delete"; user_id?: string }) =>
			APIService.tasks.bulk(action, [...selectedIds], user_id),
		onSuccess: () => {
			setSelectedIds(new Set());
			setBulkAssignTo("");
			setBulkAssignOpen(false);
			invalidateAll();
		},
	});

	const handleStart = async (task: Task) => {
		await Promise.all([
			startTask(task.id),
			startTimer({ title: task.title }),
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
		return (
			<div className="flex items-center justify-center py-24">
				<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
			</div>
		);
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
		? "Create a task and optionally assign it to a team member."
		: viewFilter === "assigned"
		? "No tasks are assigned to you yet."
		: viewFilter === "unassigned"
		? "There are no unassigned tasks available to claim."
		: "No tasks found matching your filters.";

	return (
		<div className="space-y-3">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2 justify-between">
				<div className="flex items-center gap-2 flex-wrap">
					<input
						type="text"
						placeholder="Search tasks…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submitSearch()}
						className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint w-48"
					/>
					<Button size="sm" variant="outline" className="h-8" onClick={submitSearch}>
						Search
					</Button>
					{!isAdmin && (
						<select
							value={viewFilter}
							onChange={(e) => {
								setViewFilter(e.target.value as typeof viewFilter);
								resetPage();
							}}
							className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
						>
							<option value="assigned">My Tasks</option>
							<option value="unassigned">Unassigned</option>
							<option value="all">All Tasks</option>
						</select>
					)}
					{isAdmin && (
						<select
							value={statusFilter}
							onChange={(e) => updateParam("status", e.target.value)}
							className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
						>
							<option value="">All statuses</option>
							{ALL_STATUSES.map((s) => (
								<option key={s} value={s}>
									{s === "overdue" ? "Overdue" : (STATUS_LABEL[s] ?? s)}
								</option>
							))}
						</select>
					)}
				</div>

				<div className="flex items-center gap-2">
					<p className="text-sm text-ink-3">
						{list.length} {list.length === 1 ? "task" : "tasks"}
					</p>
					{isAdmin && (
						<TaskFormDialog
							isPending={isCreating}
							onSubmit={async (data) => { await createTask(data); }}
							trigger={
								<Button size="sm">
									<Plus className="w-4 h-4" />
									New task
								</Button>
							}
						/>
					)}
				</div>
			</div>

			{/* Empty state */}
			{list.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-xl bg-mint/15 flex items-center justify-center mb-4">
						<ClipboardList className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No tasks found</h3>
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
									{isAdmin && (
										<th className="w-8 px-3 py-2">
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
									)}
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
										Due
									</th>
									<th className="px-4 py-2" />
								</tr>
							</thead>
							<tbody className="divide-y">
								{list.map((task: Task) => (
									<tr
										key={task.id}
										className={cn("hover:bg-accent/20 transition-colors cursor-pointer", selectedIds.has(task.id) && "bg-mint/5")}
										onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
									>
										{isAdmin && (
											<td className="w-8 px-3 py-2" onClick={(e) => e.stopPropagation()}>
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
										)}
										<td className="px-4 py-2">
											<p className="font-medium text-ink truncate max-w-[200px]">
												{task.title}
											</p>
											{task.description && (
												<p className="text-xs text-ink-3 truncate max-w-[200px]">
													{task.description}
												</p>
											)}
										</td>

										<td className="px-4 py-2 hidden md:table-cell">
											{task.assignee ? (
												<p className="text-ink truncate text-sm">
													{task.assignee.name ?? task.assignee.email}
												</p>
											) : (
												<span className="text-ink-3 text-xs">Unassigned</span>
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

										<td className="px-4 py-2 hidden md:table-cell">
											{task.due_date ? (
												<div className="flex flex-col gap-0.5">
													<span className={cn("text-xs", task.status !== "completed" && new Date(task.due_date) < new Date() ? "text-red-600 font-medium" : "text-ink-3")}>
														{formatDate(task.due_date)}
													</span>
													{task.status !== "completed" && new Date(task.due_date) < new Date() && (
														<Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-500/10 text-red-600 border-red-500/20 w-fit">
															Overdue
														</Badge>
													)}
												</div>
											) : (
												<span className="text-ink-3 text-xs">—</span>
											)}
										</td>

										<td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center justify-end gap-1">
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
															className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
															disabled={isCompleting || isStopping}
															onClick={() => handleCompleteClick(task)}
														>
															Complete
														</Button>
													)}

												{isAdmin && (
													<TaskDeleteDialog
														task={task}
														isPending={isDeleting}
														onConfirm={async () => { await removeTask(task.id); }}
														trigger={
															<Button
																variant="ghost"
																size="sm"
																className="h-7 text-xs text-destructive hover:text-destructive"
															>
																Delete
															</Button>
														}
													/>
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

			{/* Complete task dialog — stops timer + marks task done */}
			<TimeOutDialog
				open={!!pendingCompleteTask}
				isTask
				defaultTitle={pendingCompleteTask?.title}
				isPending={isCompleting || isStopping}
				onConfirm={handleCompleteConfirm}
				onCancel={() => setPendingCompleteTask(null)}
			/>

			{/* Bulk action bar */}
			{isAdmin && selectedIds.size > 0 && (
				<div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border bg-background shadow-lg px-4 py-2.5 animate-fade-in">
					<span className="text-xs font-medium text-ink-3 mr-1">
						{selectedIds.size} selected
					</span>
					<Button
						size="sm"
						variant="outline"
						className="h-7 text-xs gap-1.5"
						disabled={isBulkPending}
						onClick={() => setBulkAssignOpen(true)}
					>
						<UserCog className="w-3.5 h-3.5" />
						Reassign
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="h-7 text-xs gap-1.5 text-green-700"
						disabled={isBulkPending}
						onClick={() => bulkAction({ action: "complete" })}
					>
						<CheckCheck className="w-3.5 h-3.5" />
						Complete
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive"
						disabled={isBulkPending}
						onClick={() => bulkAction({ action: "delete" })}
					>
						<Trash2 className="w-3.5 h-3.5" />
						Delete
					</Button>
					<Button
						size="sm"
						variant="ghost"
						className="h-7 text-xs text-ink-3"
						onClick={() => setSelectedIds(new Set())}
					>
						Cancel
					</Button>
				</div>
			)}

			{/* Bulk assign dialog */}
			{isAdmin && (
				<>
					{bulkAssignOpen && (
						<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
							<div className="bg-background rounded-xl border shadow-xl p-5 w-72 space-y-4">
								<h3 className="text-sm font-semibold text-ink">Reassign {selectedIds.size} task{selectedIds.size !== 1 ? "s" : ""}</h3>
								<SelectRoot value={bulkAssignTo} onValueChange={setBulkAssignTo}>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select employee…" />
									</SelectTrigger>
									<SelectContent>
										{employees.map((e) => (
											<SelectItem key={e.id} value={e.id}>
												{e.name ?? e.email}
											</SelectItem>
										))}
									</SelectContent>
								</SelectRoot>
								<div className="flex justify-end gap-2">
									<Button size="sm" variant="outline" onClick={() => { setBulkAssignOpen(false); setBulkAssignTo(""); }}>
										Cancel
									</Button>
									<Button
										size="sm"
										disabled={!bulkAssignTo || isBulkPending}
										isLoading={isBulkPending}
										onClick={() => bulkAction({ action: "assign", user_id: bulkAssignTo })}
									>
										Confirm
									</Button>
								</div>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
