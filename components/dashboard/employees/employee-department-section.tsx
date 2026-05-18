"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Building2, Pencil, X, Check } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";

interface Props {
	employeeId: string;
	initialDepartment: { id: string; name: string } | null;
}

export function EmployeeDepartmentSection({ employeeId, initialDepartment }: Props) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [selectedId, setSelectedId] = useState<string>(initialDepartment?.id ?? "__none__");

	const { data: deptData } = useQuery({
		queryKey: ["departments"],
		queryFn: () => APIService.departments.list(),
		staleTime: 30_000,
		enabled: editing,
	});

	const deptOptions = [
		{ value: "__none__", label: "None" },
		...(deptData?.data ?? []).map((d: any) => ({ value: d.id, label: d.name })),
	];

	const { mutate: saveDept, isPending } = useMutation({
		mutationFn: (deptId: string | null) =>
			APIService.employees.updateMeta(employeeId, { department_id: deptId }),
		onSuccess: () => {
			setEditing(false);
			router.refresh();
		},
	});

	const handleSave = () => {
		const deptId = selectedId === "__none__" ? null : selectedId;
		saveDept(deptId);
	};

	const handleCancel = () => {
		setSelectedId(initialDepartment?.id ?? "__none__");
		setEditing(false);
	};

	return (
		<section className="rounded-lg border bg-background p-6 space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Building2 className="w-4 h-4 text-ink-3" />
					<h2 className="font-semibold text-ink">Department</h2>
				</div>
				{!editing && (
					<Button variant="ghost" size="icon-sm" onClick={() => setEditing(true)} title="Edit department">
						<Pencil className="w-3.5 h-3.5" />
					</Button>
				)}
			</div>

			{!editing ? (
				<p className="text-sm text-ink-3">
					{initialDepartment?.name ?? "—"}
				</p>
			) : (
				<div className="space-y-3">
					<Combobox
						options={deptOptions}
						value={selectedId}
						onChange={setSelectedId}
						placeholder="Select department…"
						searchPlaceholder="Search departments…"
					/>
					<div className="flex items-center gap-2">
						<Button size="sm" className="gap-1.5 bg-mint hover:bg-mint/90 text-ink h-8" onClick={handleSave} isLoading={isPending}>
							<Check className="w-3.5 h-3.5" />
							Save
						</Button>
						<Button size="sm" variant="ghost" className="h-8 gap-1.5" onClick={handleCancel} disabled={isPending}>
							<X className="w-3.5 h-3.5" />
							Cancel
						</Button>
					</div>
				</div>
			)}
		</section>
	);
}
