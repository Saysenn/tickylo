"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Building2, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import APIService from "@/lib/infra/api";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Application {
	id: string;
	company_name: string;
	admin_name: string;
	admin_email: string;
	reason: string | null;
	status: string;
	created_at: Date;
}

const TABS = [
	{ key: "pending",  label: "Pending" },
	{ key: "approved", label: "Approved" },
	{ key: "rejected", label: "Rejected" },
];

export function ApplicationsTable({
	applications,
	activeTab,
}: {
	applications: Application[];
	activeTab: string;
}) {
	const router = useRouter();

	const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
	const [rejectReason, setRejectReason] = useState("");

	const { mutate: approve, isPending: approving } = useMutation({
		mutationFn: (id: string) => APIService.superAdmin.approveApplication(id),
		onSuccess: () => router.refresh(),
	});

	const { mutate: reject, isPending: rejecting } = useMutation({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			APIService.superAdmin.rejectApplication(id, reason),
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
						onClick={() => router.push(`/super-admin/applications?tab=${tab.key}`)}
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
			{applications.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<Building2 className="w-8 h-8 text-ink-3/30 mb-3" />
					<p className="text-sm text-ink-3">No {activeTab} applications</p>
				</div>
			) : (
				<div className="glass rounded-xl overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border/60 bg-accent/40">
								<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Company</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Admin</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Reason / Description</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-ink-3 uppercase tracking-wider">Submitted</th>
								{activeTab === "pending" && (
									<th className="px-4 py-3 text-right text-xs font-semibold text-ink-3 uppercase tracking-wider">Actions</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-border/40">
							{applications.map((app) => (
								<tr key={app.id} className="hover:bg-accent/30 transition-colors">
									<td className="px-4 py-3.5">
										<p className="font-medium text-ink">{app.company_name}</p>
									</td>
									<td className="px-4 py-3.5">
										<p className="text-ink">{app.admin_name}</p>
										<p className="text-xs text-ink-3">{app.admin_email}</p>
									</td>
									<td className="px-4 py-3.5 max-w-xs">
										<p className="text-ink-3 text-xs line-clamp-2">
											{app.reason || <span className="italic">No reason provided</span>}
										</p>
									</td>
									<td className="px-4 py-3.5">
										<div className="flex items-center gap-1.5 text-xs text-ink-3">
											<Clock className="w-3 h-3" />
											{formatDate(app.created_at.toISOString())}
										</div>
									</td>
									{activeTab === "pending" && (
										<td className="px-4 py-3.5">
											<div className="flex items-center gap-2 justify-end">
												<Button
													size="sm"
													variant="ghost"
													className="h-7 gap-1.5 text-green-600 hover:text-green-600 hover:bg-green-500/10"
													isLoading={approving}
													onClick={() => approve(app.id)}
												>
													<CheckCircle2 className="w-3.5 h-3.5" />
													Approve
												</Button>
												<Button
													size="sm"
													variant="ghost"
													className="h-7 gap-1.5 text-red-500 hover:text-red-500 hover:bg-red-500/10"
													onClick={() => setRejectTarget(app)}
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

			{/* Reject dialog */}
			<DialogRoot open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Reject Application</DialogTitle>
					</DialogHeader>
					<div className="space-y-4 pt-2">
						{rejectTarget && (
							<p className="text-sm text-ink-3">
								You are rejecting <span className="font-semibold text-ink">{rejectTarget.company_name}</span>.
								The admin will receive an email with your reason.
							</p>
						)}
						<div className="space-y-1.5">
							<label className="text-xs font-medium text-ink-3 uppercase tracking-wider">
								Reason <span className="text-red-500">*</span>
							</label>
							<textarea
								className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-mint resize-none"
								rows={4}
								placeholder="Explain why this application is being rejected..."
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
								disabled={!rejectReason.trim()}
								onClick={() => rejectTarget && reject({ id: rejectTarget.id, reason: rejectReason })}
							>
								Reject Application
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>
		</>
	);
}
