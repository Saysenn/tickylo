"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	DialogRoot,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import APIService from "@/lib/infra/api";
import type { DepartmentRow } from "@/services/department.service";

interface Props {
	mode: "create" | "edit";
	department?: DepartmentRow;
	trigger: React.ReactNode;
	onSubmit: (data: { name: string; manager_id?: string | null }) => Promise<void>;
	isPending: boolean;
}

export function DepartmentFormDialog({ mode, department, trigger, onSubmit, isPending }: Props) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState("");
	const [managerId, setManagerId] = useState<string>("");
	const [error, setError] = useState("");

	useEffect(() => {
		if (open) {
			setName(department?.name ?? "");
			setManagerId(department?.manager_id ?? "");
			setError("");
		}
	}, [open, department]);

	const { data: employeesData } = useQuery({
		queryKey: ["employees", 1, undefined],
		queryFn: () => APIService.employees.list(1, 100),
		enabled: open,
		staleTime: 30_000,
	});

	const managerOptions = [
		{ value: "__none__", label: "No manager" },
		...(employeesData?.data ?? []).map((e: any) => ({
			value: e.id,
			label: e.name ?? e.email,
		})),
	];

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		try {
			await onSubmit({
				name: name.trim(),
				manager_id: managerId && managerId !== "__none__" ? managerId : null,
			});
			setOpen(false);
		} catch (err: any) {
			setError(err?.response?.data?.error ?? "Something went wrong.");
		}
	};

	return (
		<DialogRoot open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{mode === "create" ? "Add department" : "Edit department"}</DialogTitle>
					<DialogDescription>
						{mode === "create" ? "Create a new department for your organization." : "Update this department's details."}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1.5">
						<Label htmlFor="dept-name">Department name</Label>
						<Input
							id="dept-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Engineering"
							required
							minLength={2}
						/>
					</div>

					<div className="space-y-1.5">
						<Label>Manager</Label>
						<Combobox
							options={managerOptions}
							value={managerId || "__none__"}
							onChange={(v) => setManagerId(v === "__none__" ? "" : v)}
							placeholder="No manager"
							searchPlaceholder="Search employees…"
						/>
					</div>

					{error && <p className="text-sm text-destructive">{error}</p>}

					<div className="flex justify-end gap-2 pt-2">
						<DialogClose asChild>
							<Button type="button" variant="outline" size="sm">Cancel</Button>
						</DialogClose>
						<Button type="submit" size="sm" isLoading={isPending}>
							{mode === "create" ? "Create department" : "Save changes"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
