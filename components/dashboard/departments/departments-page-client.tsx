"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Building2, Pencil, Trash2, Plus, Users, X, Check, UserPlus, Search, SlidersHorizontal,
} from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
	SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	DialogRoot, DialogContent, DialogHeader, DialogTitle,
	DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import { DepartmentFormDialog } from "@/components/dashboard/settings/department-form-dialog";
import { formatMemberCount, formatInitials, formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { DepartmentRow } from "@/services/department.service";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

const ICON_COLORS = [
	{ bg: "bg-mint/15", text: "text-mint" },
	{ bg: "bg-blue-500/15", text: "text-blue-500" },
	{ bg: "bg-purple-500/15", text: "text-purple-500" },
	{ bg: "bg-orange-500/15", text: "text-orange-500" },
	{ bg: "bg-pink-500/15", text: "text-pink-500" },
	{ bg: "bg-cyan-500/15", text: "text-cyan-500" },
	{ bg: "bg-yellow-500/15", text: "text-yellow-600" },
	{ bg: "bg-rose-500/15", text: "text-rose-500" },
];

function deptColor(index: number) {
	return ICON_COLORS[index % ICON_COLORS.length];
}

interface Employee {
	id: string;
	name: string | null;
	email: string;
	avatar_url: string | null;
	role: string;
	department: { id: string; name: string } | null;
}

// ── Members Tab ───────────────────────────────────────────────────────────────

function MembersTab({ dept }: { dept: DepartmentRow }) {
	const queryClient = useQueryClient();
	const [addingMember, setAddingMember] = useState(false);
	const [addMemberId, setAddMemberId] = useState("");

	const { data: membersData, isLoading } = useQuery({
		queryKey: ["dept-members", dept.id],
		queryFn: () => APIService.employees.list(1, 200, undefined, dept.id),
		staleTime: 15_000,
	});

	const { data: allEmployeesData } = useQuery({
		queryKey: ["employees", 1, undefined],
		queryFn: () => APIService.employees.list(1, 200),
		enabled: addingMember,
		staleTime: 30_000,
	});

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["dept-members", dept.id] });
		queryClient.invalidateQueries({ queryKey: ["departments"] });
		queryClient.invalidateQueries({ queryKey: ["employees"] });
	};

	const { mutate: assignMember, isPending: isAssigning } = useMutation({
		mutationFn: (employeeId: string) =>
			APIService.employees.updateMeta(employeeId, { department_id: dept.id }),
		onSuccess: () => { setAddMemberId(""); setAddingMember(false); invalidate(); },
	});

	const { mutate: removeMember, isPending: isRemoving } = useMutation({
		mutationFn: (employeeId: string) =>
			APIService.employees.updateMeta(employeeId, { department_id: null }),
		onSuccess: invalidate,
	});

	const rawMembers: Employee[] = membersData?.data ?? [];
	const manager = dept.manager ? rawMembers.find((m) => m.id === dept.manager_id) : null;
	const otherMembers = rawMembers.filter((m) => m.id !== dept.manager_id);
	const members = [...(manager ? [manager] : []), ...otherMembers];
	const memberIds = new Set(rawMembers.map((m) => m.id));
	const addOptions = (allEmployeesData?.data ?? [])
		.filter((e: Employee) => !memberIds.has(e.id))
		.map((e: Employee) => ({ value: e.id, label: e.name ?? e.email }));

	return (
		<div className="space-y-3">
			{isLoading && (
				<div className="space-y-2">
					{Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl border">
							<Skeleton className="h-8 w-8 rounded-full shrink-0" />
							<div className="flex-1 space-y-1.5">
								<Skeleton className="h-3.5 w-32" />
								<Skeleton className="h-3 w-20" />
							</div>
							<Skeleton className="h-7 w-16 rounded-lg shrink-0" />
						</div>
					))}
				</div>
			)}

			{!isLoading && members.length === 0 && (
				<div className="flex flex-col items-center justify-center py-10 text-center">
					<div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mb-3">
						<Users className="w-5 h-5 text-ink-3" strokeWidth={1.8} />
					</div>
					<p className="text-sm font-medium text-ink">No members yet</p>
					<p className="text-xs text-ink-3 mt-0.5">Add employees below.</p>
				</div>
			)}

			{members.map((member) => {
				const isManager = member.id === dept.manager_id;
				return (
					<div
						key={member.id}
						className={cn(
							"flex items-center gap-3 px-3 py-2.5 rounded-xl border",
							isManager ? "bg-mint/5 border-mint/20" : "bg-background border-border/50",
						)}
					>
						<Avatar className="w-8 h-8 shrink-0">
							<AvatarImage src={member.avatar_url ?? undefined} />
							<AvatarFallback className="text-xs bg-accent text-ink-2">
								{formatInitials(member.name, member.email)}
							</AvatarFallback>
						</Avatar>
						<div className="flex-1 min-w-0">
							<p className="text-xs font-medium text-ink truncate">{member.name ?? "—"}</p>
							<p className="text-xs text-ink-3 truncate">{member.email}</p>
						</div>
						{isManager && (
							<Badge variant="outline" className="text-[10px] bg-mint/15 text-mint border-mint/20 shrink-0">
								Manager
							</Badge>
						)}
						<button
							onClick={() => removeMember(member.id)}
							disabled={isRemoving}
							className="text-ink-3/40 hover:text-destructive transition-colors p-1 rounded shrink-0"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				);
			})}

			<div className="pt-2">
				{!addingMember ? (
					<Button size="sm" variant="outline" className="gap-1.5 w-full h-9 text-xs" onClick={() => setAddingMember(true)}>
						<UserPlus className="w-3.5 h-3.5" />
						Add Member
					</Button>
				) : (
					<div className="flex items-center gap-2">
						<div className="flex-1">
							<Combobox
								options={addOptions}
								value={addMemberId}
								onChange={setAddMemberId}
								placeholder="Search employee…"
								searchPlaceholder="Search…"
								className="h-9 text-xs"
							/>
						</div>
						<Button
							size="sm"
							className="h-9 px-3 bg-mint hover:bg-mint/90 text-ink"
							disabled={!addMemberId || isAssigning}
							onClick={() => addMemberId && assignMember(addMemberId)}
							isLoading={isAssigning}
						>
							<Check className="w-3.5 h-3.5" />
						</Button>
						<Button size="sm" variant="ghost" className="h-9 px-2" onClick={() => { setAddingMember(false); setAddMemberId(""); }}>
							<X className="w-3.5 h-3.5" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

// ── Detail Panel ──────────────────────────────────────────────────────────────

type DetailTab = "overview" | "members";

function DetailPanel({
	dept,
	colorIndex,
	onClose,
	onEdit,
	onDelete,
	isUpdating,
}: {
	dept: DepartmentRow;
	colorIndex: number;
	onClose: () => void;
	onEdit: (data: { name: string; manager_id?: string | null }) => Promise<void>;
	onDelete: () => void;
	isUpdating: boolean;
}) {
	const [tab, setTab] = useState<DetailTab>("overview");
	const color = deptColor(colorIndex);
	const hasManager = !!dept.manager_id;

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="px-5 pt-5 pb-0 border-b shrink-0">
				<div className="flex items-start justify-between mb-3">
					<div className="flex items-center gap-3">
						<div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color.bg)}>
							<Building2 className={cn("w-5 h-5", color.text)} />
						</div>
						<div>
							<h2 className="font-bold text-ink">{dept.name}</h2>
							<div className="flex items-center gap-1.5 mt-0.5">
								<span className={cn("w-1.5 h-1.5 rounded-full inline-block", hasManager ? "bg-mint" : "bg-orange-400")} />
								<span className="text-[11px] text-ink-3">{hasManager ? "Active" : "No Manager"}</span>
							</div>
						</div>
					</div>
					<button onClick={onClose} className="text-ink-3 hover:text-ink p-1.5 rounded-lg hover:bg-accent transition-colors shrink-0">
						<X className="w-4 h-4" />
					</button>
				</div>
				<p className="text-[11px] text-ink-3 mb-3">
					Created {formatDate(new Date(dept.created_at).toISOString())} · Updated {formatDate(new Date(dept.updated_at).toISOString())}
				</p>
				<div className="flex gap-4">
					{(["overview", "members"] as DetailTab[]).map((t) => (
						<button
							key={t}
							onClick={() => setTab(t)}
							className={cn(
								"pb-2.5 text-xs font-medium border-b-2 capitalize transition-colors -mb-px",
								tab === t ? "border-mint text-ink" : "border-transparent text-ink-3 hover:text-ink",
							)}
						>
							{t.charAt(0).toUpperCase() + t.slice(1)}
						</button>
					))}
				</div>
			</div>

			{/* Body */}
			<div className="flex-1 overflow-y-auto px-5 py-4">
				{tab === "overview" && (
					<div className="space-y-5">
						<DepartmentFormDialog
							mode="edit"
							department={dept}
							isPending={isUpdating}
							onSubmit={onEdit}
							trigger={
								<Button variant="outline" size="sm" className="gap-1.5 w-full">
									<Pencil className="w-3.5 h-3.5" />
									Edit Details
								</Button>
							}
						/>

						<div>
							<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-2">Details</p>
							<div className="divide-y divide-border/50">
								{[
									{ label: "Department Lead", value: dept.manager ? (dept.manager.name ?? dept.manager.email) : "—" },
									{ label: "Total Members", value: String(dept._count.users) },
									{ label: "Created", value: formatDate(new Date(dept.created_at).toISOString()) },
								].map(({ label, value }) => (
									<div key={label} className="flex items-center justify-between py-2.5">
										<span className="text-xs text-ink-3">{label}</span>
										<span className="text-xs font-medium text-ink">{value}</span>
									</div>
								))}
								<div className="flex items-center justify-between py-2.5">
									<span className="text-xs text-ink-3">Status</span>
									<span className={cn(
										"inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border",
										hasManager
											? "bg-mint/10 text-mint border-mint/20"
											: "bg-orange-500/10 text-orange-600 border-orange-500/20",
									)}>
										<span className={cn("w-1.5 h-1.5 rounded-full", hasManager ? "bg-mint" : "bg-orange-400")} />
										{hasManager ? "Active" : "No Manager"}
									</span>
								</div>
							</div>
						</div>

						<div>
							<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-2">Summary</p>
							<div className="grid grid-cols-2 gap-2">
								<div className="rounded-xl border bg-accent/30 p-3 text-center">
									<p className="text-2xl font-bold text-ink">{dept._count.users}</p>
									<p className="text-[11px] text-ink-3 mt-0.5">Members</p>
								</div>
								<div className="rounded-xl border bg-accent/30 p-3 text-center">
									<p className="text-2xl font-bold text-ink">{hasManager ? 1 : 0}</p>
									<p className="text-[11px] text-ink-3 mt-0.5">Managers</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{tab === "members" && <MembersTab dept={dept} />}
			</div>

			{/* Footer */}
			<div className="px-5 py-3 border-t shrink-0">
				<Button
					size="sm"
					variant="ghost"
					className="gap-1.5 w-full text-destructive hover:text-destructive hover:bg-destructive/10"
					onClick={onDelete}
				>
					<Trash2 className="w-3.5 h-3.5" />
					Delete Department
				</Button>
			</div>
		</div>
	);
}

// ── Department Card ───────────────────────────────────────────────────────────

function DeptCard({
	dept,
	colorIndex,
	isSelected,
	onClick,
	onEdit,
	onDelete,
	isUpdating,
}: {
	dept: DepartmentRow;
	colorIndex: number;
	isSelected: boolean;
	onClick: () => void;
	onEdit: (data: { name: string; manager_id?: string | null }) => Promise<void>;
	onDelete: () => void;
	isUpdating: boolean;
}) {
	const color = deptColor(colorIndex);
	const hasManager = !!dept.manager_id;

	return (
		<div
			onClick={onClick}
			className={cn(
				"rounded-xl border bg-background p-4 cursor-pointer transition-all hover:border-mint/30 hover:shadow-sm",
				isSelected && "border-mint/50 ring-1 ring-mint/20 shadow-sm",
			)}
		>
			<div className="flex items-center gap-4">
				{/* Icon */}
				<div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color.bg)}>
					<Building2 className={cn("w-5 h-5", color.text)} />
				</div>

				{/* Name */}
				<div className="flex-1 min-w-0">
					<p className="font-semibold text-sm text-ink">{dept.name}</p>
				</div>

				{/* Manager */}
				<div className="hidden sm:flex items-center gap-2 w-52 shrink-0">
					{dept.manager ? (
						<>
							<Avatar className="w-7 h-7 shrink-0">
								<AvatarFallback className="text-[10px] bg-accent text-ink-2">
									{formatInitials(dept.manager.name, dept.manager.email)}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<p className="text-xs font-medium text-ink">{dept.manager.name ?? dept.manager.email}</p>
								<p className="text-[10px] text-ink-3">Manager</p>
							</div>
						</>
					) : (
						<p className="text-xs text-ink-3">—</p>
					)}
				</div>

				{/* Members */}
				<div className="hidden md:flex items-center gap-1.5 w-24 shrink-0">
					<Users className="w-3.5 h-3.5 text-ink-3 shrink-0" />
					<span className="text-xs text-ink-3">{dept._count.users} members</span>
				</div>

				{/* Status */}
				<div className="hidden lg:block w-28 shrink-0">
					<span className={cn(
						"inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border",
						hasManager
							? "bg-mint/10 text-mint border-mint/20"
							: "bg-orange-500/10 text-orange-600 border-orange-500/20",
					)}>
						<span className={cn("w-1.5 h-1.5 rounded-full", hasManager ? "bg-mint" : "bg-orange-400")} />
						{hasManager ? "Active" : "No Manager"}
					</span>
				</div>

				{/* Actions */}
				<div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
					<Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={onClick}>
						View
					</Button>
					<DepartmentFormDialog
						mode="edit"
						department={dept}
						isPending={isUpdating}
						onSubmit={onEdit}
						trigger={
							<Button variant="ghost" size="icon-sm" className="h-8 w-8">
								<Pencil className="w-3.5 h-3.5" />
							</Button>
						}
					/>
					<Button
						variant="ghost"
						size="icon-sm"
						className="h-8 w-8 text-destructive hover:text-destructive"
						onClick={onDelete}
					>
						<Trash2 className="w-3.5 h-3.5" />
					</Button>
				</div>
			</div>
		</div>
	);
}

