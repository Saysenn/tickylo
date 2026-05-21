"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, AlertTriangle, Clock, XCircle, Loader2 } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogRoot, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";

interface DeletionRequest {
	id: string;
	status: "pending" | "rejected" | "approved";
	reason?: string | null;
	reject_reason?: string | null;
	created_at: string;
}

interface OrgSettingsData {
	name: string;
}

export function OrgDeletionSection() {
	const queryClient = useQueryClient();

	const { data: request, isLoading } = useQuery<DeletionRequest | null>({
		queryKey: ["org-deletion-request"],
		queryFn: async () => {
			const res = await APIService.org.deletionRequest.get();
			return (res as any)?.request ?? null;
		},
		staleTime: 30_000,
	});

	const { data: orgSettings } = useQuery<OrgSettingsData>({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});

	const [open, setOpen] = useState(false);
	const [reason, setReason] = useState("");
	const [confirmName, setConfirmName] = useState("");
	const [error, setError] = useState("");

	const orgName = orgSettings?.name ?? "";
	const nameMatches = confirmName.trim() === orgName.trim();

	const { mutate: cancel, isPending: cancelling } = useMutation({
		mutationFn: () => APIService.org.deletionRequest.cancel(),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org-deletion-request"] }),
	});

	const { mutate: submit, isPending } = useMutation({
		mutationFn: () => APIService.org.deletionRequest.submit(reason.trim() || undefined),
		onSuccess: () => {
			setOpen(false);
			setReason("");
			setConfirmName("");
			setError("");
			queryClient.invalidateQueries({ queryKey: ["org-deletion-request"] });
		},
		onError: (err: any) => {
			setError(err?.response?.data?.error ?? "Failed to submit request.");
		},
	});

	if (isLoading) return null;

	// Approved — org is being deleted, nothing actionable
	if (request?.status === "approved") {
		return (
			<div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5 space-y-2">
				<div className="flex items-center gap-2 text-destructive">
					<XCircle className="w-4 h-4 shrink-0" />
					<p className="text-sm font-semibold">Deletion approved</p>
				</div>
				<p className="text-xs text-ink-3">
					Your deletion request was approved. Your subscription has been cancelled and all team members have lost access. Data will be permanently deleted within 30 days.
				</p>
			</div>
		);
	}

	// Pending
	if (request?.status === "pending") {
		return (
			<div className="rounded-xl border border-warning/40 bg-warning/5 dark:bg-warning/10 p-5 space-y-3">
				<div className="flex items-start justify-between gap-3">
					<div className="flex items-center gap-2 text-warning-fg dark:text-warning">
						<Clock className="w-4 h-4 shrink-0" />
						<p className="text-sm font-semibold">Deletion request pending review</p>
					</div>
					<Button
						size="sm"
						variant="outline"
						className="h-7 text-xs shrink-0 text-destructive border-destructive/30 hover:bg-destructive/5 dark:border-destructive/40 dark:hover:bg-destructive/10"
						isLoading={cancelling}
						onClick={() => cancel()}
					>
						Cancel Request
					</Button>
				</div>
				<p className="text-xs text-ink-3">
					Your request to delete this organization is awaiting super admin review. You will be notified once a decision is made.
				</p>
				{request.reason && (
					<p className="text-xs text-ink-3 italic">"{request.reason}"</p>
				)}
			</div>
		);
	}

	return (
		<div className="rounded-xl border border-destructive/30 bg-background p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
					<Trash2 className="w-3.5 h-3.5 text-destructive" />
				</div>
				<div>
					<h2 className="text-xs font-semibold text-ink">Delete Organization</h2>
					<p className="text-[11px] text-ink-3 mt-0.5">
						Permanently delete your organization, cancel your subscription, and remove all member access.
					</p>
				</div>
			</div>

			{/* Rejected state with re-submit option */}
			{request?.status === "rejected" && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
					<p className="text-xs font-medium text-destructive">Your previous request was rejected</p>
					{request.reject_reason && (
						<p className="text-xs text-ink-3">Reason: {request.reject_reason}</p>
					)}
					<p className="text-xs text-ink-3">You may submit a new request below.</p>
				</div>
			)}

			<div className="flex items-start gap-2 rounded-lg bg-warning/5 dark:bg-warning/10 border border-warning/30 dark:border-warning/20 p-3">
				<AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
				<p className="text-[11px] text-warning-fg dark:text-warning leading-relaxed">
					This action is irreversible. All data, tickets, and employee access will be permanently lost after a 30-day grace period. Your subscription will be cancelled immediately.
				</p>
			</div>

			<DialogRoot open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setConfirmName(""); setReason(""); setError(""); } }}>
				<DialogTrigger asChild>
					<Button variant="outline" size="sm" className="h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive">
						Request Deletion
					</Button>
				</DialogTrigger>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="text-sm font-semibold text-destructive flex items-center gap-2">
							<Trash2 className="w-4 h-4" /> Request Organization Deletion
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 pt-1">
						<p className="text-xs text-ink-3 leading-relaxed">
							This request will be reviewed by our team. Once approved, your subscription will be cancelled and all access will be revoked. This cannot be undone.
						</p>

						<div className="space-y-1.5">
							<Label className="text-xs">Reason (optional)</Label>
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value)}
								placeholder="Tell us why you're leaving…"
								maxLength={500}
								rows={3}
								className={cn(
									"w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-3/50",
									"focus:outline-none focus:ring-2 focus:ring-mint focus:border-transparent resize-none",
									"text-xs",
								)}
							/>
							<p className="text-[10px] text-ink-3 text-right">{reason.length}/500</p>
						</div>

						<div className="space-y-1.5">
							<Label className="text-xs">
								Type <span className="font-semibold text-ink">{orgName}</span> to confirm
							</Label>
							<Input
								value={confirmName}
								onChange={(e) => setConfirmName(e.target.value)}
								placeholder={orgName}
								className="h-9 text-sm"
							/>
						</div>

						{error && <p className="text-xs text-destructive">{error}</p>}

						<div className="flex justify-end gap-2 pt-1">
							<Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOpen(false)}>
								Cancel
							</Button>
							<Button
								size="sm"
								className="h-8 text-xs bg-destructive hover:bg-destructive/90 text-white"
								disabled={!nameMatches || isPending}
								onClick={() => submit()}
							>
								{isPending ? (
									<><Loader2 className="w-3 h-3 animate-spin mr-1" /> Submitting…</>
								) : "Submit Request"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>
		</div>
	);
}
