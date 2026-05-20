"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	Bell,
	UserCog,
	ArrowRightLeft,
	CheckCircle2,
	ClipboardList,
	MessageSquare,
	Info,
	CheckCheck,
	Trash2,
	Play,
	Pencil,
	CalendarCheck,
	CalendarX,
	CalendarClock,
	LogIn,
	LogOut,
	AtSign,
	AlertTriangle,
	Eye,
} from "lucide-react";
import APIService from "@/lib/infra/api";
import { formatRelativeTime, formatDate, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

interface Notification {
	id: string;
	type: string;
	title: string;
	body: string;
	link: string | null;
	read: boolean;
	created_at: string;
}

interface NotificationsResponse {
	data: Notification[];
	pagination: { page: number; limit: number; total: number; pages: number };
	unreadCount: number;
}

const LIMIT = 20;

function notificationIcon(type: string) {
	switch (type) {
		case "task_assigned":
		case "task_reassigned":
			return <UserCog className="w-4 h-4 text-mint" />;
		case "transfer_requested":
			return <ArrowRightLeft className="w-4 h-4 text-purple-500" />;
		case "task_completed":
			return <CheckCircle2 className="w-4 h-4 text-green-500" />;
		case "task_claimed":
			return <ClipboardList className="w-4 h-4 text-blue-500" />;
		case "comment_added":
			return <MessageSquare className="w-4 h-4 text-yellow-500" />;
		case "task_available":
			return <ClipboardList className="w-4 h-4 text-mint" />;
		case "task_started":
			return <Play className="w-4 h-4 text-blue-500" />;
		case "task_updated":
			return <Pencil className="w-4 h-4 text-yellow-500" />;
		case "task_deleted":
			return <Trash2 className="w-4 h-4 text-red-500" />;
		case "leave_requested":
			return <CalendarClock className="w-4 h-4 text-purple-500" />;
		case "leave_approved":
			return <CalendarCheck className="w-4 h-4 text-green-500" />;
		case "leave_rejected":
			return <CalendarX className="w-4 h-4 text-red-500" />;
		case "time_clock_in":
			return <LogIn className="w-4 h-4 text-mint" />;
		case "time_clock_out":
			return <LogOut className="w-4 h-4 text-blue-500" />;
		case "comment_mention":
			return <AtSign className="w-4 h-4 text-purple-500" />;
		case "due_date_reminder":
			return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
		case "task_watched":
			return <Eye className="w-4 h-4 text-mint" />;
		case "ticket_needs_approval":
			return <ClipboardList className="w-4 h-4 text-purple-500" />;
		case "ticket_approved":
			return <CheckCircle2 className="w-4 h-4 text-green-500" />;
		case "ticket_rejected":
			return <CalendarX className="w-4 h-4 text-red-500" />;
		default:
			return <Info className="w-4 h-4 text-ink-3" />;
	}
}

export default function NotificationsPage() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const [tab, setTab] = useState<"all" | "unread">("all");
	const [typeGroup, setTypeGroup] = useState<string>("");
	const [page, setPage] = useState(1);
	const [bulkMode, setBulkMode] = useState(false);
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const queryKey = ["notifications-page", tab, typeGroup, page];

	const { data, isLoading } = useQuery<NotificationsResponse>({
		queryKey,
		queryFn: () => APIService.notifications.list(page, LIMIT, tab === "unread", typeGroup || undefined),
	});

	const notifications = data?.data ?? [];
	const pagination = data?.pagination;
	const unreadCount = data?.unreadCount ?? 0;

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
		queryClient.invalidateQueries({ queryKey: ["notifications"] });
	};

	const { mutate: readAll, isPending: isReadingAll } = useMutation({
		mutationFn: () => APIService.notifications.readAll(),
		onSuccess: invalidate,
	});

	const { mutate: readOne } = useMutation({
		mutationFn: (id: string) => APIService.notifications.read(id),
		onSuccess: invalidate,
	});

	const { mutate: bulkRead, isPending: isBulkReading } = useMutation({
		mutationFn: (ids: string[]) => APIService.notifications.bulkRead(ids),
		onSuccess: () => { setSelected(new Set()); invalidate(); },
	});

	const { mutate: bulkDelete, isPending: isBulkDeleting } = useMutation({
		mutationFn: (ids: string[]) => APIService.notifications.bulkDelete(ids),
		onSuccess: () => { setSelected(new Set()); invalidate(); },
	});

	const exitBulk = () => { setBulkMode(false); setSelected(new Set()); };

	const isBulkPending = isBulkReading || isBulkDeleting;

	const handleClick = (n: Notification) => {
		if (!n.read) readOne(n.id);
		if (n.link) router.push(n.link);
	};

	const handleTabChange = (t: "all" | "unread") => {
		setTab(t);
		setTypeGroup("");
		setPage(1);
		setSelected(new Set());
		setBulkMode(false);
	};

	const handleTypeGroup = (g: string) => {
		setTypeGroup((prev) => (prev === g ? "" : g));
		setPage(1);
		setSelected(new Set());
	};

	const toggleOne = (id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const toggleAll = () => {
		if (selected.size === notifications.length) setSelected(new Set());
		else setSelected(new Set(notifications.map((n) => n.id)));
	};

	const selectedIds = [...selected];
	const allSelected = notifications.length > 0 && selected.size === notifications.length;
	const someSelected = selected.size > 0;
	const selectedUnread = notifications.filter((n) => selected.has(n.id) && !n.read);

	return (
		<div className="w-full space-y-5">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-ink">Notifications</h1>
					<p className="text-ink-3 mt-1 text-sm">Your activity feed and alerts.</p>
				</div>
				<div className="flex items-center gap-2">
					{unreadCount > 0 && (
						<Button
							size="sm"
							variant="outline"
							className="gap-1.5 text-xs"
							disabled={isReadingAll}
							onClick={() => readAll()}
						>
							<CheckCheck className="w-3.5 h-3.5" />
							Mark all read
						</Button>
					)}
					<Button
						size="sm"
						variant={bulkMode ? "outline" : "ghost"}
						className={cn("h-8 text-xs gap-1.5", bulkMode ? "border-mint/40 text-mint" : "text-ink-3")}
						onClick={() => (bulkMode ? exitBulk() : setBulkMode(true))}
					>
						{bulkMode ? "Exit Bulk" : "Bulk"}
					</Button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 p-1 bg-accent/50 rounded-xl w-fit">
				{(["all", "unread"] as const).map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => handleTabChange(t)}
						className={cn(
							"px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
							tab === t
								? "bg-background text-ink shadow-sm"
								: "text-ink-3 hover:text-ink",
						)}
					>
						{t === "unread" ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` : "All"}
					</button>
				))}
			</div>

			{/* Type filter pills */}
			<div className="flex items-center gap-2 flex-wrap">
				{([
					{ key: "", label: "All types" },
					{ key: "tasks", label: "Tasks" },
					{ key: "timers", label: "Timers" },
					{ key: "leave", label: "Leave" },
					{ key: "comments", label: "Comments" },
				] as const).map(({ key, label }) => (
					<button
						key={key}
						type="button"
						onClick={() => handleTypeGroup(key)}
						className={cn(
							"h-7 px-3 rounded-full text-xs font-medium border transition-colors",
							typeGroup === key
								? "bg-mint/15 border-mint/30 text-mint"
								: "bg-background border-border text-ink-3 hover:text-ink hover:border-border/80",
						)}
					>
						{label}
					</button>
				))}
				{pagination && (
					<span className="ml-auto text-xs text-ink-3">{pagination.total.toLocaleString()} total</span>
				)}
			</div>

			{/* Bulk action bar */}
			{bulkMode && (
				<div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-mint/8 border border-mint/20">
					<span className="text-xs font-medium text-ink-2">
						{selected.size} selected
					</span>
					<div className="flex items-center gap-2 ml-auto flex-wrap">
						{selectedUnread.length > 0 && (
							<Button
								size="sm"
								variant="outline"
								className="h-7 text-xs gap-1.5"
								disabled={isBulkPending}
								onClick={() => bulkRead(selectedIds)}
							>
								<CheckCheck className="w-3.5 h-3.5" />
								Mark read
							</Button>
						)}
						<Button
							size="sm"
							variant="outline"
							className="h-7 text-xs gap-1.5 text-destructive border-red-500/30 hover:bg-red-500/10 hover:text-destructive"
							disabled={isBulkPending}
							onClick={() => bulkDelete(selectedIds)}
						>
							<Trash2 className="w-3.5 h-3.5" />
							Delete
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 text-xs text-ink-3"
							onClick={exitBulk}
						>
							Cancel
						</Button>
					</div>
				</div>
			)}

			{/* List */}
			<div className="rounded-xl border border-border/60 glass overflow-hidden">
				{/* Select-all header */}
				{notifications.length > 0 && (
					<div className="flex items-center gap-3 px-5 py-2.5 border-b border-border/50 bg-surface/50">
						{bulkMode && (
							<input
								type="checkbox"
								checked={allSelected}
								onChange={toggleAll}
								className="accent-mint cursor-pointer"
							/>
						)}
						<span className="text-[10px] font-semibold tracking-widest uppercase text-ink-3/70">
							{bulkMode && someSelected ? `${selected.size} selected` : "Notification"}
						</span>
						{unreadCount > 0 && (
							<span className="ml-auto text-[11px] font-semibold bg-red-500/15 text-red-600 px-2 py-0.5 rounded-full">
								{unreadCount} unread
							</span>
						)}
					</div>
				)}

				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
					</div>
				) : notifications.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Bell className="w-8 h-8 text-ink-3/30 mb-3" />
						<p className="text-sm font-medium text-ink-2">
							{tab === "unread" ? "No unread notifications" : "No notifications yet"}
						</p>
						<p className="text-xs text-ink-3 mt-1">
							{tab === "unread" ? "You're all caught up." : "Activity will appear here."}
						</p>
					</div>
				) : (
					notifications.map((n) => (
						<div
							key={n.id}
							className={cn(
								"flex items-start gap-3 px-5 py-4 border-b border-border/30 last:border-0 transition-colors",
								!n.read && "bg-mint/5",
								selected.has(n.id) && "bg-mint/8",
							)}
						>
							{/* Checkbox */}
							{bulkMode && (
								<input
									type="checkbox"
									checked={selected.has(n.id)}
									onChange={() => toggleOne(n.id)}
									onClick={(e) => e.stopPropagation()}
									className="accent-mint cursor-pointer mt-1 shrink-0"
								/>
							)}

							{/* Clickable content */}
							<button
								type="button"
								className="flex items-start gap-3 flex-1 text-left min-w-0"
								onClick={() => handleClick(n)}
							>
								<div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
									{notificationIcon(n.type)}
								</div>
								<div className="flex-1 min-w-0">
									<p className={cn("text-sm text-ink", !n.read && "font-semibold")}>
										{n.title}
									</p>
									<p className="text-xs text-ink-3 mt-0.5 leading-relaxed">{n.body}</p>
									<p className="text-[11px] text-ink-3/60 mt-1.5">
										{formatRelativeTime(n.created_at)} · {formatDate(n.created_at)}{" "}
										{formatTime(n.created_at)}
									</p>
								</div>
								{!n.read && (
									<span className="w-2 h-2 rounded-full bg-mint shrink-0 mt-1.5" />
								)}
							</button>
						</div>
					))
				)}
			</div>

			<Pagination
				page={page}
				totalPages={pagination?.pages ?? 1}
				onPrev={() => setPage((p) => p - 1)}
				onNext={() => setPage((p) => p + 1)}
				onGoTo={setPage}
			/>
		</div>
	);
}
