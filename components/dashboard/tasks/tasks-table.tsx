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
import { useAppSelector } from "@/store/hooks";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ClipboardList, Plus } from "lucide-react";
import { ROWS_PER_PAGE } from "@/configs/pagination.config";
import type { Task, TaskPage } from "./types";

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

const ALL_STATUSES = ["pending", "assigned", "in_progress", "completed"];

export function TasksTable() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
	const statusFilter = searchParams.get("status") ?? "";
	const search = searchParams.get("search") ?? "";
	const queryClient = useQueryClient();

	const [searchInput, setSearchInput] = useState(search);
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
		queryKey: ["tasks", page, statusFilter, search],
		queryFn: () => APIService.tasks.list(page, ROWS_PER_PAGE, statusFilter || undefined, search || undefined),
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

	const { mutateAsync: completeTask, isPending: isCompleting } = useMutation({
		mutationFn: (id: string) => APIService.tasks.complete(id),
		onSuccess: invalidateAll,
	});

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
					<select
						value={statusFilter}
						onChange={(e) => updateParam("status", e.target.value)}
						className="h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
					>
						<option value="">All statuses</option>
						{ALL_STATUSES.map((s) => (
							<option key={s} value={s}>
								{STATUS_LABEL[s] ?? s}
							</option>
						))}
					</select>
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
					<p className="text-sm text-ink-3 max-w-xs">
						{isAdmin
							? "Create a task and optionally assign it to a team member."
							: "Tasks assigned to you will appear here. You can also claim unassigned tasks."}
					</p>
				</div>
			)}

			{/* Table */}
			{list.length > 0 && (
				<div key={`${page}-${statusFilter}`} className="animate-fade-in space-y-3">
					<div className="rounded-lg border overflow-x-auto">
						<table className="w-full min-w-[640px] text-sm">
							<thead>
								<tr className="border-b bg-accent/30">
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
										className="hover:bg-accent/20 transition-colors cursor-pointer"
										onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
									>
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

										<td className="px-4 py-2 text-ink-3 text-xs hidden md:table-cell">
											{task.due_date ? formatDate(task.due_date) : "—"}
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
															disabled={isStarting}
															onClick={() => startTask(task.id)}
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
															disabled={isCompleting}
															onClick={() => completeTask(task.id)}
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
		</div>
	);
}
