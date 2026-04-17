"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import {
	SelectRoot,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from "@/components/ui/select";
import { useAppSelector } from "@/store/hooks";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { ArrowLeft, UserCog, ArrowRightLeft } from "lucide-react";
import type { Task } from "@/components/dashboard/tasks/types";
import { TaskThread } from "@/components/dashboard/tasks/task-thread";

const STATUS_STYLES: Record<string, string> = {
	pending: "bg-accent text-ink-3 border-border/40",
	assigned: "bg-blue-500/15 text-blue-700 border-blue-500/20",
	in_progress: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	completed: "bg-green-500/15 text-green-700 border-green-500/20",
};

const STATUS_LABEL: Record<string, string> = {
	pending: "Unassigned",
	assigned: "Assigned",
	in_progress: "In Progress",
	completed: "Completed",
};

const PRIORITY_STYLES: Record<string, string> = {
	low: "bg-accent text-ink-3 border-border/40",
	medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/20",
	high: "bg-red-500/15 text-red-700 border-red-500/20",
};

interface Employee {
	id: string;
	name: string | null;
	email: string;
}

interface TaskDetail extends Task {
	creator?: { id: string; name: string | null; email: string } | null;
}

export default function TaskDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const queryClient = useQueryClient();

	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";

	const [reassignOpen, setReassignOpen] = useState(false);
	const [reassignTo, setReassignTo] = useState("");

	const [transferOpen, setTransferOpen] = useState(false);
	const [transferTo, setTransferTo] = useState(""); // "" = let admin decide

	const { data: task, isLoading, isError } = useQuery<TaskDetail>({
		queryKey: ["task", id],
		queryFn: () => APIService.tasks.get(id),
		enabled: !!id,
	});

	// Employees list — fetched when either dialog opens
	const dialogOpen = reassignOpen || transferOpen;
	const { data: employeesResult } = useQuery<{ data: Employee[] }>({
		queryKey: ["employees-list"],
		queryFn: () => APIService.employees.list(1, 50),
		enabled: dialogOpen,
	});
	const employees = employeesResult?.data ?? [];

	// Workload — fetched when reassign dialog opens (admin only)
	const { data: workload = {} } = useQuery<Record<string, number>>({
		queryKey: ["employees-workload"],
		queryFn: () => APIService.employees.workload(),
		enabled: isAdmin && reassignOpen,
	});

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["task", id] });
		queryClient.invalidateQueries({ queryKey: ["tasks"] });
	};

	const invalidateComments = () =>
		queryClient.invalidateQueries({ queryKey: ["task-comments", id] });

	const { mutateAsync: claimTask, isPending: isClaiming } = useMutation({
		mutationFn: () => APIService.tasks.claim(id),
		onSuccess: invalidate,
	});

	const { mutateAsync: startTask, isPending: isStarting } = useMutation({
		mutationFn: () => APIService.tasks.start(id),
		onSuccess: invalidate,
	});

	const { mutateAsync: completeTask, isPending: isCompleting } = useMutation({
		mutationFn: () => APIService.tasks.complete(id),
		onSuccess: invalidate,
	});

	const { mutateAsync: reassignTask, isPending: isReassigning } = useMutation({
		mutationFn: (employeeId: string) => APIService.tasks.assign(id, employeeId),
		onSuccess: () => {
			invalidate();
			invalidateComments();
			setReassignOpen(false);
			setReassignTo("");
		},
	});

	const { mutateAsync: requestTransfer, isPending: isRequesting } = useMutation({
		mutationFn: (requestedTo?: string) =>
			APIService.tasks.requestTransfer(id, requestedTo || undefined),
		onSuccess: () => {
			invalidateComments();
			setTransferOpen(false);
			setTransferTo("");
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
			</div>
		);
	}

	if (isError || !task) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<p className="text-sm text-ink-3">Task not found or you don&apos;t have access.</p>
				<Button variant="ghost" size="sm" className="mt-3" onClick={() => router.back()}>
					Go back
				</Button>
			</div>
		);
	}

	const isAssignee = task.user_id === user?.id;
	const canRequestTransfer =
		!isAdmin &&
		isAssignee &&
		(task.status === "assigned" || task.status === "in_progress");

	return (
		<div className="w-full space-y-6">
			{/* Header */}
			<div className="flex items-center gap-3">
				<Button
					variant="ghost"
					size="sm"
					className="gap-1.5 text-ink-3 hover:text-ink"
					onClick={() => router.back()}
				>
					<ArrowLeft className="w-4 h-4" />
					Back
				</Button>
			</div>

			{/* Task card */}
			<div className="rounded-lg border bg-background p-6 space-y-6">
				{/* Title + badges */}
				<div className="space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" className={cn("text-xs", STATUS_STYLES[task.status])}>
							{STATUS_LABEL[task.status] ?? task.status}
						</Badge>
						{task.priority && (
							<Badge variant="outline" className={cn("capitalize text-xs", PRIORITY_STYLES[task.priority])}>
								{task.priority}
							</Badge>
						)}
					</div>
					<h1 className="text-2xl font-bold text-ink">{task.title}</h1>
					{task.description && (
						<p className="text-ink-3 text-sm whitespace-pre-wrap">{task.description}</p>
					)}
				</div>

				{/* Metadata grid */}
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t">
					<div>
						<p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Assignee</p>
						<p className="text-sm text-ink font-medium">
							{task.assignee
								? (task.assignee.name ?? task.assignee.email)
								: <span className="text-ink-3">Unassigned</span>}
						</p>
					</div>
					<div>
						<p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Due Date</p>
						<p className="text-sm text-ink font-medium">
							{task.due_date ? formatDate(task.due_date) : <span className="text-ink-3">—</span>}
						</p>
					</div>
					<div>
						<p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Created</p>
						<p className="text-sm text-ink font-medium">{formatDate(task.created_at)}</p>
					</div>
					{task.assigned_at && (
						<div>
							<p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Assigned</p>
							<p className="text-sm text-ink font-medium">{formatDate(task.assigned_at)}</p>
						</div>
					)}
					{task.started_at && (
						<div>
							<p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Started</p>
							<p className="text-sm text-ink font-medium">{formatDate(task.started_at)}</p>
						</div>
					)}
					{task.completed_at && (
						<div>
							<p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Completed</p>
							<p className="text-sm text-ink font-medium">{formatDate(task.completed_at)}</p>
						</div>
					)}
					{task.creator && (
						<div>
							<p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Created by</p>
							<p className="text-sm text-ink font-medium">
								{task.creator.name ?? task.creator.email}
							</p>
						</div>
					)}
				</div>

				{/* Employee actions */}
				{!isAdmin && (
					<div className="flex flex-wrap gap-2 pt-4 border-t">
						{task.status === "pending" && (
							<Button size="sm" variant="outline" disabled={isClaiming} onClick={() => claimTask()}>
								Claim task
							</Button>
						)}
						{task.status === "assigned" && isAssignee && (
							<Button size="sm" variant="outline" disabled={isStarting} onClick={() => startTask()}>
								Start task
							</Button>
						)}
						{task.status === "in_progress" && isAssignee && (
							<Button
								size="sm"
								className="bg-green-600 hover:bg-green-700 text-white"
								disabled={isCompleting}
								onClick={() => completeTask()}
							>
								Mark complete
							</Button>
						)}
						{canRequestTransfer && (
							<Button
								size="sm"
								variant="outline"
								className="gap-1.5 text-ink-3"
								onClick={() => setTransferOpen(true)}
							>
								<ArrowRightLeft className="w-3.5 h-3.5" />
								Request transfer
							</Button>
						)}
					</div>
				)}

				{/* Admin actions */}
				{isAdmin && task.status !== "completed" && (
					<div className="flex flex-wrap gap-2 pt-4 border-t">
						<Button
							size="sm"
							variant="outline"
							className="gap-1.5"
							onClick={() => setReassignOpen(true)}
						>
							<UserCog className="w-3.5 h-3.5" />
							Reassign
						</Button>
					</div>
				)}
			</div>

			{/* ── Reassign dialog (admin) ── */}
			<DialogRoot open={reassignOpen} onOpenChange={(o) => { setReassignOpen(o); if (!o) setReassignTo(""); }}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Reassign Task</DialogTitle>
						<DialogDescription>
							Active task counts shown to help balance workload.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-1">
						<SelectRoot value={reassignTo} onValueChange={setReassignTo}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select employee…" />
							</SelectTrigger>
							<SelectContent>
								{employees.map((e) => {
									const count = workload[e.id] ?? 0;
									return (
										<SelectItem key={e.id} value={e.id}>
											<span className="flex items-center justify-between w-full gap-4">
												<span>{e.name ?? e.email}</span>
												<span className={cn(
													"text-[10px] font-medium px-1.5 py-0.5 rounded",
													count === 0
														? "bg-mint/15 text-mint"
														: count <= 3
														? "bg-yellow-500/10 text-yellow-600"
														: "bg-red-500/10 text-red-600",
												)}>
													{count} active
												</span>
											</span>
										</SelectItem>
									);
								})}
							</SelectContent>
						</SelectRoot>
						<div className="flex justify-end gap-2">
							<Button variant="outline" size="sm" onClick={() => setReassignOpen(false)}>
								Cancel
							</Button>
							<Button
								size="sm"
								disabled={!reassignTo || isReassigning}
								isLoading={isReassigning}
								onClick={() => reassignTask(reassignTo)}
							>
								Confirm
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>

			{/* ── Request Transfer dialog (assignee) ── */}
			<DialogRoot open={transferOpen} onOpenChange={(o) => { setTransferOpen(o); if (!o) setTransferTo(""); }}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Request Transfer</DialogTitle>
						<DialogDescription>
							Pick a team member or leave blank to let admin decide. A note will be posted in the thread.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-1">
						<SelectRoot value={transferTo} onValueChange={setTransferTo}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Let admin decide (no preference)" />
							</SelectTrigger>
							<SelectContent>
								{employees
									.filter((e) => e.id !== user?.id)
									.map((e) => (
										<SelectItem key={e.id} value={e.id}>
											{e.name ?? e.email}
										</SelectItem>
									))}
							</SelectContent>
						</SelectRoot>
						<div className="flex justify-end gap-2">
							<Button variant="outline" size="sm" onClick={() => setTransferOpen(false)}>
								Cancel
							</Button>
							<Button
								size="sm"
								isLoading={isRequesting}
								onClick={() => requestTransfer(transferTo || undefined)}
							>
								Send request
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>

			{/* Thread */}
			<div className="rounded-lg border bg-background p-6">
				<TaskThread taskId={id} taskCreatedBy={task.created_by} />
			</div>
		</div>
	);
}
