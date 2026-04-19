"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { useAppSelector } from "@/store/hooks";
import { formatDate, formatDuration } from "@/lib/utils/format";
import type { TimeEntry } from "@/components/dashboard/time-tracker/types";
import { cn } from "@/lib/utils/cn";
import {
	ArrowLeft, UserCog, ArrowRightLeft, Eye, EyeOff,
	Clock, DollarSign, FileText, AlertTriangle, Pencil,
	Play, Square, Timer, RotateCcw, Check, X, Pause, Archive,
	User, Calendar, Building2, CheckSquare, Link2, ExternalLink,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Task, TicketType, TicketLink } from "@/components/dashboard/tasks/types";
import { TaskThread } from "@/components/dashboard/tasks/task-thread";
import { TaskSubtasks } from "@/components/dashboard/tasks/task-subtasks";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LinksEditor } from "@/components/dashboard/tasks/links-editor";

// ── Constants ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
	needs_approval: "bg-purple-500/10 text-purple-600 border-purple-500/20",
	pending:        "bg-slate-500/10 text-slate-600 border-slate-500/20",
	assigned:       "bg-blue-500/10 text-blue-600 border-blue-500/20",
	in_progress:    "bg-amber-500/10 text-amber-600 border-amber-500/20",
	on_hold:        "bg-orange-500/10 text-orange-600 border-orange-500/20",
	stale:          "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
	completed:      "bg-green-500/10 text-green-600 border-green-500/20",
	closed:         "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
	rejected:       "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
};

const STATUS_LABEL: Record<string, string> = {
	needs_approval: "Needs Approval",
	pending:        "Open",
	assigned:       "Assigned",
	in_progress:    "In Progress",
	on_hold:        "On Hold",
	stale:          "Stale",
	completed:      "Resolved",
	closed:         "Closed",
	rejected:       "Rejected",
};

const PRIORITY_STYLES: Record<string, string> = {
	low:      "bg-slate-500/10 text-slate-500 border-slate-500/20",
	medium:   "bg-amber-500/10 text-amber-600 border-amber-500/20",
	high:     "bg-red-500/10 text-red-600 border-red-500/20",
	critical: "bg-red-900/20 text-red-700 border-red-700/30",
};

