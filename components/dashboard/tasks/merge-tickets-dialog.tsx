"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitMerge, Crown } from "lucide-react";
import { isAxiosError } from "axios";
import APIService from "@/lib/infra/api";
import {
	DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { Task } from "./types";

interface MergeTicketsDialogProps {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	tickets: Task[];
	onSuccess: () => void;
}

export function MergeTicketsDialog({ open, onOpenChange, tickets, onSuccess }: MergeTicketsDialogProps) {
	const queryClient = useQueryClient();
	const [primaryId, setPrimaryId] = useState<string>(tickets[0]?.id ?? "");
	const [error, setError] = useState("");

	const mergedTickets = tickets.filter((t) => t.id !== primaryId);

	const { mutateAsync: merge, isPending } = useMutation({
		mutationFn: () => APIService.tasks.merge(primaryId, mergedTickets.map((t) => t.id)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			onSuccess();
			onOpenChange(false);
		},
	});

	async function handleMerge() {
		if (!primaryId) { setError("Please select a primary ticket."); return; }
		if (mergedTickets.length === 0) { setError("Select at least 2 tickets to merge."); return; }
		setError("");
		try {
			await merge();
		} catch (err) {
			if (isAxiosError(err)) {
				setError(err.response?.data?.error ?? "Failed to merge tickets. Please try again.");
			} else {
				setError("Failed to merge tickets. Please try again.");
			}
		}
	}

	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<GitMerge className="w-4 h-4 text-mint" />
						Merge Tickets
					</DialogTitle>
					<DialogDescription>
						Select which ticket to keep as the primary. All comments, time entries, subtasks, and watchers from the other tickets will be moved into it. The other tickets will be closed.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3 py-2">
					<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">Select primary ticket</p>

					<div className="space-y-2">
						{tickets.map((ticket) => {
							const isPrimary = ticket.id === primaryId;
							return (
								<button
									key={ticket.id}
									type="button"
									onClick={() => { setPrimaryId(ticket.id); setError(""); }}
									className={cn(
										"w-full text-left rounded-lg border px-4 py-3 transition-colors",
										isPrimary
											? "border-mint/50 bg-mint/5"
											: "border-border hover:border-border/80 hover:bg-accent/40",
									)}
								>
									<div className="flex items-start gap-2.5">
										<div className={cn(
											"mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
											isPrimary ? "border-mint bg-mint" : "border-border",
										)}>
											{isPrimary && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
										</div>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<p className="text-sm font-medium text-ink leading-tight truncate">{ticket.title}</p>
												{isPrimary && (
													<span className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-mint bg-mint/10 px-1.5 py-0.5 rounded-full">
														<Crown className="w-2.5 h-2.5" />
														Primary
													</span>
												)}
											</div>
											<p className="text-xs text-ink-3 mt-0.5">
												{isPrimary ? "Survives — absorbs all data" : "Will be closed after merge"}
											</p>
										</div>
									</div>
								</button>
							);
						})}
					</div>

					{error && <p className="text-xs text-destructive">{error}</p>}

					<div className="rounded-lg bg-accent/50 border border-border/50 px-4 py-3 text-xs text-ink-3 space-y-1">
						<p className="font-medium text-ink-2">What gets merged into the primary ticket:</p>
						<ul className="list-disc list-inside space-y-0.5 ml-1">
							<li>All comments</li>
							<li>All time entries</li>
							<li>All subtasks</li>
							<li>All watchers</li>
						</ul>
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
					<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
						Cancel
					</Button>
					<Button
						size="sm"
						disabled={isPending || !primaryId}
						isLoading={isPending}
						onClick={handleMerge}
						className="gap-1.5"
					>
						<GitMerge className="w-3.5 h-3.5" />
						Merge {tickets.length} tickets
					</Button>
				</div>
			</DialogContent>
		</DialogRoot>
	);
}
