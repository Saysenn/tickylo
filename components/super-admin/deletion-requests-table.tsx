"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Building2, Clock, Trash2, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface DeletionRequest {
	id: string;
	org_id: string;
	requested_by: string;
	reason: string | null;
	status: string;
	reject_reason: string | null;
	reviewed_at: Date | null;
	created_at: Date;
	org: {
		name: string;
		plan: string;
		seat_count: number;
		created_at: Date;
	};
}

const PLAN_COLORS: Record<string, string> = {
	pending:    "text-ink-3 bg-accent",
	unpaid:     "text-amber-600 bg-amber-500/10",
	trial:      "text-blue-600 bg-blue-500/10",
	business:   "text-green-600 bg-green-500/10",
	enterprise: "text-purple-600 bg-purple-500/10",
	cancelled:  "text-red-500 bg-red-500/10",
};

const TABS = [
	{ key: "pending",  label: "Pending" },
	{ key: "approved", label: "Approved" },
	{ key: "rejected", label: "Rejected" },
];

export function DeletionRequestsTable({
	requests,
	activeTab,
}: {
	requests: DeletionRequest[];
	activeTab: string;
}) {
	const router = useRouter();

	const [approveTarget, setApproveTarget] = useState<DeletionRequest | null>(null);
	const [rejectTarget, setRejectTarget]   = useState<DeletionRequest | null>(null);
	const [rejectReason, setRejectReason]   = useState("");

	const { mutate: approve, isPending: approving } = useMutation({
		mutationFn: (id: string) => APIService.superAdmin.approveDeletion(id),
		onSuccess: () => {
			setApproveTarget(null);
			router.refresh();
		},
	});

	const { mutate: reject, isPending: rejecting } = useMutation({
		mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
			APIService.superAdmin.rejectDeletion(id, reason),
		onSuccess: () => {
			setRejectTarget(null);
			setRejectReason("");
			router.refresh();
		},
	});

	return (
		<>
			{/* Tabs */}
			<div className="flex gap-1 border-b border-border/60">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => router.push(`/super-admin/deletion-requests?tab=${tab.key}`)}
						className={cn(
							"px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
							activeTab === tab.key
								? "border-mint text-mint"
								: "border-transparent text-ink-3 hover:text-ink",
						)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Table */}
			{requests.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<Trash2 className="w-8 h-8 text-ink-3/30 mb-3" />
					<p className="text-sm text-ink-3">No {activeTab} deletion requests</p>
					{activeTab === "pending" && (
						<p className="text-xs text-ink-3/60 mt-1">All clear — no organizations have requested deletion.</p>
					)}
				</div>
			) : (
				<div className="glass rounded-xl overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border/60 bg-accent/40">
								<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Organization</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Plan</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Reason</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Requested</th>
								{activeTab === "rejected" && (
									<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Reject Reason</th>
								)}
								{activeTab === "pending" && (
									<th className="px-4 py-3 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Actions</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-border/40">
							{requests.map((req) => (
								<tr key={req.id} className="hover:bg-accent/30 transition-colors">
									<td className="px-4 py-3.5">
										<div className="flex items-center gap-2">
											<div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
												<Building2 className="w-3.5 h-3.5 text-red-500" />
											</div>
											<div>
												<p className="font-medium text-ink text-sm">{req.org.name}</p>
												<p className="text-[11px] text-ink-3">{req.org.seat_count} seats · joined {formatDate(req.org.created_at.toISOString())}</p>
											</div>
										</div>
									</td>
									<td className="px-4 py-3.5">
										<span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", PLAN_COLORS[req.org.plan] ?? "text-ink-3 bg-accent")}>
											{req.org.plan}
										</span>
									</td>
									<td className="px-4 py-3.5 max-w-xs">
										<p className="text-xs text-ink-3 line-clamp-2">
											{req.reason || <span className="italic">No reason provided</span>}
										</p>
									</td>
									<td className="px-4 py-3.5">
										<div className="flex items-center gap-1.5 text-xs text-ink-3">
											<Clock className="w-3 h-3" />
											{formatDate(req.created_at.toISOString())}
										</div>
									</td>
									{activeTab === "rejected" && (
										<td className="px-4 py-3.5 max-w-xs">
											<p className="text-xs text-ink-3 line-clamp-2">
												{req.reject_reason || <span className="italic">—</span>}
											</p>
										</td>
									)}
									{activeTab === "pending" && (
										<td className="px-4 py-3.5">
											<div className="flex items-center gap-2 justify-end">
												<Button
													size="sm"
													variant="ghost"
													className="h-7 gap-1.5 text-green-600 hover:text-green-600 hover:bg-green-500/10"
													onClick={() => setApproveTarget(req)}
												>
													<CheckCircle2 className="w-3.5 h-3.5" />
													Approve
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="h-7 gap-1.5 text-red-500 hover:text-red-500 hover:bg-red-500/10"
													onClick={() => setRejectTarget(req)}
												>
													<XCircle className="w-3.5 h-3.5" />
													Reject
												</Button>
											</div>
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Approve confirm dialog */}
			<DialogRoot open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-red-600">
							<AlertTriangle className="w-4 h-4" />
							Approve Deletion
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						{approveTarget && (
							<>
								<div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-1.5">
									<p className="text-sm font-semibold text-ink">{approveTarget.org.name}</p>
									<p className="text-xs text-ink-3">Plan: <span className="capitalize font-medium">{approveTarget.org.plan}</span> · {approveTarget.org.seat_count} seats</p>
								</div>
								<div className="space-y-1.5 text-xs text-ink-3 leading-relaxed">
									<p>Approving will immediately:</p>
									<ul className="list-disc list-inside space-y-1 pl-1">
										<li>Cancel the Stripe subscription</li>
										<li>Revoke all team members' access</li>
										<li>Mark the org as cancelled</li>
									</ul>
									<p className="text-amber-600 font-medium">This cannot be undone.</p>
								</div>
							</>
						)}
						<div className="flex gap-2 justify-end">
							<Button size="sm" variant="ghost" onClick={() => setApproveTarget(null)}>
								Cancel
							</Button>
							<Button
								size="sm"
								variant="destructive"
								isLoading={approving}
								onClick={() => approveTarget && approve(approveTarget.id)}
							>
								Approve Deletion
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>

			{/* Reject dialog */}
			<DialogRoot open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Reject Deletion Request</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						{rejectTarget && (
							<p className="text-sm text-ink-3">
								Rejecting the deletion request for{" "}
								<span className="font-semibold text-ink">{rejectTarget.org.name}</span>.
								The admin will be notified.
							</p>
						)}
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-ink-3 uppercase tracking-wider">
								Reason <span className="text-ink-3 font-normal">(optional)</span>
							</label>
							<textarea
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-mint resize-none"
								rows={3}
								placeholder="Explain why the deletion request was rejected…"
								value={rejectReason}
								onChange={(e) => setRejectReason(e.target.value)}
							/>
						</div>
						<div className="flex gap-2 justify-end">
							<Button
								size="sm"
								variant="ghost"
								onClick={() => { setRejectTarget(null); setRejectReason(""); }}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								variant="destructive"
								isLoading={rejecting}
								onClick={() => rejectTarget && reject({ id: rejectTarget.id, reason: rejectReason.trim() || undefined })}
							>
								Reject Request
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>
		</>
	);
}
