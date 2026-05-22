"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { EmployeeDeleteDialog } from "./employee-delete-dialog";
import { Pagination } from "@/components/ui/pagination";
import { UserPlus, Pencil, Trash2, Users, Search, CheckSquare, SlidersHorizontal, X } from "lucide-react";
import {
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { formatInitials, formatDate } from "@/lib/utils/format";
import type { Employee } from "./types";
import { ROWS_PER_PAGE } from "@/configs/pagination.config";
import { useAppSelector } from "@/store/hooks";

interface EmployeePage {
	data: Employee[];
	page: number;
	total: number;
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
	const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
	const [roleFilter, setRoleFilter] = useState<"managers" | undefined>(undefined);
	const [filterVisible, setFilterVisible] = useState(false);

	const { data: orgSettings } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});
	const departmentsEnabled = orgSettings?.departments_enabled ?? false;

	const { data: deptData } = useQuery({
		queryKey: ["departments"],
		queryFn: () => APIService.departments.list(),
		enabled: departmentsEnabled && (filterVisible || bulkMode),
		staleTime: 30_000,
	});
	const departments = deptData?.data ?? [];

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
		queryKey: ["employees", page, searchParam, departmentFilter, roleFilter],
		queryFn: () => APIService.employees.list(page, ROWS_PER_PAGE, searchParam || undefined, departmentFilter, roleFilter),
	});

	const invalidateAll = () => queryClient.invalidateQueries({ queryKey: ["employees"] });
	const invalidateCurrent = () => queryClient.invalidateQueries({ queryKey: ["employees", page] });

	const { mutateAsync: createEmployee, isPending: isCreating } = useMutation({
		mutationFn: (data: { name: string; email: string; password: string; role: string }) =>
			APIService.employees.create(data),
		onSuccess: () => { invalidateAll(); resetPage(); },
	});

	const { mutateAsync: updateEmployee, isPending: isUpdating } = useMutation({
		mutationFn: ({ id, data }: { id: string; data: { name?: string; role?: string } }) =>
			APIService.employees.update(id, data),
		onSuccess: invalidateCurrent,
	});

	const { mutateAsync: deleteEmployee, isPending: isDeleting } = useMutation({
		mutationFn: (id: string) => APIService.employees.remove(id),
		onSuccess: () => { invalidateAll(); resetPage(); },
	});

	const { mutateAsync: bulkAction, isPending: isBulkPending } = useMutation({
		mutationFn: ({
			action,
			role,
			department_id,
		}: {
			action: "delete" | "change_role" | "assign_department" | "remove_department";
			role?: string;
			department_id?: string | null;
		}) => APIService.employees.bulk(action, [...selectedIds], role, department_id),
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
				<p className="text-sm text-ink-3">Failed to load employees. Please try again.</p>
			</div>
		);
	}

	const list = result?.data ?? [];
	const total = result?.total ?? 0;
	const totalPages = result?.totalPages ?? 1;
	const hasActiveFilters = !!(departmentFilter || roleFilter);

	const colCount =
		4 +
		1 +
		(bulkMode ? 1 : 0) +
		(departmentsEnabled ? 1 : 0);

	const clearFilters = () => { setDepartmentFilter(undefined); setRoleFilter(undefined); };

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
					<Button size="sm" className="h-8 w-8 p-0 bg-mint hover:bg-mint/90 text-ink" onClick={submitSearch} title="Search">
						<Search className="w-3.5 h-3.5" />
					</Button>

					{/* Filter toggle — only when departments enabled */}
					{departmentsEnabled && (
						<Button
							size="sm"
							variant="outline"
							className={cn(
								"h-8 w-8 p-0 relative",
								(filterVisible || hasActiveFilters) && "border-mint/50 text-mint bg-mint/5",
							)}
							title="Filter"
							onClick={() => setFilterVisible((v) => !v)}
						>
							<SlidersHorizontal className="w-3.5 h-3.5" />
							{hasActiveFilters && (
								<span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-mint" />
							)}
						</Button>
					)}

					<p className="text-sm text-ink-3 whitespace-nowrap">
						{total} {total === 1 ? "member" : "members"}
						{hasActiveFilters && <span className="text-mint"> (filtered)</span>}
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
							await createEmployee(data as { name: string; email: string; password: string; role: string });
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

			{/* Filter row — shown when filter icon is toggled */}
			{departmentsEnabled && filterVisible && (
				<div className="flex flex-wrap items-center gap-2">
					<Combobox
						options={[
							{ value: "__all__", label: "All departments" },
							...departments.map((d: any) => ({ value: d.id, label: d.name })),
						]}
						value={departmentFilter ?? "__all__"}
						onChange={(v) => setDepartmentFilter(v === "__all__" ? undefined : v)}
						placeholder="All departments"
						searchPlaceholder="Search departments…"
						className="w-[190px] h-8 text-sm"
					/>
					<Combobox
						className="w-[160px]"
						options={[
							{ value: "__all__", label: "All employees" },
							{ value: "managers", label: "Managers only" },
						]}
						value={roleFilter ?? "__all__"}
						onChange={(v) => setRoleFilter(v === "__all__" ? undefined : "managers")}
					/>
					{hasActiveFilters && (
						<Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-ink-3" onClick={clearFilters}>
							<X className="w-3.5 h-3.5" />
							Clear
						</Button>
					)}
				</div>
			)}

			{/* Empty state */}
			{list.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-xl bg-mint/15 flex items-center justify-center mb-4">
						<Users className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">
						{hasActiveFilters ? "No matches" : "No employees yet"}
					</h3>
					<p className="text-sm text-ink-3 max-w-xs">
						{hasActiveFilters ? "Try adjusting your filters." : "Add your first team member to get started."}
					</p>
				</div>
			)}

			{/* Bulk action bar */}
			{bulkMode && (
				<div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-mint/8 border border-mint/20">
					<span className="text-xs font-medium text-ink-2">
						{selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select employees to act on"}
					</span>
					<div className="flex items-center gap-2 ml-auto flex-wrap">
						<Combobox
							className="w-[130px]"
							options={[
								{ value: "", label: "Change role" },
								{ value: "employee", label: "Set Employee" },
								{ value: "manager", label: "Set Manager" },
								{ value: "admin", label: "Set Admin" },
							]}
							value=""
							onChange={(v) => v && bulkAction({ action: "change_role", role: v })}
							placeholder="Change role"
							disabled={isBulkPending || selectedIds.size === 0}
						/>
						{departmentsEnabled && (
							<Combobox
								options={[
									{ value: "__assign__", label: "Assign to dept…", disabled: true },
									...departments.map((d: any) => ({ value: d.id, label: d.name })),
								]}
								value=""
								onChange={(deptId) => {
									if (deptId) bulkAction({ action: "assign_department", department_id: deptId });
								}}
								placeholder="Assign dept…"
								searchPlaceholder="Search departments…"
								emptyText="No departments."
								className="h-7 text-xs w-[140px]"
								disabled={isBulkPending || selectedIds.size === 0 || departments.length === 0}
							/>
						)}
						{departmentsEnabled && (
							<Button
								size="sm" variant="outline"
								className="h-7 text-xs gap-1.5"
								disabled={isBulkPending || selectedIds.size === 0}
								onClick={() => bulkAction({ action: "remove_department" })}
							>
								<X className="w-3.5 h-3.5" />
								Remove dept
							</Button>
						)}
						<Button
							size="sm" variant="outline"
							className="h-7 text-xs gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
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
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">Member</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">Role</th>
									{departmentsEnabled && (
										<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden lg:table-cell">Department</th>
									)}
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Joined</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden md:table-cell">Last seen</th>
									<th className="px-4 py-2" />
								</tr>
							</thead>
							<tbody className="divide-y">
								{list.length === 0 ? (
									<tr>
										<td colSpan={colCount} className="px-4 py-8 text-center text-xs text-ink-3">
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
													<p className="text-xs text-ink-3 truncate">{employee.email}</p>
												</div>
											</div>
										</td>

										<td className="px-4 py-2 hidden sm:table-cell">
											<Badge
												variant="outline"
												className={cn(
													"capitalize",
													employee.role === "admin"
														? "bg-mint/15 text-ink-2 border-mint/20"
														: employee.role === "manager"
														? "bg-blue-500/15 text-blue-700 border-blue-500/20"
														: "bg-accent text-ink-3 border-border/40",
												)}
											>
												{employee.role}
											</Badge>
										</td>

										{departmentsEnabled && (
											<td className="px-4 py-2 hidden lg:table-cell">
												{employee.department ? (
													<div className="flex items-center gap-1.5">
														<span className="text-xs text-ink-3">{employee.department.name}</span>
														{employee.is_department_manager && (
															<Badge variant="outline" className="text-[10px] bg-warning/10 text-warning-fg border-warning/20">
																Manager
															</Badge>
														)}
													</div>
												) : (
													<span className="text-xs text-ink-3">—</span>
												)}
											</td>
										)}

										<td className="px-4 py-2 text-ink-3 hidden md:table-cell">
											{formatDate(employee.created_at)}
										</td>

										<td className="px-4 py-2 text-ink-3 hidden md:table-cell">
											{formatDate(employee.last_sign_in_at)}
										</td>

										<td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
											<div className="flex items-center justify-end gap-1">
												<EmployeeFormDialog
													mode="edit"
													employee={employee}
													isPending={isUpdating}
													onSubmit={async (data) => { await updateEmployee({ id: employee.id, data }); }}
													trigger={
														<Button variant="ghost" size="icon-sm" title="Edit">
															<Pencil className="w-3.5 h-3.5" />
														</Button>
													}
												/>
												<EmployeeDeleteDialog
													employee={employee}
													isPending={isDeleting}
													onConfirm={async () => { await deleteEmployee(employee.id); }}
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
