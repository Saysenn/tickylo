"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeDeleteDialog } from "./employee-delete-dialog";
import { Pagination } from "@/components/ui/pagination";
import { UserPlus, Pencil, Trash2, Users, Search, CheckSquare } from "lucide-react";
import {
	SelectRoot,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { formatInitials, formatDate } from "@/lib/utils/format";
import type { Employee } from "./types";
import { ROWS_PER_PAGE } from "@/configs/pagination.config";
import { useAppSelector } from "@/store/hooks";

interface EmployeePage {
	data: Employee[];
	page: number;
	totalPages: number;
}

export function EmployeesTable() {
	const currentUserId = useAppSelector((s) => s.auth.user?.id);
	const router = useRouter();
	const searchParams = useSearchParams();
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
	const queryClient = useQueryClient();
	const searchParam = searchParams.get("search") ?? "";
	const [searchInput, setSearchInput] = useState(searchParam);
	const [bulkMode, setBulkMode] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
		const params = new URLSearchParams(searchParams.toString());
		if (searchInput.trim()) params.set("search", searchInput.trim());
		else params.delete("search");
		params.set("page", "1");
		router.push(`?${params.toString()}`);
	};

	const {
		data: result,
		isLoading,
		isError,
	} = useQuery<EmployeePage>({
		queryKey: ["employees", page, searchParam],
		queryFn: () => APIService.employees.list(page, ROWS_PER_PAGE, searchParam || undefined),
	});

	const invalidateAll = () =>
		queryClient.invalidateQueries({ queryKey: ["employees"] });
	const invalidateCurrent = () =>
		queryClient.invalidateQueries({ queryKey: ["employees", page] });

	const { mutateAsync: createEmployee, isPending: isCreating } = useMutation({
		mutationFn: (data: {
			name: string;
			email: string;
			password: string;
			role: string;
		}) => APIService.employees.create(data),
		onSuccess: () => {
			invalidateAll();
			resetPage();
		},
	});

	const { mutateAsync: updateEmployee, isPending: isUpdating } = useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: { name?: string; role?: string };
		}) => APIService.employees.update(id, data),
		onSuccess: invalidateCurrent,
	});

	const { mutateAsync: deleteEmployee, isPending: isDeleting } = useMutation({
		mutationFn: (id: string) => APIService.employees.remove(id),
		onSuccess: () => {
			invalidateAll();
			resetPage();
		},
	});

	const { mutateAsync: bulkAction, isPending: isBulkPending } = useMutation({
		mutationFn: ({ action, role }: { action: "delete" | "change_role"; role?: string }) =>
			APIService.employees.bulk(action, [...selectedIds], role),
		onSuccess: () => {
			setSelectedIds(new Set());
			setBulkMode(false);
			invalidateAll();
			resetPage();
		},
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
				<p className="text-sm text-ink-3">
					Failed to load employees. Please try again.
				</p>
			</div>
		);
	}

	const list = result?.data ?? [];
	const totalPages = result?.totalPages ?? 1;

	return (
		<div className="space-y-4">
			{/* Header row */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<input
						type="text"
						placeholder="Search employee…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submitSearch()}
						className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint w-44"
					/>
					<Button size="sm" className="h-8 w-8 p-0 bg-mint hover:bg-mint/90 text-ink" onClick={submitSearch} title="Search"><Search className="w-3.5 h-3.5" /></Button>
					<p className="text-sm text-ink-3 whitespace-nowrap">
						{list.length} {list.length === 1 ? "member" : "members"}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						variant={bulkMode ? "outline" : "ghost"}
						className={cn("h-8 text-xs gap-1.5", bulkMode ? "border-mint/40 text-mint" : "text-ink-3")}
						onClick={() => { setBulkMode((v) => !v); setSelectedIds(new Set()); }}
					>
						<CheckSquare className="w-3.5 h-3.5" />
						{bulkMode ? "Exit Bulk" : "Bulk"}
					</Button>
					<EmployeeFormDialog
						mode="create"
						isPending={isCreating}
						onSubmit={async (data) => {
							await createEmployee(
								data as {
									name: string;
									email: string;
									password: string;
									role: string;
								},
							);
						}}
						trigger={
							<Button size="sm">
								<UserPlus className="w-4 h-4" />
								Add employee
							</Button>
						}
					/>
				</div>
			</div>

			{/* Empty state */}
			{list.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-xl bg-mint/15 flex items-center justify-center mb-4">
						<Users className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No employees yet</h3>
					<p className="text-sm text-ink-3 max-w-xs">
						Add your first team member to get started.
					</p>
				</div>
			)}

			{/* Bulk action bar */}
			{bulkMode && (
				<div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-mint/8 border border-mint/20">
					<span className="text-xs font-medium text-ink-2">
						{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select employees to act on"}
					</span>
					<div className="flex items-center gap-2 ml-auto">
						<SelectRoot
							onValueChange={(v) => bulkAction({ action: "change_role", role: v })}
							disabled={isBulkPending || selectedIds.size === 0}
						>
							<SelectTrigger className="h-7 text-xs w-[130px]">
								<SelectValue placeholder="Change role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="employee">Set Employee</SelectItem>
								<SelectItem value="admin">Set Admin</SelectItem>
							</SelectContent>
						</SelectRoot>
						<Button
							size="sm" variant="outline"
							className="h-7 text-xs gap-1.5 text-destructive border-red-500/30 hover:bg-red-500/10 hover:text-destructive"
							disabled={isBulkPending || selectedIds.size === 0}
							onClick={() => bulkAction({ action: "delete" })}
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</Button>
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

			{/* Table */}
			{list.length > 0 && (
				<div key={page} className="animate-fade-in space-y-4">
					<div className="rounded-lg border overflow-x-auto">
						<table className="w-full min-w-[600px] text-sm">
							<thead>
								<tr className="border-b bg-accent/30">
									<th className={cn("w-8 px-3 py-2", !bulkMode && "hidden")}>
										<input
											type="checkbox"
											className="rounded border-border accent-mint"
											checked={list.length > 0 && selectedIds.size === list.length}
											onChange={(e) => setSelectedIds(e.target.checked ? new Set(list.map((emp) => emp.id)) : new Set())}
										/>
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
										Member
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
										Role
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">
										Joined
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">
										Last seen
									</th>
									<th className="px-4 py-2" />
								</tr>
							</thead>
							<tbody className="divide-y">
								{list.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-4 py-8 text-center text-xs text-ink-3">
											No employees match your search.
										</td>
									</tr>
								) : list.map((employee: Employee) => (
									<tr
										key={employee.id}
										className={cn("hover:bg-accent/20 transition-colors cursor-pointer", selectedIds.has(employee.id) && "bg-mint/5")}
										onClick={() => router.push(`/dashboard/employees/${employee.id}`)}
									>
										<td className={cn("w-8 px-3 py-2", !bulkMode && "hidden")} onClick={(e) => e.stopPropagation()}>
											<input
												type="checkbox"
												className="rounded border-border accent-mint"
												checked={selectedIds.has(employee.id)}
												onChange={(e) => {
													const next = new Set(selectedIds);
													e.target.checked ? next.add(employee.id) : next.delete(employee.id);
													setSelectedIds(next);
												}}
											/>
										</td>
										{/* Avatar + name + email */}
										<td className="px-4 py-2">
											<div className="flex items-center gap-3">
												<Avatar className="w-8 h-8 shrink-0">
													<AvatarImage src={employee.avatar_url ?? undefined} />
													<AvatarFallback className="text-xs bg-mint/15 text-ink-2">
														{formatInitials(employee.name, employee.email)}
													</AvatarFallback>
												</Avatar>
												<div className="min-w-0">
													<p className="text-xs font-medium text-ink truncate">
														{employee.name ?? "—"}
														{employee.id === currentUserId && (
															<span className="ml-1.5 text-[10px] font-normal text-ink-3">(You)</span>
														)}
													</p>
													<p className="text-xs text-ink-3 truncate">
														{employee.email}
													</p>
												</div>
											</div>
										</td>

										{/* Role badge */}
										<td className="px-4 py-2 hidden sm:table-cell">
											<Badge
												variant="outline"
												className={cn(
													"capitalize",
													employee.role === "admin"
														? "bg-mint/15 text-ink-2 border-mint/20"
														: "bg-accent text-ink-3 border-border/40",
												)}
											>
												{employee.role}
											</Badge>
										</td>

										{/* Joined */}
										<td className="px-4 py-2 text-ink-3 hidden md:table-cell">
											{formatDate(employee.created_at)}
										</td>

										{/* Last sign in */}
										<td className="px-4 py-2 text-ink-3 hidden md:table-cell">
											{formatDate(employee.last_sign_in_at)}
										</td>

										{/* Actions */}
										<td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center justify-end gap-1">
												<EmployeeFormDialog
													mode="edit"
													employee={employee}
													isPending={isUpdating}
													onSubmit={async (data) => {
														await updateEmployee({ id: employee.id, data });
													}}
													trigger={
														<Button variant="ghost" size="icon-sm" title="Edit">
															<Pencil className="w-3.5 h-3.5" />
														</Button>
													}
												/>
												<EmployeeDeleteDialog
													employee={employee}
													isPending={isDeleting}
													onConfirm={async () => {
														await deleteEmployee(employee.id);
													}}
													trigger={
														<Button
															variant="ghost"
															size="icon-sm"
															title="Delete"
															className="text-destructive hover:text-destructive"
														>
															<Trash2 className="w-3.5 h-3.5" />
														</Button>
													}
												/>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{/* Pagination */}
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