const TICKET_TYPE_CONFIG: Record<string, { label: string; strip: string; badgeCls: string }> = {
	internal_task: { label: "Internal Task",       strip: "border-border/40 bg-accent/30",           badgeCls: "bg-accent text-ink-2 border-border/40" },
	request:       { label: "Request",             strip: "border-blue-500/15 bg-blue-500/5",        badgeCls: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
	incident:      { label: "Incident",            strip: "border-red-500/15 bg-red-500/5",          badgeCls: "bg-red-500/10 text-red-600 border-red-500/20" },
	change:        { label: "Request for Change",  strip: "border-orange-500/15 bg-orange-500/5",    badgeCls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
};

const DONE_STATUSES = ["completed", "closed", "rejected"];

// Shared prose className for all markdown renders in this page
const PROSE_CLS = [
	"prose max-w-none leading-relaxed",
	"text-xs text-ink-2",
	"[&_p]:my-1 [&_p]:text-xs",
	"[&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc",
	"[&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal",
	"[&_li]:my-0 [&_li]:text-xs",
	"[&_h1]:text-sm [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1",
	"[&_h2]:text-xs [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1",
	"[&_h3]:text-xs [&_h3]:font-medium [&_h3]:mt-1.5 [&_h3]:mb-0.5",
	"[&_strong]:text-ink [&_strong]:font-semibold",
	"[&_em]:italic",
	"[&_code]:bg-accent/60 [&_code]:px-1 [&_code]:rounded [&_code]:text-[11px] [&_code]:font-mono",
	"[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-ink-3 [&_blockquote]:italic",
	"[&_a]:text-mint [&_a]:underline",
	"[&_hr]:border-border/40 [&_hr]:my-2",
].join(" ");

// ── Types ──────────────────────────────────────────────────────────────────

interface Employee { id: string; name: string | null; email: string }
interface TicketDetail extends Task {
	creator?: { id: string; name: string | null; email: string } | null;
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function TicketDetailPage() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const queryClient = useQueryClient();
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";

	// Dialog state
	const [reassignOpen, setReassignOpen] = useState(false);
	const [reassignTo,   setReassignTo]   = useState("");
	const [transferOpen, setTransferOpen] = useState(false);
	const [transferTo,   setTransferTo]   = useState("");
	const [editOpen,     setEditOpen]     = useState(false);
	const [switchOpen,   setSwitchOpen]   = useState(false);
	const [planView,      setPlanView]      = useState<"implementation" | "rollback" | null>(null);
	const [subtasksOpen,  setSubtasksOpen]  = useState(false);
	const [rejectOpen,    setRejectOpen]    = useState(false);
	const [rejectReason,  setRejectReason]  = useState("");

	// Timer state
	const [timerElapsed, setTimerElapsed] = useState("00:00:00");

	const [billableDraft, setBillableDraft] = useState("");


	// ── Data fetching ────────────────────────────────────────────────────

	const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
		queryKey: ["task", id],
		queryFn: () => APIService.tasks.get(id),
		enabled: !!id,
	});

	const dialogOpen = reassignOpen || transferOpen;
	const { data: employeesResult } = useQuery<{ data: Employee[] }>({
		queryKey: ["employees-list"],
		queryFn: () => APIService.employees.list(1, 50),
		enabled: dialogOpen || editOpen,
	});
	const employees = employeesResult?.data ?? [];

	const { data: workload = {} } = useQuery<Record<string, number>>({
		queryKey: ["employees-workload"],
		queryFn: () => APIService.employees.workload(),
		enabled: isAdmin && reassignOpen,
	});

	const { data: watchersData } = useQuery<{ isWatching: boolean; count: number }>({
		queryKey: ["task-watchers", id],
		queryFn: () => APIService.tasks.watchers.list(id),
		enabled: !!id,
	});
	const isWatching   = watchersData?.isWatching ?? false;
	const watcherCount = watchersData?.count ?? 0;

	const { data: subtasksData = [] } = useQuery<{ id: string; completed: boolean }[]>({
		queryKey: ["task-subtasks", id],
		queryFn: () => APIService.tasks.subtasks.list(id),
		enabled: !!id,
	});
	const subtaskTotal = subtasksData.length;
	const subtaskDone  = subtasksData.filter((s) => s.completed).length;

	const { data: activeEntry, refetch: refetchTimer } = useQuery<TimeEntry | null>({
		queryKey: ["time", "active"],
		queryFn: () => APIService.time.active(),
		refetchOnWindowFocus: true,
		refetchOnMount: true,
		staleTime: 0,
	});

	const isDone           = DONE_STATUSES.includes(ticket?.status ?? "");
	const needsApproval    = ticket?.status === "needs_approval";
	const activeOnThis     = activeEntry?.ticket_id === id;
	const activeOnOther    = !!activeEntry && !activeOnThis;

	// ── Timer tick ───────────────────────────────────────────────────────

	useEffect(() => {
		if (!activeOnThis || !activeEntry) { setTimerElapsed("00:00:00"); return; }
		const tick = () => setTimerElapsed(formatDuration(Date.now() - new Date(activeEntry.start_time).getTime()));
		tick();
		const iv = setInterval(tick, 1000);
		return () => clearInterval(iv);
	}, [activeOnThis, activeEntry]);

	useEffect(() => {
		if (ticket?.billable_hours != null) setBillableDraft(String(ticket.billable_hours));
	}, [ticket?.billable_hours]);

	// ── Mutations ────────────────────────────────────────────────────────

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["task", id] });
		queryClient.invalidateQueries({ queryKey: ["tasks"] });
	};
	const invalidateComments  = () => queryClient.invalidateQueries({ queryKey: ["task-comments", id] });
	const invalidateWatchers  = () => queryClient.invalidateQueries({ queryKey: ["task-watchers", id] });
	const invalidateTimer     = () => queryClient.invalidateQueries({ queryKey: ["time", "active"] });

	const { mutateAsync: claimTask,    isPending: isClaiming }    = useMutation({ mutationFn: () => APIService.tasks.claim(id),    onSuccess: invalidate });
	const { mutateAsync: completeTask, isPending: isCompleting }  = useMutation({ mutationFn: () => APIService.tasks.complete(id), onSuccess: invalidate });
	const { mutateAsync: reopenTask,   isPending: isReopening }   = useMutation({ mutationFn: () => APIService.tasks.reopen(id),   onSuccess: invalidate });
	const { mutateAsync: holdTicket,   isPending: isHolding }     = useMutation({
		mutationFn: () => APIService.tasks.hold(id),
		onSuccess: async () => { invalidate(); await refetchTimer(); },
	});
	const { mutateAsync: updateTicket, isPending: isUpdating }    = useMutation({ mutationFn: (data: object) => APIService.tasks.update(id, data), onSuccess: invalidate });
	const { mutateAsync: reassignTask, isPending: isReassigning } = useMutation({
		mutationFn: (eid: string) => APIService.tasks.assign(id, eid),
		onSuccess: () => { invalidate(); invalidateComments(); setReassignOpen(false); setReassignTo(""); },
	});
	const { mutateAsync: requestTransfer, isPending: isRequesting } = useMutation({
		mutationFn: (to?: string) => APIService.tasks.requestTransfer(id, to),
		onSuccess: () => { invalidateComments(); setTransferOpen(false); setTransferTo(""); },
	});
	const { mutateAsync: watchTicket,   isPending: isWatchPending }   = useMutation({ mutationFn: () => APIService.tasks.watchers.watch(id),   onSuccess: invalidateWatchers });
	const { mutateAsync: unwatchTicket, isPending: isUnwatchPending } = useMutation({ mutationFn: () => APIService.tasks.watchers.unwatch(id), onSuccess: invalidateWatchers });
	const { mutateAsync: approveTicket, isPending: isApproving } = useMutation({ mutationFn: () => APIService.tasks.approve(id), onSuccess: invalidate });
	const { mutateAsync: rejectTicket,  isPending: isRejecting  } = useMutation({
		mutationFn: (reason?: string) => APIService.tasks.reject(id, reason),
		onSuccess: () => { invalidate(); setRejectOpen(false); setRejectReason(""); },
	});
	const { mutateAsync: staleTicket,   isPending: isStaling }    = useMutation({ mutationFn: () => APIService.tasks.stale(id),   onSuccess: invalidate });
	const { mutateAsync: updateBillable } = useMutation({ mutationFn: (h: number | null) => APIService.tasks.updateBillable(id, h), onSuccess: invalidate });
	const { mutateAsync: adminHold,      isPending: isAdminHolding } = useMutation({
		mutationFn: () => APIService.tasks.hold(id),
		onSuccess: async () => { invalidate(); await refetchTimer(); },
	});

	const { mutateAsync: startTimer, isPending: isStartingTimer } = useMutation({
		mutationFn: () => APIService.time.start({ ticket_id: id }),
		onSuccess: async () => {
			await refetchTimer();
			invalidate(); // ticket transitions to in_progress
		},
	});
	const { mutateAsync: stopTimer, isPending: isStoppingTimer } = useMutation({
		mutationFn: () => APIService.time.stop(activeEntry!.id, { title: ticket?.title }),
		onSuccess: async () => {
			await refetchTimer();
			queryClient.invalidateQueries({ queryKey: ["time"] });
			invalidate(); // ticket reverts to assigned
		},
	});

	// Start timer only — employee must explicitly click "Start working" to move status
	const handleStartTimer = async () => {
		await startTimer();
	};

	// Complete first so the ticket lands on "completed", then stop the timer
	// (timer stop would otherwise revert in_progress → assigned before completion)
	const handleComplete = async () => {
		if (isAssignee && billableDraft !== "") {
			await updateBillable(parseFloat(billableDraft));
		}
		await completeTask();
		if (activeOnThis) await stopTimer();
	};
	const handleSwitchTimer = async () => {
		await stopTimer();
		await startTimer();
		setSwitchOpen(false);
	};

	// ── Loading / error states ────────────────────────────────────────────

	if (isLoading) return (
		<div className="flex items-center justify-center py-32">
			<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
		</div>
	);

	if (isError || !ticket) return (
		<div className="flex flex-col items-center justify-center py-32 text-center">
			<p className="text-sm text-ink-3">Ticket not found or you don&apos;t have access.</p>
			<Button variant="ghost" size="sm" className="mt-3" onClick={() => router.back()}>Go back</Button>
		</div>
	);

	// ── Derived state ────────────────────────────────────────────────────

	const isAssignee    = ticket.user_id === user?.id;
	const isStale       = ticket.status === "stale";
	const typeConfig    = TICKET_TYPE_CONFIG[ticket.ticket_type ?? "internal_task"] ?? TICKET_TYPE_CONFIG.internal_task;
	const displayId     = `#${id.slice(-8).toUpperCase()}`;
	const isOverdue     = ticket.due_date && !DONE_STATUSES.includes(ticket.status) && new Date(ticket.due_date) < new Date();
	const canTransfer   = !isAdmin && isAssignee && (ticket.status === "assigned" || ticket.status === "in_progress");
	const canTimer      = !isAdmin && isAssignee && !isDone && !isStale;

	// ── Render ────────────────────────────────────────────────────────────

	return (
		<div className="w-full max-w-6xl mx-auto space-y-4">

			{/* ── Breadcrumb / nav ── */}
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => router.back()}
					className="flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors"
				>
					<ArrowLeft className="w-4 h-4" />
					Tickets
				</button>
				<span className="text-xs font-mono text-ink-3/60 tracking-widest">{displayId}</span>
			</div>

			{/* ── Ticket header strip — title + admin actions ── */}
			<div className={cn("rounded-xl border px-5 py-4 flex items-center gap-3", typeConfig.strip)}>
				<h1 className="text-base font-bold text-ink leading-snug flex-1 min-w-0 truncate">
					{ticket.title}
				</h1>
				{/* Admin quick actions */}
				{isAdmin && (
					<div className="ml-auto flex items-center gap-2">
						{ticket.status === "needs_approval" ? (
							<>
								<Button
									size="sm" variant="ghost"
									className="h-7 gap-1.5 text-xs text-green-600 hover:bg-green-500/10 hover:text-green-700"
									disabled={isApproving} isLoading={isApproving}
									onClick={() => approveTicket()}
								>
									<Check className="w-3.5 h-3.5" /> Approve
								</Button>
								<Button
									size="sm" variant="ghost"
									className="h-7 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
									onClick={() => setRejectOpen(true)}
								>
									<X className="w-3.5 h-3.5" /> Reject
								</Button>
							</>
						) : (
							<>
								<Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-ink-3 hover:text-ink" onClick={() => setEditOpen(true)}>
									<Pencil className="w-3.5 h-3.5" /> Edit
								</Button>
								{!["completed", "closed", "rejected"].includes(ticket.status) && (
									<>
										<Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs text-ink-3 hover:text-ink" onClick={() => setReassignOpen(true)}>
											<UserCog className="w-3.5 h-3.5" /> Reassign
										</Button>
										{ticket.status !== "on_hold" && (
											<Button
												size="sm" variant="ghost"
												className="h-7 gap-1.5 text-xs text-orange-600 hover:bg-orange-500/10 hover:text-orange-700"
												disabled={isAdminHolding} isLoading={isAdminHolding}
												onClick={() => adminHold()}
											>
												<Pause className="w-3.5 h-3.5" /> Hold
											</Button>
										)}
										{ticket.status !== "stale" && (
											<Button
												size="sm" variant="ghost"
												className="h-7 gap-1.5 text-xs text-yellow-700 hover:bg-yellow-500/10"
												disabled={isStaling} isLoading={isStaling}
												onClick={() => staleTicket()}
											>
												<Archive className="w-3.5 h-3.5" /> Stale
											</Button>
										)}
									</>
								)}
							</>
						)}
						<Button
							size="sm" variant="ghost"
							className={cn("h-7 gap-1.5 text-xs", isWatching ? "text-mint" : "text-ink-3 hover:text-ink")}
							disabled={isWatchPending || isUnwatchPending}
							onClick={() => isWatching ? unwatchTicket() : watchTicket()}
						>
							{isWatching ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
							{isWatching ? "Unwatch" : "Watch"}
							{watcherCount > 0 && <span className="opacity-50">({watcherCount})</span>}
						</Button>
					</div>
				)}
			</div>

			{/* ── Main 2-column layout ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

				{/* ── Left: content ── */}
				<div className="lg:col-span-2 space-y-4">

					{/* Badges + description card */}
					<div className="rounded-xl border bg-background shadow-sm p-6 space-y-4">
						<div className="flex items-start justify-between gap-2">
							<div className="flex flex-wrap items-center gap-2">
								<Badge variant="outline" className={cn("text-xs font-medium", typeConfig.badgeCls)}>
									{typeConfig.label}
								</Badge>
								<Badge variant="outline" className={cn("text-xs", STATUS_STYLES[ticket.status])}>
									{STATUS_LABEL[ticket.status] ?? ticket.status}
								</Badge>
								{ticket.priority && (
									<Badge variant="outline" className={cn("text-xs capitalize", PRIORITY_STYLES[ticket.priority])}>
										{ticket.priority === "critical" && <AlertTriangle className="w-2.5 h-2.5 mr-1" />}
										{ticket.priority}
									</Badge>
								)}
								{isOverdue && (
									<Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
										Overdue
									</Badge>
								)}
							</div>
							<Button
								size="sm" variant="ghost"
								className="h-7 gap-1.5 text-xs text-ink-3 hover:text-ink shrink-0"
								onClick={() => setSubtasksOpen(true)}
							>
								<CheckSquare className="w-3.5 h-3.5" />
								Subtasks{subtaskTotal > 0 && <span className="opacity-60">({subtaskDone}/{subtaskTotal})</span>}
							</Button>
						</div>
						{ticket.description ? (
							<div className={PROSE_CLS}>
								<ReactMarkdown>{ticket.description}</ReactMarkdown>
							</div>
						) : (
							<p className="text-sm text-ink-3/60 italic">No description provided.</p>
						)}
					</div>

					{/* ── Plans (2-col cards → modal) ── */}
					{(ticket.implementation_plan || ticket.rollback_plan) && (
						<div className={cn(
							"grid gap-3",
							ticket.implementation_plan && ticket.rollback_plan ? "grid-cols-2" : "grid-cols-1",
						)}>
							{ticket.implementation_plan && (
								<button
									type="button"
									onClick={() => setPlanView("implementation")}
									className="rounded-xl border bg-background shadow-sm p-4 text-left hover:bg-accent/30 transition-colors group flex flex-col"
								>
									<div className="flex items-center gap-2 mb-2">
										<FileText className="w-4 h-4 text-ink-3 shrink-0" />
										<span className="text-sm font-semibold text-ink">Implementation Plan</span>
									</div>
									<p className="text-xs text-ink-3/80 line-clamp-3 leading-relaxed flex-1">
										{ticket.implementation_plan}
									</p>
									<span className="mt-3 text-xs text-mint font-medium self-end group-hover:underline">View →</span>
								</button>
							)}
							{ticket.rollback_plan && (
								<button
									type="button"
									onClick={() => setPlanView("rollback")}
									className="rounded-xl border bg-background shadow-sm p-4 text-left hover:bg-accent/30 transition-colors group flex flex-col"
								>
									<div className="flex items-center gap-2 mb-2">
										<AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
										<span className="text-sm font-semibold text-ink">Rollback Plan</span>
									</div>
									<p className="text-xs text-ink-3/80 line-clamp-3 leading-relaxed flex-1">
										{ticket.rollback_plan}
									</p>
									<span className="mt-3 text-xs text-mint font-medium self-end group-hover:underline">View →</span>
								</button>
							)}
						</div>
					)}

					{/* Thread / Activity */}
					<div className="rounded-xl border bg-background shadow-sm">
						<Tabs defaultValue="thread">
							<div className="px-5 pt-4 pb-3 border-b">
								<TabsList>
									<TabsTrigger value="thread">Thread</TabsTrigger>
									<TabsTrigger value="activity">Activity</TabsTrigger>
								</TabsList>
							</div>
							<div className="p-5">
								<TabsContent value="thread">
									<TaskThread taskId={id} taskCreatedBy={ticket.created_by} view="thread" readOnly={!isAdmin && isStale} />
								</TabsContent>
								<TabsContent value="activity">
									<TaskThread taskId={id} taskCreatedBy={ticket.created_by} view="activity" readOnly={!isAdmin && isStale} />
								</TabsContent>
							</div>
						</Tabs>
					</div>
				</div>

				{/* ── Right: sidebar ── */}
				<div className="space-y-4">

					{/* Details card */}
					<div className="rounded-xl border bg-background shadow-sm divide-y">
						<div className="px-5 py-4">
							<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-3">Details</p>
							<div className="space-y-3.5">
								<MetaRow icon={User} label="Assignee">
									{ticket.assignee
										? <span className="font-medium text-ink">{ticket.assignee.name ?? ticket.assignee.email}</span>
										: <span className="text-ink-3 italic">Unassigned</span>
									}
								</MetaRow>

								<MetaRow icon={Calendar} label="Due date">
									{isAdmin ? (
										<input
											type="date"
											defaultValue={ticket.due_date ? ticket.due_date.slice(0, 10) : ""}
											onChange={(e) => updateTicket({ due_date: e.target.value || null })}
											className="text-sm text-ink bg-transparent border-0 focus:outline-none focus:ring-0 p-0 cursor-pointer"
										/>
									) : ticket.due_date ? (
										<span className={cn("font-medium", isOverdue ? "text-red-600" : "text-ink")}>{formatDate(ticket.due_date)}</span>
									) : (
										<span className="text-ink-3 italic">Not set</span>
									)}
								</MetaRow>

								{ticket.client_name && (
									<MetaRow icon={Building2} label="Client">
										<div className="space-y-0.5">
											<span className="font-medium text-ink">{ticket.client_name}</span>
											{(ticket as any).client_email && (
												<p className="text-xs text-ink-3">{(ticket as any).client_email}</p>
											)}
										</div>
									</MetaRow>
								)}

								{Array.isArray((ticket as any).links) && (ticket as any).links.length > 0 && (
									<MetaRow icon={Link2} label="Links">
										<div className="flex flex-col gap-1">
											{((ticket as any).links as TicketLink[]).map((l, i) => (
												<a
													key={i}
													href={l.url}
													target="_blank"
													rel="noopener noreferrer"
													className="flex items-center gap-1 text-xs text-mint hover:underline truncate"
												>
													<ExternalLink className="w-3 h-3 shrink-0" />
													<span className="truncate">{l.label || l.url}</span>
												</a>
											))}
										</div>
									</MetaRow>
								)}

								{ticket.creator && (
									<MetaRow icon={User} label="Created by">
										<span className="text-ink">{ticket.creator.name ?? ticket.creator.email}</span>
									</MetaRow>
								)}

								<MetaRow icon={Calendar} label="Created">
									<span className="text-ink">{formatDate(ticket.created_at)}</span>
								</MetaRow>

								{ticket.assigned_at && (
									<MetaRow icon={Calendar} label="Assigned">
										<span className="text-ink">{formatDate(ticket.assigned_at)}</span>
									</MetaRow>
								)}
								{ticket.started_at && (
									<MetaRow icon={Calendar} label="Started">
										<span className="text-ink">{formatDate(ticket.started_at)}</span>
									</MetaRow>
								)}
								{ticket.completed_at && (
									<MetaRow icon={CheckSquare} label="Resolved">
										<span className="text-green-600 font-medium">{formatDate(ticket.completed_at)}</span>
									</MetaRow>
								)}
							</div>
						</div>

						{/* Hours block */}
						{(ticket.estimated_hours || ticket.billable_hours != null || isAssignee) && (
							<div className="px-5 py-4">
								<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-3">Hours</p>
								<div className="space-y-2.5">
									{ticket.estimated_hours && (
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2 text-sm text-ink-3">
												<Clock className="w-3.5 h-3.5" />
												Estimated
											</div>
											<span className="text-sm font-semibold text-ink">{ticket.estimated_hours}h</span>
										</div>
									)}
									{/* Billable hours — editable by assignee */}
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-sm text-ink-3">
											<DollarSign className="w-3.5 h-3.5" />
											Billable
										</div>
										{isAdmin || !isAssignee ? (
											<span className="text-sm font-semibold text-ink">
												{ticket.billable_hours != null ? `${ticket.billable_hours}h` : <span className="text-ink-3 font-normal italic text-xs">Not set</span>}
											</span>
										) : (
											<input
												type="number"
												min="0"
												step="0.5"
												value={billableDraft}
												onChange={(e) => setBillableDraft(e.target.value)}
												placeholder="— h"
												onBlur={() => {
													updateBillable(billableDraft === "" ? null : parseFloat(billableDraft));
												}}
												onKeyDown={(e) => {
													if (e.key === "Enter") e.currentTarget.blur();
												}}
												className="w-20 text-right text-sm font-semibold text-ink bg-accent/50 border border-border rounded-md px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-mint placeholder:text-ink-3/40 placeholder:font-normal"
											/>
										)}
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Stale lock notice — employees only */}
					{!isAdmin && isStale && (
						<div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-5">
							<p className="text-xs font-semibold text-yellow-700 mb-1">Ticket is stale</p>
							<p className="text-xs text-yellow-700/70">This ticket has been marked stale by an admin. You can view it but cannot take any actions until it is reactivated.</p>
						</div>
					)}

					{/* Track time card — employees only, disabled on done or stale tickets */}
					{!isAdmin && !isStale && (
						<div className={cn("rounded-xl border bg-background shadow-sm p-5", (isDone || needsApproval) && "opacity-60")}>
							<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-3">Track Time</p>

							{needsApproval ? (
								<p className="text-xs text-ink-3">Timer unavailable — ticket is pending approval.</p>
							) : isDone ? (
								<p className="text-xs text-ink-3">Timer unavailable — ticket is {STATUS_LABEL[ticket.status]?.toLowerCase()}.</p>
							) : activeOnThis ? (
								<div className="space-y-3">
									<div className="flex items-center gap-2">
										<span className="relative flex h-2 w-2 shrink-0">
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
											<span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
										</span>
										<span className="text-2xl font-mono font-bold tabular-nums text-mint">{timerElapsed}</span>
									</div>
									<Button
										size="sm" variant="outline"
										className="w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
										disabled={isStoppingTimer}
										isLoading={isStoppingTimer}
										onClick={() => stopTimer()}
									>
										<Square className="w-3.5 h-3.5 fill-current" />
										Stop timer
									</Button>
								</div>
							) : activeOnOther && !needsApproval ? (
								<div className="space-y-2.5">
									<div className="flex items-center gap-1.5 text-xs text-ink-3">
										<Timer className="w-3.5 h-3.5 shrink-0" />
										<span className="truncate">Tracking: <span className="text-ink font-medium">{activeEntry!.ticket?.title ?? activeEntry!.title ?? "another ticket"}</span></span>
									</div>
									<Button
										size="sm" variant="outline"
										className="w-full gap-2"
										onClick={() => setSwitchOpen(true)}
									>
										<Play className="w-3.5 h-3.5 fill-current" />
										Switch to this ticket
									</Button>
								</div>
							) : (
								<Button
									size="sm"
									className="w-full gap-2 bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_2px_10px_rgba(128,237,153,0.2)]"
									disabled={isStartingTimer || !isAssignee}
									isLoading={isStartingTimer}
									onClick={handleStartTimer}
								>
									<Play className="w-3.5 h-3.5 fill-current" />
									{isAssignee ? "Start timer" : "Not assigned to you"}
								</Button>
							)}
						</div>
					)}

					{/* Employee actions card */}
					{!isAdmin && !isStale && (
						<div className="rounded-xl border bg-background shadow-sm p-5 space-y-2.5">
							<p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest mb-3">Actions</p>

							{ticket.status === "pending" && (
								<Button size="sm" variant="outline" className="w-full" disabled={isClaiming} isLoading={isClaiming} onClick={() => claimTask()}>
									Claim ticket
								</Button>
							)}
							{(ticket.status === "assigned" || ticket.status === "in_progress") && isAssignee && (
								<>
									<Button
										size="sm"
										className="w-full bg-green-600 hover:bg-green-700 text-white"
										disabled={isCompleting || isStoppingTimer} isLoading={isCompleting || isStoppingTimer}
										onClick={handleComplete}
									>
										Mark as resolved
									</Button>
									<Button
										size="sm" variant="outline"
										className="w-full gap-2 text-orange-600 border-orange-500/30 hover:bg-orange-500/10"
										disabled={isHolding} isLoading={isHolding}
										onClick={() => holdTicket()}
									>
										<Pause className="w-3.5 h-3.5" />
										Put on hold
									</Button>
								</>
							)}
							{ticket.status === "on_hold" && isAssignee && (
								<p className="text-xs text-ink-3/70 text-center py-1">
									Start the timer above to resume work.
								</p>
							)}
							{ticket.status === "completed" && isAssignee && (
								<Button
									size="sm" variant="outline"
									className="w-full gap-2 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
									disabled={isReopening} isLoading={isReopening}
									onClick={() => reopenTask()}
								>
									<RotateCcw className="w-3.5 h-3.5" />
									Reopen ticket
								</Button>
							)}
							{canTransfer && (
								<Button size="sm" variant="outline" className="w-full gap-2 text-ink-3" onClick={() => setTransferOpen(true)}>
									<ArrowRightLeft className="w-3.5 h-3.5" />
									Request transfer
								</Button>
							)}

							<div className="pt-1 border-t">
								<Button
									size="sm" variant="ghost"
									className={cn("w-full gap-2 text-xs", isWatching ? "text-mint" : "text-ink-3")}
									disabled={isWatchPending || isUnwatchPending}
									onClick={() => isWatching ? unwatchTicket() : watchTicket()}
								>
									{isWatching ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
									{isWatching ? "Unwatch" : "Watch"}
									{watcherCount > 0 && <span className="opacity-50">· {watcherCount} watching</span>}
								</Button>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* ── Dialogs ── */}

			{/* Reassign */}
			<DialogRoot open={reassignOpen} onOpenChange={(o) => { setReassignOpen(o); if (!o) setReassignTo(""); }}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Reassign Ticket</DialogTitle>
						<DialogDescription>Active ticket counts shown to help balance workload.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-1">
						<SelectRoot value={reassignTo} onValueChange={setReassignTo}>
							<SelectTrigger className="w-full"><SelectValue placeholder="Select employee…" /></SelectTrigger>
							<SelectContent>
								{employees.map((e) => {
									const count = workload[e.id] ?? 0;
									return (
										<SelectItem key={e.id} value={e.id}>
											<span className="flex items-center justify-between w-full gap-4">
												<span>{e.name ?? e.email}</span>
												<span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded",
													count === 0 ? "bg-mint/15 text-mint" : count <= 3 ? "bg-yellow-500/10 text-yellow-600" : "bg-red-500/10 text-red-600",
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
							<Button variant="outline" size="sm" onClick={() => setReassignOpen(false)}>Cancel</Button>
							<Button size="sm" disabled={!reassignTo || isReassigning} isLoading={isReassigning} onClick={() => reassignTask(reassignTo)}>Confirm</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>

			{/* Transfer */}
			<DialogRoot open={transferOpen} onOpenChange={(o) => { setTransferOpen(o); if (!o) setTransferTo(""); }}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Request Transfer</DialogTitle>
						<DialogDescription>Pick a team member or leave blank — admin will decide.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-1">
						<SelectRoot value={transferTo} onValueChange={setTransferTo}>
							<SelectTrigger className="w-full"><SelectValue placeholder="No preference (let admin decide)" /></SelectTrigger>
							<SelectContent>
								{employees.filter((e) => e.id !== user?.id).map((e) => (
									<SelectItem key={e.id} value={e.id}>{e.name ?? e.email}</SelectItem>
								))}
							</SelectContent>
						</SelectRoot>
						<div className="flex justify-end gap-2">
							<Button variant="outline" size="sm" onClick={() => setTransferOpen(false)}>Cancel</Button>
							<Button size="sm" isLoading={isRequesting} onClick={() => requestTransfer(transferTo || undefined)}>Send request</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>

			{/* Switch timer */}
			<DialogRoot open={switchOpen} onOpenChange={setSwitchOpen}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Switch timer?</DialogTitle>
						<DialogDescription>
							You&apos;re tracking <span className="font-medium text-ink">&quot;{activeEntry?.ticket?.title ?? activeEntry?.title ?? "another ticket"}&quot;</span>. Switching will stop that timer and start one for this ticket.
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 pt-2">
						<Button variant="outline" size="sm" onClick={() => setSwitchOpen(false)}>Cancel</Button>
						<Button size="sm" isLoading={isStartingTimer || isStoppingTimer} onClick={handleSwitchTimer}>Switch</Button>
					</div>
				</DialogContent>
			</DialogRoot>

			{/* Edit ticket */}
			{isAdmin && (
				<EditTicketDialog
					ticket={ticket}
					open={editOpen}
					onOpenChange={setEditOpen}
					onSave={async (data) => { await updateTicket(data); setEditOpen(false); }}
				/>
			)}

			{/* Subtasks modal */}
			<DialogRoot open={subtasksOpen} onOpenChange={setSubtasksOpen}>
				<DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<CheckSquare className="w-4 h-4 text-ink-3" />
							Subtasks
							{subtaskTotal > 0 && (
								<span className="text-xs font-normal text-ink-3 ml-1">
									{subtaskDone}/{subtaskTotal} completed
								</span>
							)}
						</DialogTitle>
					</DialogHeader>
					<div className="pt-1">
						<TaskSubtasks taskId={id} enabled={subtasksOpen} />
					</div>
				</DialogContent>
			</DialogRoot>

			{/* Plan viewer modal */}
			<DialogRoot open={planView !== null} onOpenChange={(v) => { if (!v) setPlanView(null); }}>
				<DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							{planView === "implementation"
								? <><FileText className="w-4 h-4 text-ink-3" /> Implementation Plan</>
								: <><AlertTriangle className="w-4 h-4 text-orange-500" /> Rollback Plan</>
							}
						</DialogTitle>
					</DialogHeader>
					<div className={cn("pt-1", PROSE_CLS)}>
						<ReactMarkdown>
							{planView === "implementation"
								? ticket.implementation_plan ?? ""
								: ticket.rollback_plan ?? ""}
						</ReactMarkdown>
					</div>
				</DialogContent>
			</DialogRoot>

			{/* Reject ticket dialog */}
			<DialogRoot open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) setRejectReason(""); }}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Reject Ticket</DialogTitle>
						<DialogDescription>Optionally provide a reason. The employee will be notified.</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 pt-1">
						<textarea
							value={rejectReason}
							onChange={(e) => setRejectReason(e.target.value)}
							rows={3}
							maxLength={500}
							placeholder="Reason for rejection (optional)…"
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint resize-none placeholder:text-ink-3/40"
						/>
						<div className="flex justify-end gap-2">
							<Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>Cancel</Button>
							<Button
								size="sm"
								className="bg-destructive hover:bg-destructive/90 text-white"
								disabled={isRejecting} isLoading={isRejecting}
								onClick={() => rejectTicket(rejectReason || undefined)}
							>
								Reject ticket
							</Button>
						</div>
					</div>
				</DialogContent>
			</DialogRoot>
		</div>
	);
}

// ── MetaRow helper ────────────────────────────────────────────────────────

function MetaRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
	return (
		<div className="flex items-start gap-2.5">
			<Icon className="w-3.5 h-3.5 text-ink-3 mt-0.5 shrink-0" />
			<div className="flex-1 min-w-0">
				<p className="text-[10px] text-ink-3/70 uppercase tracking-wider mb-0.5">{label}</p>
				<div className="text-sm">{children}</div>
			</div>
		</div>
	);
}

// ── Edit Ticket Dialog ────────────────────────────────────────────────────

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint placeholder:text-ink-3/50";
const optLabel = (text: string) => (
	<span className="flex items-center gap-1.5">
		{text}
		<span className="text-[10px] text-ink-3/50 font-normal">optional</span>
	</span>
);

interface EditTicketDialogProps {
	ticket: TicketDetail;
	open: boolean;
	onOpenChange: (v: boolean) => void;
	onSave: (data: object) => Promise<void>;
}

function EditTicketDialog({ ticket, open, onOpenChange, onSave }: EditTicketDialogProps) {
	const [title,              setTitle]              = useState(ticket.title);
	const [description,        setDescription]        = useState(ticket.description ?? "");
	const [ticketType,         setTicketType]         = useState<string>(ticket.ticket_type ?? "internal_task");
	const [status,             setStatus]             = useState<string>(ticket.status);
	const [priority,           setPriority]           = useState<string>(ticket.priority ?? "medium");
	const [dueDate,            setDueDate]            = useState(ticket.due_date ? ticket.due_date.slice(0, 10) : "");
	const [clientName,         setClientName]         = useState(ticket.client_name ?? "");
	const [clientEmail,        setClientEmail]        = useState((ticket as any).client_email ?? "");
	const [estimatedHours,     setEstimatedHours]     = useState(ticket.estimated_hours != null ? String(ticket.estimated_hours) : "");
	const [billableHours,      setBillableHours]      = useState(ticket.billable_hours  != null ? String(ticket.billable_hours)  : "");
	const [implementationPlan, setImplementationPlan] = useState(ticket.implementation_plan ?? "");
	const [rollbackPlan,       setRollbackPlan]       = useState(ticket.rollback_plan ?? "");
	const [links,              setLinks]              = useState<TicketLink[]>(Array.isArray((ticket as any).links) ? (ticket as any).links : []);
	const [isSaving,           setIsSaving]           = useState(false);
	const [error,              setError]              = useState("");

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		if (!title.trim()) { setError("Title is required."); return; }
		setIsSaving(true);
		try {
			await onSave({
				title: title.trim(),
				description: description.trim() || null,
				ticket_type: ticketType,
				status,
				priority,
				due_date: dueDate || null,
				client_name: clientName.trim() || null,
				client_email: clientEmail.trim() || null,
				estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
				billable_hours:  billableHours  ? parseFloat(billableHours)  : null,
				implementation_plan: implementationPlan.trim() || null,
				rollback_plan:       rollbackPlan.trim()       || null,
				links: links.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), label: l.label?.trim() || undefined })),
			});
		} catch {
			setError("Failed to save changes.");
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0">
				{/* Sticky header */}
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-6 py-4">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">Edit Ticket</DialogTitle>
					</DialogHeader>
				</div>

				<form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

					{/* ── Classification & Status ── */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Classification</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<div className="grid grid-cols-3 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="edit-type">Type</Label>
							<select id="edit-type" value={ticketType} onChange={(e) => setTicketType(e.target.value)} className={inputCls}>
								<option value="internal_task">Internal Task</option>
								<option value="request">Request</option>
								<option value="incident">Incident</option>
								<option value="change">Request for Change</option>
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-status">Status</Label>
							<select id="edit-status" value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
								<option value="pending">Open</option>
								<option value="assigned">Assigned</option>
								<option value="in_progress">In Progress</option>
								<option value="on_hold">On Hold</option>
								<option value="stale">Stale</option>
								<option value="completed">Resolved</option>
								<option value="closed">Closed</option>
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-priority">Priority</Label>
							<select id="edit-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="critical">Critical</option>
							</select>
						</div>
					</div>

					{/* ── Title ── */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Title</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="edit-title" className="sr-only">Title</Label>
						<input id="edit-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={`${inputCls} font-medium`} required />
					</div>

					{/* ── Scheduling & Billing ── */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Scheduling & Billing</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="edit-due">{optLabel("Due date")}</Label>
							<input id="edit-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-client">{optLabel("Client name")}</Label>
							<input id="edit-client" type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={100} placeholder="e.g. Acme Corp" className={inputCls} />
						</div>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="edit-client-email">{optLabel("Client email")}</Label>
						<input id="edit-client-email" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} maxLength={200} placeholder="client@example.com" className={inputCls} />
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="edit-est">{optLabel("Est. hours")}</Label>
							<input id="edit-est" type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="e.g. 4" className={inputCls} />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-bill">{optLabel("Billable hours")}</Label>
							<input id="edit-bill" type="number" min="0" step="0.5" value={billableHours} onChange={(e) => setBillableHours(e.target.value)} placeholder="e.g. 4" className={inputCls} />
						</div>
					</div>

					{/* ── Plans ── */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Plans</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="edit-impl">{optLabel("Implementation plan")}</Label>
							<textarea id="edit-impl" value={implementationPlan} onChange={(e) => setImplementationPlan(e.target.value)} rows={3} maxLength={5000} placeholder={"- Step 1: Deploy to staging\n- Step 2: Run migrations\n• Verify all endpoints respond"} className={`${inputCls} resize-none`} />
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="edit-roll">{optLabel("Rollback plan")}</Label>
							<textarea id="edit-roll" value={rollbackPlan} onChange={(e) => setRollbackPlan(e.target.value)} rows={2} maxLength={2000} placeholder={"- Step 1: Roll back deployment\n• Restore database snapshot if needed"} className={`${inputCls} resize-none`} />
						</div>
					</div>

					{/* ── Links ── */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Links</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<LinksEditor links={links} onChange={setLinks} />

					{/* ── Description ── */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Description</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<div className="rounded-lg border border-border focus-within:ring-1 focus-within:ring-mint overflow-hidden">
						<textarea
							id="edit-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={5}
							maxLength={1000}
							placeholder="What needs to be done? Context, steps to reproduce, acceptance criteria…"
							className="w-full bg-background px-3 py-3 text-sm focus:outline-none placeholder:text-ink-3/40 resize-none"
						/>
						<div className="px-3 py-2 border-t border-border/40 bg-accent/40">
							<span className="text-[10px] text-ink-3/50 font-medium">Markdown supported · Attachments coming soon</span>
						</div>
					</div>

					{error && <p className="text-xs text-destructive">{error}</p>}

					{/* Footer */}
					<div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
						<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button type="submit" size="sm" disabled={isSaving} isLoading={isSaving}>Save changes</Button>
					</div>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
