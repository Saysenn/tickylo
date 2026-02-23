"use client";

import { useState } from "react";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
						<select
							id="type"
							value={type}
							onChange={(e) => setType(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
						>
							<option value="vacation">Vacation</option>
							<option value="sick">Sick</option>
							<option value="emergency">Emergency</option>
						</select>
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
						<Button type="submit" size="sm" disabled={isPending}>
							{isPending ? "Submitting…" : "Submit request"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
