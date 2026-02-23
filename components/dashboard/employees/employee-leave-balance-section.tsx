"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeaveBalances {
	sick_leave: number | null;
	vacation_leave: number | null;
	emergency_leave: number | null;
	personal_leave: number | null;
}

interface Props {
	employeeId: string;
	initialBalances: LeaveBalances;
}

const LEAVE_TYPES = [
	{ key: "sick_leave" as const, label: "Sick" },
	{ key: "vacation_leave" as const, label: "Vacation" },
	{ key: "emergency_leave" as const, label: "Emergency" },
	{ key: "personal_leave" as const, label: "Personal" },
];

export function EmployeeLeaveBalanceSection({ employeeId, initialBalances }: Props) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [sick, setSick] = useState(String(initialBalances.sick_leave ?? 0));
	const [vacation, setVacation] = useState(String(initialBalances.vacation_leave ?? 0));
	const [emergency, setEmergency] = useState(String(initialBalances.emergency_leave ?? 0));
	const [personal, setPersonal] = useState(String(initialBalances.personal_leave ?? 0));

	const { mutate, isPending } = useMutation({
		mutationFn: () =>
			APIService.employees.updateMeta(employeeId, {
				sick_leave: sick !== "" ? parseInt(sick, 10) : null,
				vacation_leave: vacation !== "" ? parseInt(vacation, 10) : null,
				emergency_leave: emergency !== "" ? parseInt(emergency, 10) : null,
				personal_leave: personal !== "" ? parseInt(personal, 10) : null,
			}),
		onSuccess: () => {
			setEditing(false);
			setError(null);
			router.refresh();
		},
		onError: () => setError("Failed to save. Please try again."),
	});

	const balances = [
		{ label: "Sick", value: initialBalances.sick_leave ?? 0, state: sick, setState: setSick },
		{ label: "Vacation", value: initialBalances.vacation_leave ?? 0, state: vacation, setState: setVacation },
		{ label: "Emergency", value: initialBalances.emergency_leave ?? 0, state: emergency, setState: setEmergency },
		{ label: "Personal", value: initialBalances.personal_leave ?? 0, state: personal, setState: setPersonal },
	];

	if (!editing) {
		return (
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<p className="text-sm font-medium text-ink">Leave Balances</p>
					<Button
						size="sm"
						variant="ghost"
						className="h-7 gap-1.5 text-ink-3 text-xs"
						onClick={() => setEditing(true)}
					>
						<Pencil className="w-3 h-3" />
						Edit
					</Button>
				</div>
				<div className="grid grid-cols-4 gap-3">
					{balances.map(({ label, value }) => (
						<div
							key={label}
							className="rounded-md border bg-accent/20 p-3 text-center"
						>
							<p className="text-2xl font-bold text-ink">{value}</p>
							<p className="text-xs text-ink-3 mt-0.5">{label} days</p>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<p className="text-sm font-medium text-ink">Edit Leave Balances</p>
				<Button
					size="sm"
					variant="ghost"
					className="h-7 gap-1.5 text-ink-3 text-xs"
					onClick={() => { setEditing(false); setError(null); }}
					disabled={isPending}
				>
					<X className="w-3 h-3" />
					Cancel
				</Button>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{LEAVE_TYPES.map(({ key, label }) => {
					const stateMap: Record<string, [string, (v: string) => void]> = {
						sick_leave: [sick, setSick],
						vacation_leave: [vacation, setVacation],
						emergency_leave: [emergency, setEmergency],
						personal_leave: [personal, setPersonal],
					};
					const [val, setVal] = stateMap[key];
					return (
						<div key={key} className="space-y-1.5">
							<Label htmlFor={`leave-${key}`}>{label} (days)</Label>
							<Input
								id={`leave-${key}`}
								type="number"
								min="0"
								placeholder="0"
								value={val}
								onChange={(e) => setVal(e.target.value)}
							/>
						</div>
					);
				})}
			</div>

			<div className="flex items-center gap-3 pt-1">
				<Button size="sm" onClick={() => mutate()} disabled={isPending}>
					{isPending ? (
						<>
							<div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin mr-2" />
							Saving…
						</>
					) : (
						"Save Balances"
					)}
				</Button>
				{error && <p className="text-sm text-destructive">{error}</p>}
			</div>
		</div>
	);
}
