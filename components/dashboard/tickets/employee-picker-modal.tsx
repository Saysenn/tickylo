"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Check } from "lucide-react";
import APIService from "@/lib/infra/api";
import { formatInitials } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DialogRoot, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Employee {
	id: string;
	name: string | null;
	email: string;
}

interface EmployeePickerModalProps {
	open: boolean;
	title: string;
	subtitle?: string;
	excludeIds?: string[];
	initialSelectedId?: string;
	workload?: Record<string, number>;
	isPending?: boolean;
	confirmLabel?: string;
	onConfirm: (employeeId: string) => void;
	onClose: () => void;
}

export function EmployeePickerModal({
	open,
	title,
	subtitle,
	excludeIds = [],
	initialSelectedId,
	workload = {},
	isPending,
	confirmLabel = "Confirm",
	onConfirm,
	onClose,
}: EmployeePickerModalProps) {
	const [search, setSearch] = useState("");
	const [selected, setSelected] = useState<Employee | null>(null);

	useEffect(() => {
		if (open) {
			setSearch("");
			setSelected(null);
		}
	}, [open]);

	const { data: employeesData, isLoading } = useQuery<{ data: Employee[] }>({
		queryKey: ["employees-picker"],
		queryFn: () => APIService.employees.list(1, 100),
		enabled: open,
		staleTime: 300_000,
	});

	const allEmployees = (employeesData?.data ?? []).filter((e) => !excludeIds.includes(e.id));

	// Pre-select if initialSelectedId provided and employees are loaded
	useEffect(() => {
		if (initialSelectedId && allEmployees.length > 0 && !selected) {
			const match = allEmployees.find((e) => e.id === initialSelectedId);
			if (match) setSelected(match);
		}
	}, [initialSelectedId, allEmployees.length]);

	const filtered = search.trim()
		? allEmployees.filter((e) => {
				const q = search.toLowerCase();
				return (e.name ?? "").toLowerCase().includes(q) || e.email.toLowerCase().includes(q);
			})
		: allEmployees;

	return (
		<DialogRoot open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{subtitle && <p className="text-xs text-ink-3">{subtitle}</p>}
				</DialogHeader>

				{/* Search */}
				<div className="relative mb-3">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3 pointer-events-none" />
					<Input
						autoFocus
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search by name or email…"
						className="pl-9 h-9 text-sm"
					/>
				</div>

				{/* Employee list */}
				<div className="max-h-60 overflow-y-auto space-y-0.5 -mx-1 pr-1">
					{isLoading && (
						<p className="text-xs text-ink-3 text-center py-6">Loading…</p>
					)}
					{!isLoading && filtered.length === 0 && (
						<p className="text-xs text-ink-3 text-center py-6">No employees found.</p>
					)}
					{filtered.map((emp) => {
						const isSelected = selected?.id === emp.id;
						const initials = formatInitials(emp.name, emp.email);
						const activeCount = workload[emp.id];
						const hasWorkload = activeCount !== undefined;

						return (
							<button
								key={emp.id}
								type="button"
								onClick={() => setSelected(emp)}
								className={cn(
									"w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
									isSelected
										? "bg-mint/15 border border-mint/30"
										: "hover:bg-accent border border-transparent",
								)}
							>
								<div className="w-7 h-7 rounded-full bg-mint/20 flex items-center justify-center text-[10px] font-bold text-ink-2 shrink-0">
									{initials}
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-xs font-medium text-ink truncate">{emp.name ?? "—"}</p>
									<p className="text-[10px] text-ink-3 truncate">{emp.email}</p>
								</div>
								<div className="flex items-center gap-1.5 shrink-0">
									{hasWorkload && (
										<span className={cn(
											"text-[10px] font-medium px-1.5 py-0.5 rounded",
											activeCount === 0
												? "bg-mint/15 text-mint"
												: activeCount <= 3
													? "bg-yellow-500/10 text-yellow-600"
													: "bg-destructive/10 text-destructive",
										)}>
											{activeCount} active
										</span>
									)}
									{isSelected && <Check className="w-3.5 h-3.5 text-mint" />}
								</div>
							</button>
						);
					})}
				</div>

				{/* Actions */}
				<div className="flex gap-2 mt-4 pt-4 border-t">
					<Button variant="outline" size="sm" className="flex-1 text-xs h-9" onClick={onClose}>
						Cancel
					</Button>
					<Button
						size="sm"
						className="flex-1 text-xs h-9 bg-mint hover:bg-mint/90 text-ink"
						disabled={!selected || isPending}
						isLoading={isPending}
						onClick={() => selected && onConfirm(selected.id)}
					>
						{confirmLabel}
					</Button>
				</div>
			</DialogContent>
		</DialogRoot>
	);
}
