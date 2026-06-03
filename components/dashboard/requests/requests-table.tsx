"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import APIService from "@/lib/infra/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { RequestFormDialog } from "./request-form-dialog";
import { useAppSelector } from "@/store/hooks";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Inbox, Plus, Trash2, BellRing, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { ROWS_PER_PAGE } from "@/configs/pagination.config";
import type { LeaveRequest, LeaveRequestPage } from "./types";
import { TablePageSkeleton } from "@/components/skeletons/table-page-skeleton";

const STATUS_STYLES: Record<string, string> = {
	pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	approved: "bg-success/15 text-success-fg border-success/20",
	rejected: "bg-destructive/15 text-destructive border-destructive/20",
	cancelled: "bg-accent text-ink-3 border-border/40",
};

const TYPE_LABEL: Record<string, string> = {
	sick: "Sick",
	vacation: "Vacation",
	emergency: "Emergency",
};

const ALL_STATUSES = ["pending", "approved", "rejected", "cancelled"];

export function RequestsTable() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
	const statusFilter = searchParams.get("status") ?? "";
	const queryClient = useQueryClient();

	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";

	// Bulk selection state (admin only)
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [filtersOpen, setFiltersOpen] = useState(false);

	// Insufficient leave dialog state
	const [insufficientDialog, setInsufficientDialog] = useState<{
		open: boolean;
		request: LeaveRequest | null;
		reminded: boolean;
	}>({ open: false, request: null, reminded: false });

	const updateParam = (key: string, value: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (value) params.set(key, value);
		else params.delete(key);
		params.set("page", "1");
		router.push(`?${params.toString()}`);
		setSelected(new Set());
	};

	const goToPage = (p: number) => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", String(p));
		router.push(`?${params.toString()}`);
		setSelected(new Set());
	};
	const resetPage = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", "1");
		router.replace(`?${params.toString()}`);
	};

	const { data: result, isLoading, isError } = useQuery<LeaveRequestPage>({
		queryKey: ["requests", page, statusFilter],
		queryFn: () => APIService.requests.list(page, ROWS_PER_PAGE, statusFilter || undefined),
	});

	const invalidateAll = () => {
		queryClient.invalidateQueries({ queryKey: ["requests"] });
		setSelected(new Set());
	};

	const { mutateAsync: createRequest, isPending: isCreating } = useMutation({
		mutationFn: (data: { startDate: string; endDate: string; type: string; reason?: string }) =>
			APIService.requests.create(data),
		onSuccess: () => { invalidateAll(); resetPage(); },
	});

	const { mutateAsync: approveRequest, isPending: isApproving } = useMutation({
		mutationFn: (id: string) => APIService.requests.approve(id),
		onSuccess: invalidateAll,
	});

	const { mutateAsync: rejectRequest, isPending: isRejecting } = useMutation({
		mutationFn: (id: string) => APIService.requests.reject(id),
		onSuccess: invalidateAll,
	});

	const { mutateAsync: cancelRequest, isPending: isCancelling } = useMutation({
		mutationFn: (id: string) => APIService.requests.cancel(id),
		onSuccess: invalidateAll,
	});

	const { mutateAsync: deleteRequest, isPending: isDeleting } = useMutation({
		mutationFn: (id: string) => APIService.requests.remove(id),
		onSuccess: () => { invalidateAll(); resetPage(); },
	});

	const { mutateAsync: bulkDelete, isPending: isBulkDeleting } = useMutation({
		mutationFn: (ids: string[]) => APIService.requests.bulkDelete(ids),
		onSuccess: () => { invalidateAll(); resetPage(); },
	});

	const handleApprove = async (req: LeaveRequest) => {
		try {
			await approveRequest(req.id);
		} catch (err) {
			if (
				isAxiosError(err) &&
				err.response?.status === 400 &&
				typeof err.response?.data?.error === "string" &&
				err.response.data.error.toLowerCase().includes("leave balance")
			) {
				setInsufficientDialog({ open: true, request: req, reminded: false });
			}
		}
	};

	const list = result?.data ?? [];
	const totalPages = result?.totalPages ?? 1;

	const allIds = list.map((r: LeaveRequest) => r.id);
	const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

	const toggleRow = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAll = () => {
		if (allSelected) setSelected(new Set());
		else setSelected(new Set(allIds));
	};

	if (isLoading) {
		return <TablePageSkeleton />;
	}

	if (isError) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<p className="text-sm text-ink-3">Failed to load requests. Please try again.</p>
			</div>
		);
	}

	const TYPE_LABEL_MAP: Record<string, string> = {
		sick: "Sick",
		vacation: "Vacation",
		emergency: "Emergency",
	};

	const closeInsufficientDialog = () =>
		setInsufficientDialog({ open: false, request: null, reminded: false });

	const handleSendReminder = () => {
		setInsufficientDialog((prev) => ({ ...prev, reminded: true }));
		setTimeout(closeInsufficientDialog, 1800);
	};

	return (
		<div className="space-y-3">
			{/* Toolbar */}
			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					{/* Filter toggle */}
					<button
						type="button"
						onClick={() => setFiltersOpen((v) => !v)}
						className={cn(
							"relative h-8 w-8 flex items-center justify-center rounded-md border transition-colors",
							filtersOpen || !!statusFilter
								? "border-mint/50 bg-mint/10 text-mint"
								: "border-border bg-background text-ink-3 hover:text-ink hover:border-border/80",
						)}
						title="Filters"
					>
						<SlidersHorizontal className="w-3.5 h-3.5" />
						{!!statusFilter && (
							<span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-mint text-[9px] font-bold text-black flex items-center justify-center leading-none">
								1
							</span>
						)}
					</button>

					{/* Admin bulk delete */}
					{isAdmin && selected.size > 0 && (
						<Button
							size="sm"
							variant="destructive"
							className="h-8 gap-1.5"
							disabled={isBulkDeleting}
							onClick={() => bulkDelete(Array.from(selected))}
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete {selected.size} selected
						</Button>
					)}

					<div className="flex items-center gap-2 ml-auto">
						<p className="text-sm text-ink-3">
							{list.length} {list.length === 1 ? "request" : "requests"}
						</p>
						{!isAdmin && (
							<RequestFormDialog
								isPending={isCreating}
								onSubmit={async (data) => { await createRequest(data); }}
								trigger={
									<Button size="sm">
										<Plus className="w-4 h-4" />
										New request
									</Button>
								}
							/>
						)}
					</div>
				</div>

				{/* Filter row */}
				{filtersOpen && (
					<div className="flex items-center gap-2 flex-wrap">
						<Combobox
							options={[
								{ value: "", label: "All statuses" },
								...ALL_STATUSES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
							]}
							value={statusFilter}
							onChange={(v) => updateParam("status", v)}
							placeholder="All statuses"
						/>
						{statusFilter && (
							<button
								type="button"
								onClick={() => updateParam("status", "")}
								className="flex items-center gap-1 h-8 px-2 text-xs text-ink-3 hover:text-destructive transition-colors"
							>
								Clear
							</button>
						)}
					</div>
				)}
			</div>

			{/* Empty state */}
			{list.length === 0 && (
				<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
					<div className="w-12 h-12 rounded-xl bg-mint/15 flex items-center justify-center mb-4">
						<Inbox className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
					</div>
					<h3 className="font-semibold text-ink mb-1">No requests found</h3>
					<p className="text-sm text-ink-3 max-w-xs">
						{isAdmin
							? "Leave requests from your team will appear here."
							: "Submit a leave request to get started."}
					</p>
				</div>
			)}

			{/* Table */}
			{list.length > 0 && (
				<div key={`${page}-${statusFilter}`} className="animate-fade-in space-y-3">
					<div className="rounded-lg border overflow-x-auto">
						<table className="w-full min-w-[600px] text-sm">
							<thead>
								<tr className="border-b bg-accent/30">
									{/* Admin checkbox */}
									{isAdmin && (
										<th className="w-10 px-3 py-2">
											<input
												type="checkbox"
												checked={allSelected}
												onChange={toggleAll}
												className="rounded border-border cursor-pointer"
											/>
										</th>
									)}
									{isAdmin && (
										<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
											Employee
										</th>
									)}
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
										Type
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
										Dates
									</th>
									<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
										Status
									</th>
									<th className="px-4 py-2" />
								</tr>
							</thead>
							<tbody className="divide-y">
								{list.map((req: LeaveRequest) => (
									<tr key={req.id} className="hover:bg-accent/20 transition-colors">
										{/* Admin checkbox */}
										{isAdmin && (
											<td className="w-10 px-3 py-2">
												<input
													type="checkbox"
													checked={selected.has(req.id)}
													onChange={() => toggleRow(req.id)}
													className="rounded border-border cursor-pointer"
												/>
											</td>
										)}

										{/* Employee (admin only) */}
										{isAdmin && (
											<td className="px-4 py-2">
												<div className="min-w-0">
													<p className="font-medium text-ink truncate">
														{req.user?.name ?? "—"}
													</p>
													<p className="text-xs text-ink-3 truncate">
														{req.user?.email}
													</p>
												</div>
											</td>
										)}

										{/* Type */}
										<td className="px-4 py-2">
											<span className="font-medium text-ink capitalize">
												{TYPE_LABEL[req.type] ?? req.type}
											</span>
										</td>

										{/* Dates */}
										<td className="px-4 py-2 text-ink-3 text-xs hidden sm:table-cell">
											{formatDate(req.start)} → {formatDate(req.end)}
										</td>

										{/* Status */}
										<td className="px-4 py-2">
											<Badge
												variant="outline"
												className={cn("capitalize text-xs", STATUS_STYLES[req.status])}
											>
												{req.status}
											</Badge>
										</td>

										{/* Actions */}
										<td className="px-4 py-2">
											<div className="flex items-center justify-end gap-1">
												{/* Admin: approve/reject pending */}
												{isAdmin && req.status === "pending" && (
													<>
														<Button
															size="sm"
															variant="outline"
															className="h-7 text-xs text-success-fg border-success/30 hover:bg-success/10"
															disabled={isApproving}
															onClick={() => handleApprove(req)}
														>
															Approve
														</Button>
														<Button
															size="sm"
															variant="outline"
															className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
															disabled={isRejecting}
															onClick={() => rejectRequest(req.id)}
														>
															Reject
														</Button>
													</>
												)}
												{/* Admin: delete any request */}
											{isAdmin && (
												<Button
													size="sm"
													variant="ghost"
													className="h-7 text-xs text-destructive hover:text-destructive"
													disabled={isDeleting}
													onClick={() => deleteRequest(req.id)}
												>
													Delete
												</Button>
											)}
											{/* Employee: cancel pending */}
												{!isAdmin && req.status === "pending" && (
													<Button
														size="sm"
														variant="outline"
														className="h-7 text-xs"
														disabled={isCancelling}
														onClick={() => cancelRequest(req.id)}
													>
														Cancel
													</Button>
												)}
												{/* Employee: delete pending or cancelled */}
												{!isAdmin && (req.status === "pending" || req.status === "cancelled") && (
													<Button
														size="sm"
														variant="ghost"
														className="h-7 text-xs text-destructive hover:text-destructive"
														disabled={isDeleting}
														onClick={() => deleteRequest(req.id)}
													>
														Delete
													</Button>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<Pagination
						page={page}
						totalPages={totalPages}
						onPrev={() => goToPage(Math.max(1, page - 1))}
						onNext={() => goToPage(Math.min(totalPages, page + 1))}
						onGoTo={goToPage}
					/>
				</div>
			)}

		{/* Insufficient leave balance dialog */}
		<DialogRoot
			open={insufficientDialog.open}
			onOpenChange={(open) => { if (!open) closeInsufficientDialog(); }}
		>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Insufficient Leave Balance</DialogTitle>
				</DialogHeader>

				{insufficientDialog.reminded ? (
					<div className="flex flex-col items-center gap-3 py-4 text-center">
						<CheckCircle2 className="w-10 h-10 text-mint" strokeWidth={1.5} />
						<p className="text-sm font-medium text-ink">Reminder sent</p>
						<p className="text-xs text-ink-3">
							{insufficientDialog.request?.user?.name ?? "The employee"} has been notified.
						</p>
					</div>
				) : (
					<>
						<div className="py-2 space-y-3">
							<p className="text-sm text-ink">
								<span className="font-medium">
									{insufficientDialog.request?.user?.name ?? "This employee"}
								</span>{" "}
								has no remaining{" "}
								<span className="font-medium">
									{TYPE_LABEL_MAP[insufficientDialog.request?.type ?? ""] ?? insufficientDialog.request?.type}
								</span>{" "}
								leave days.
							</p>
							<p className="text-xs text-ink-3">
								You can dismiss this notice or send a reminder to the employee to check their leave balance.
							</p>
						</div>

						<div className="flex justify-end gap-2 mt-4">
							<Button variant="outline" onClick={closeInsufficientDialog}>
								Dismiss
							</Button>
							<Button
								onClick={handleSendReminder}
								className="gap-2 bg-mint hover:bg-mint-hover text-ink font-semibold"
							>
								<BellRing className="w-4 h-4" />
								Send Reminder
							</Button>
						</div>
					</>
				)}
			</DialogContent>
		</DialogRoot>
		</div>
	);
}
