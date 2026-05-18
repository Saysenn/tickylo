"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Pencil, Trash2, Plus, Users, ChevronRight, X, Check, UserPlus } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "@/components/ui/dialog";
import { DepartmentFormDialog } from "@/components/dashboard/settings/department-form-dialog";
import { formatMemberCount, formatInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { DepartmentRow } from "@/services/department.service";

interface Employee {
	id: string;
	name: string | null;
	email: string;
	avatar_url: string | null;
	role: string;
	department: { id: string; name: string } | null;
}

function MembersPanel({
	dept,
	onClose,
}: {
	dept: DepartmentRow;
	onClose: () => void;
}) {
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

	// Manager on top, then rest sorted by name
	const manager = dept.manager ? rawMembers.find((m) => m.id === dept.manager_id) : null;
	const otherMembers = rawMembers.filter((m) => m.id !== dept.manager_id);
	const members = [...(manager ? [manager] : []), ...otherMembers];

	// Employees not yet in this dept (for add combobox)
	const memberIds = new Set(rawMembers.map((m) => m.id));
	const addOptions = (allEmployeesData?.data ?? [])
		.filter((e: Employee) => !memberIds.has(e.id))
		.map((e: Employee) => ({ value: e.id, label: e.name ?? e.email }));

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
				<div>
					<h2 className="font-semibold text-ink">{dept.name}</h2>
					<p className="text-xs text-ink-3 mt-0.5">
						{dept.manager ? `Manager: ${dept.manager.name ?? dept.manager.email}` : "No manager assigned"}
						{" · "}
						{formatMemberCount(members.length)}
					</p>
				</div>
				<button onClick={onClose} className="text-ink-3 hover:text-ink transition-colors p-1 rounded-lg hover:bg-accent">
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Members list */}
			<div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
				{isLoading && (
					<div className="flex justify-center py-8">
						<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
					</div>
				)}

				{!isLoading && members.length === 0 && (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-10 h-10 rounded-xl bg-mint/15 flex items-center justify-center mb-3">
							<Users className="w-5 h-5 text-ink-2" strokeWidth={1.8} />
						</div>
						<p className="text-sm font-medium text-ink">No members yet</p>
						<p className="text-xs text-ink-3 mt-0.5">Add employees to this department below.</p>
					</div>
				)}

				{members.map((member) => {
					const isManager = member.id === dept.manager_id;
					return (
						<div
							key={member.id}
							className={cn(
								"flex items-center gap-3 px-3 py-2.5 rounded-lg border",
								isManager ? "bg-mint/5 border-mint/20" : "bg-background border-border/50",
							)}
						>
							<Avatar className="w-7 h-7 shrink-0">
								<AvatarImage src={member.avatar_url ?? undefined} />
								<AvatarFallback className="text-xs bg-mint/15 text-ink-2">
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
								className="text-ink-3/50 hover:text-destructive transition-colors p-1 rounded shrink-0"
								title="Remove from department"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						</div>
					);
				})}
			</div>

			{/* Add member */}
			<div className="px-6 py-4 border-t shrink-0 space-y-2">
				{!addingMember ? (
					<Button
						size="sm"
						variant="outline"
						className="gap-1.5 w-full h-8 text-xs"
						onClick={() => setAddingMember(true)}
					>
						<UserPlus className="w-3.5 h-3.5" />
						Add member
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
								className="h-8 text-xs"
							/>
						</div>
						<Button
							size="sm"
							className="h-8 px-2.5 bg-mint hover:bg-mint/90 text-ink gap-1"
							disabled={!addMemberId || isAssigning}
							onClick={() => addMemberId && assignMember(addMemberId)}
							isLoading={isAssigning}
						>
							<Check className="w-3.5 h-3.5" />
						</Button>
						<Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setAddingMember(false); setAddMemberId(""); }}>
							<X className="w-3.5 h-3.5" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

export function DepartmentsPageClient() {
	const queryClient = useQueryClient();
	const [selectedDept, setSelectedDept] = useState<DepartmentRow | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<DepartmentRow | null>(null);
	const [forceDeleteTarget, setForceDeleteTarget] = useState<DepartmentRow | null>(null);

	const { data: deptData, isLoading } = useQuery({
		queryKey: ["departments"],
		queryFn: () => APIService.departments.list(),
		staleTime: 30_000,
	});
	const departments: DepartmentRow[] = deptData?.data ?? [];

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["departments"] });

	const { mutateAsync: createDept, isPending: isCreating } = useMutation({
		mutationFn: (data: { name: string; manager_id?: string | null }) => APIService.departments.create(data),
		onSuccess: invalidate,
	});

	const { mutateAsync: updateDept, isPending: isUpdating } = useMutation({
		mutationFn: ({ id, data }: { id: string; data: { name?: string; manager_id?: string | null } }) =>
			APIService.departments.update(id, data),
		onSuccess: () => { invalidate(); queryClient.invalidateQueries({ queryKey: ["dept-members"] }); },
	});

	const { mutateAsync: deleteDept, isPending: isDeleting } = useMutation({
		mutationFn: ({ id, force }: { id: string; force: boolean }) => APIService.departments.remove(id, force),
		onSuccess: () => {
			invalidate();
			if (selectedDept && (deleteTarget?.id === selectedDept.id || forceDeleteTarget?.id === selectedDept.id)) {
				setSelectedDept(null);
			}
			setDeleteTarget(null);
			setForceDeleteTarget(null);
		},
	});

	const handleDelete = (dept: DepartmentRow) => {
		if (dept._count.users > 0) {
			setForceDeleteTarget(dept);
		} else {
			setDeleteTarget(dept);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
			</div>
		);
	}

	return (
		<div className="flex gap-6 h-full">
			{/* Department list */}
			<div className={cn("space-y-4 transition-all", selectedDept ? "w-1/2" : "w-full")}>
				{/* Header */}
				<div className="flex items-center justify-between">
					<p className="text-sm text-ink-3">
						{departments.length} {departments.length === 1 ? "department" : "departments"}
					</p>
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

				{/* Empty state */}
				{departments.length === 0 && (
					<div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl">
						<div className="w-14 h-14 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
							<Building2 className="w-7 h-7 text-ink-2" strokeWidth={1.8} />
						</div>
						<h3 className="font-semibold text-ink mb-1">No departments yet</h3>
						<p className="text-sm text-ink-3 max-w-xs mb-5">
							Create your first department to start organising your team.
						</p>
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

				{/* Department cards */}
				<div className="space-y-2">
					{departments.map((dept) => (
						<div
							key={dept.id}
							onClick={() => setSelectedDept(selectedDept?.id === dept.id ? null : dept)}
							className={cn(
								"rounded-xl border p-4 cursor-pointer transition-all hover:border-mint/30 hover:bg-accent/20",
								selectedDept?.id === dept.id && "border-mint/40 bg-mint/5",
							)}
						>
							<div className="flex items-center gap-3">
								<div className="w-8 h-8 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
									<Building2 className="w-4 h-4 text-mint" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<p className="font-semibold text-ink text-sm">{dept.name}</p>
									</div>
									<p className="text-xs text-ink-3 mt-0.5">
										{dept.manager
											? (dept.manager.name ?? dept.manager.email)
											: "No manager"}
										{" · "}
										{formatMemberCount(dept._count.users)}
									</p>
								</div>
								<div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
									<DepartmentFormDialog
										mode="edit"
										department={dept}
										isPending={isUpdating}
										onSubmit={async (data) => { await updateDept({ id: dept.id, data }); }}
										trigger={
											<Button variant="ghost" size="icon-sm" title="Edit">
												<Pencil className="w-3.5 h-3.5" />
											</Button>
										}
									/>
									<Button
										variant="ghost"
										size="icon-sm"
										className="text-destructive hover:text-destructive"
										title="Delete"
										onClick={() => handleDelete(dept)}
									>
										<Trash2 className="w-3.5 h-3.5" />
									</Button>
									<ChevronRight className={cn("w-4 h-4 text-ink-3 transition-transform ml-1", selectedDept?.id === dept.id && "rotate-90")} />
								</div>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Members panel */}
			{selectedDept && (
				<div className="w-1/2 rounded-xl border bg-background flex flex-col overflow-hidden sticky top-0 max-h-[calc(100vh-10rem)]">
					<MembersPanel
						dept={selectedDept}
						onClose={() => setSelectedDept(null)}
					/>
				</div>
			)}

			{/* Delete (empty) confirm */}
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

			{/* Force delete (has members) */}
			<DialogRoot open={!!forceDeleteTarget} onOpenChange={() => setForceDeleteTarget(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete {forceDeleteTarget?.name}?</DialogTitle>
						<DialogDescription>
							<strong>{forceDeleteTarget?.name}</strong> has{" "}
							<strong>{formatMemberCount(forceDeleteTarget?._count.users ?? 0)}</strong>{" "}
							who will be unassigned. This cannot be undone.
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
