"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import APIService from "@/lib/infra/api";
import { Combobox } from "@/components/ui/combobox";

interface RequestFormDialogProps {
	isPending: boolean;
	onSubmit: (data: {
		startDate: string;
		endDate: string;
		type: string;
		reason?: string;
	}) => Promise<void>;
	trigger: React.ReactNode;
}

interface UserMeta {
	sick_leave: number | null;
	vacation_leave: number | null;
	emergency_leave: number | null;
}

const LEAVE_TYPES: { value: string; label: string; field: keyof UserMeta }[] = [
	{ value: "vacation", label: "Vacation", field: "vacation_leave" },
	{ value: "sick", label: "Sick", field: "sick_leave" },
	{ value: "emergency", label: "Emergency", field: "emergency_leave" },
];

export function RequestFormDialog({
	isPending,
	onSubmit,
	trigger,
}: RequestFormDialogProps) {
	const [open, setOpen] = useState(false);
	const [type, setType] = useState<string>("vacation");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [reason, setReason] = useState("");
	const [error, setError] = useState("");

	const { data: meta, isLoading: isLoadingMeta } = useQuery<UserMeta | null>({
		queryKey: ["user-meta"],
		queryFn: () => APIService.users.getMeta(),
		enabled: open,
		staleTime: 30_000,
	});

	const getBalance = (field: keyof UserMeta): number =>
		meta ? (meta[field] ?? 0) : 0;

	const isExhausted = (field: keyof UserMeta): boolean =>
		meta !== undefined && meta !== null && getBalance(field) <= 0;

	const selectedType = LEAVE_TYPES.find((t) => t.value === type);
	const selectedExhausted = selectedType ? isExhausted(selectedType.field) : false;
	const metaExists = meta !== undefined && meta !== null;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!startDate || !endDate) {
			setError("Please fill in both dates.");
			return;
		}
		if (new Date(endDate) < new Date(startDate)) {
			setError("End date must be after start date.");
			return;
		}
		if (selectedExhausted) {
			setError(`You have no remaining ${selectedType?.label.toLowerCase()} leave days.`);
			return;
		}

		try {
			await onSubmit({ startDate, endDate, type, reason: reason || undefined });
			setOpen(false);
			setStartDate("");
			setEndDate("");
			setReason("");
		} catch {
			setError("Failed to submit request. Please try again.");
		}
	}

	return (
		<DialogRoot open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>New Leave Request</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					{/* Leave type */}
					<div className="space-y-1.5">
						<Label htmlFor="type">Leave type</Label>
						<Combobox
							options={LEAVE_TYPES.map((lt) => {
								const balance = getBalance(lt.field);
								const exhausted = isExhausted(lt.field);
								const suffix = metaExists && !isLoadingMeta
									? exhausted
										? " — No days remaining"
										: ` — ${balance} day${balance === 1 ? "" : "s"} remaining`
									: "";
								return { value: lt.value, label: `${lt.label}${suffix}` };
							})}
							value={type}
							onChange={setType}
							placeholder="Select leave type…"
						/>

						{/* Inline warning for exhausted selected type */}
						{metaExists && selectedExhausted && (
							<p className="text-xs text-destructive mt-1">
								You have no remaining {selectedType?.label.toLowerCase()} leave days. Please select a different type or contact your admin.
							</p>
						)}

						{/* Warning when meta not set up */}
						{!isLoadingMeta && open && meta === null && (
							<p className="text-xs text-ink-3 mt-1">
								Your leave balance hasn&apos;t been configured yet. Your request will be reviewed by your admin.
							</p>
						)}
					</div>

					{/* Dates */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="startDate">Start date</Label>
							<input
								id="startDate"
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
								required
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="endDate">End date</Label>
							<input
								id="endDate"
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
								required
							/>
						</div>
					</div>

					{/* Reason (optional) */}
					<div className="space-y-1.5">
						<Label htmlFor="reason">Reason (optional)</Label>
						<textarea
							id="reason"
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							rows={2}
							maxLength={500}
							placeholder="Briefly describe the reason..."
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-mint"
						/>
					</div>

					{error && <p className="text-xs text-destructive">{error}</p>}

					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={isPending || isLoadingMeta || selectedExhausted}
						>
							{isPending ? "Submitting…" : "Submit request"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