// ── Main ──────────────────────────────────────────────────────────────────────

type QuickFilter = "all" | "no_manager" | "empty";

export function DepartmentsPageClient() {
	const queryClient = useQueryClient();
	const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);
	const [forceDeleteTarget, setForceDeleteTarget] = useState<DepartmentRow | null>(null);
	const [search, setSearch] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
	const [filterVisible, setFilterVisible] = useState(false);

	const { data: deptData, isLoading } = useQuery({
		queryKey: ["departments"],
		queryFn: () => APIService.departments.list(),
		staleTime: 30_000,
	});
	const departments: DepartmentRow[] = deptData?.data ?? [];

	const { data: empTotalData } = useQuery({
		queryKey: ["employees-total"],
		queryFn: () => APIService.employees.list(1, 1),
		staleTime: 60_000,
	});

	// Derive selectedDept live so it reflects mutations immediately
	const selectedDept = selectedDeptId ? departments.find((d) => d.id === selectedDeptId) ?? null : null;
	const selectedDeptIndex = selectedDept ? departments.indexOf(selectedDept) : 0;

	// Stats
	const totalMembers = useMemo(() => departments.reduce((s, d) => s + d._count.users, 0), [departments]);
	const uniqueManagerCount = useMemo(
		() => new Set(departments.filter((d) => d.manager_id).map((d) => d.manager_id)).size,
		[departments],
	);
	const noManagerCount = departments.filter((d) => !d.manager_id).length;
	const totalEmployees = (empTotalData as { total?: number } | undefined)?.total ?? 0;
	const unassignedCount = Math.max(0, totalEmployees - totalMembers);

	const filtered = useMemo(() => {
		let list = departments;
		if (search) list = list.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
		if (quickFilter === "no_manager") list = list.filter((d) => !d.manager_id);
		if (quickFilter === "empty") list = list.filter((d) => d._count.users === 0);
		return list;
	}, [departments, search, quickFilter]);

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["departments"] });

	const { mutateAsync: createDept, isPending: isCreating } = useMutation({
		mutationFn: (data: { name: string; manager_id?: string | null }) => APIService.departments.create(data),
		onSuccess: invalidate,
	});

	const { mutateAsync: updateDept, isPending: isUpdating } = useMutation({
		mutationFn: ({ id, data }: { id: string; data: { name?: string; manager_id?: string | null } }) =>
			APIService.departments.update(id, data),
		onSuccess: () => {
			invalidate();
			queryClient.invalidateQueries({ queryKey: ["dept-members"] });
		},
	});

	const { mutateAsync: deleteDept, isPending: isDeleting } = useMutation({
		mutationFn: ({ id, force }: { id: string; force: boolean }) => APIService.departments.remove(id, force),
		onSuccess: (_, { id }) => {
			invalidate();
			if (selectedDeptId === id) setSelectedDeptId(null);
			setDeleteTarget(null);
			setForceDeleteTarget(null);
		},
	});

	const handleDelete = (dept: DepartmentRow) => {
		if (dept._count.users > 0) setForceDeleteTarget(dept);
		else setDeleteTarget(dept);
	};

	const stats = [
		{ label: "Total Departments", value: departments.length, sub: `${departments.filter((d) => d.manager_id).length} with managers`, color: "text-mint", bg: "bg-mint/10" },
		{ label: "Total Managers", value: uniqueManagerCount, sub: "Unique across depts", color: "text-blue-500", bg: "bg-blue-500/10" },
		{ label: "Total Members", value: totalMembers, sub: "Across all departments", color: "text-purple-500", bg: "bg-purple-500/10" },
		{ label: "Unassigned", value: unassignedCount, sub: "No department yet", color: "text-orange-500", bg: "bg-orange-500/10" },
		{ label: "No Manager", value: noManagerCount, sub: "Departments without one", color: "text-destructive", bg: "bg-destructive/10" },
	];

	const submitSearch = () => setSearch(searchInput.trim());
	const clearFilters = () => { setQuickFilter("all"); };
	const hasActiveFilters = quickFilter !== "all";

	if (isLoading) {
		return <TablePageSkeleton />;
	}

	return (
		<div className="space-y-5">
			{/* Stats */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-3">
				{stats.map((stat) => (
					<div key={stat.label} className="rounded-xl border bg-background p-4">
						<div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", stat.bg)}>
							<Users className={cn("w-4 h-4", stat.color)} />
						</div>
						<p className="text-2xl font-bold text-ink">{stat.value}</p>
						<p className="text-xs font-medium text-ink mt-0.5">{stat.label}</p>
						<p className="text-[10px] text-ink-3 mt-0.5">{stat.sub}</p>
					</div>
				))}
			</div>

			{/* Search + actions row */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<input
						type="text"
						placeholder="Search departments…"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submitSearch()}
						className="h-8 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-mint w-52"
					/>
					<Button size="sm" className="h-8 w-8 p-0 bg-mint hover:bg-mint/90 text-ink" onClick={submitSearch} title="Search">
						<Search className="w-3.5 h-3.5" />
					</Button>
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
					<p className="text-sm text-ink-3 whitespace-nowrap">
						{filtered.length} {filtered.length === 1 ? "department" : "departments"}
						{hasActiveFilters && <span className="text-mint"> (filtered)</span>}
					</p>
				</div>
				<DepartmentFormDialog
					mode="create"
					isPending={isCreating}
					onSubmit={async (data) => { await createDept(data); }}
					trigger={
						<Button size="sm" className="gap-1.5 shrink-0">
							<Plus className="w-3.5 h-3.5" />
							Add Department
						</Button>
					}
				/>
			</div>

			{/* Filter row */}
			{filterVisible && (
				<div className="flex flex-wrap items-center gap-2">
					<SelectRoot
						value={quickFilter}
						onValueChange={(v) => setQuickFilter(v as QuickFilter)}
					>
						<SelectTrigger className="h-8 text-sm w-[180px]">
							<SelectValue placeholder="All departments" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All departments</SelectItem>
							<SelectItem value="no_manager">No manager</SelectItem>
							<SelectItem value="empty">Empty departments</SelectItem>
						</SelectContent>
					</SelectRoot>
					{hasActiveFilters && (
						<Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-ink-3" onClick={clearFilters}>
							<X className="w-3.5 h-3.5" />
							Clear filters
						</Button>
					)}
				</div>
			)}

			{/* Empty states */}
			{departments.length === 0 && (
				<div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl">
					<div className="w-14 h-14 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
						<Building2 className="w-7 h-7 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No departments yet</h3>
					<p className="text-sm text-ink-3 max-w-xs mb-5">Create your first department to start organising your team.</p>
					<DepartmentFormDialog
						mode="create"
						isPending={isCreating}
						onSubmit={async (data) => { await createDept(data); }}
						trigger={
							<Button size="sm" className="gap-1.5">
								<Plus className="w-3.5 h-3.5" />
								Add Department
							</Button>
						}
					/>
				</div>
			)}

			{departments.length > 0 && filtered.length === 0 && (
				<div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl">
					<p className="text-sm font-medium text-ink">No departments match</p>
					<p className="text-xs text-ink-3 mt-1">Try adjusting your search or filters.</p>
				</div>
			)}

			{/* List + Detail panel */}
			{filtered.length > 0 && (
				<div className="flex gap-5 items-start">
					<div className="flex-1 min-w-0 space-y-2">
						{filtered.map((dept) => {
							const globalIndex = departments.indexOf(dept);
							return (
								<DeptCard
									key={dept.id}
									dept={dept}
									colorIndex={globalIndex}
									isSelected={selectedDeptId === dept.id}
									onClick={() => setSelectedDeptId(dept.id === selectedDeptId ? null : dept.id)}
									onEdit={async (data) => { await updateDept({ id: dept.id, data }); }}
									onDelete={() => handleDelete(dept)}
									isUpdating={isUpdating}
								/>
							);
						})}
					</div>

					{selectedDept && (
						<div className="w-[380px] shrink-0 rounded-xl border bg-background flex flex-col sticky top-4 max-h-[calc(100vh-8rem)] overflow-hidden shadow-sm">
							<DetailPanel
								dept={selectedDept}
								colorIndex={selectedDeptIndex}
								onClose={() => setSelectedDeptId(null)}
								onEdit={async (data) => { await updateDept({ id: selectedDept.id, data }); }}
								onDelete={() => handleDelete(selectedDept)}
								isUpdating={isUpdating}
							/>
						</div>
					)}
				</div>
			)}


			{/* Delete confirm */}
			<DialogRoot open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
						<DialogDescription>This cannot be undone.</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 pt-2">
						<DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
						<Button
							size="sm"
							className="bg-destructive hover:bg-destructive/90 text-white"
							isLoading={isDeleting}
							onClick={() => deleteTarget && deleteDept({ id: deleteTarget.id, force: false })}
						>
							Delete
						</Button>
					</div>
				</DialogContent>
			</DialogRoot>

			{/* Force delete confirm */}
			<DialogRoot open={!!forceDeleteTarget} onOpenChange={() => setForceDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {forceDeleteTarget?.name}?</DialogTitle>
						<DialogDescription>
							This department has{" "}
							<strong>{formatMemberCount(forceDeleteTarget?._count.users ?? 0)}</strong>
							{" "}who will be unassigned. This cannot be undone.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 pt-2">
						<DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
						<Button
							size="sm"
							className="bg-destructive hover:bg-destructive/90 text-white"
							isLoading={isDeleting}
							onClick={() => forceDeleteTarget && deleteDept({ id: forceDeleteTarget.id, force: true })}
						>
							Delete anyway
						</Button>
					</div>
				</DialogContent>
			</DialogRoot>
		</div>
	);
}
