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
} from "lucide-react";
import APIService from "@/lib/infra/api";
import { formatRelativeTime, formatDate, formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

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
		default:
			return <Info className="w-4 h-4 text-ink-3" />;
	}
}

export default function NotificationsPage() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const [tab, setTab] = useState<"all" | "unread">("all");
	const [page, setPage] = useState(1);

	const queryKey = ["notifications-page", tab, page];

	const { data, isLoading } = useQuery<NotificationsResponse>({
		queryKey,
		queryFn: () =>
			APIService.notifications.list(page, LIMIT, tab === "unread"),
	});

	const notifications = data?.data ?? [];
	const pagination = data?.pagination;
	const unreadCount = data?.unreadCount ?? 0;

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: ["notifications-page"] });
		queryClient.invalidateQueries({ queryKey: ["notifications"] }); // bell
	};

	const { mutate: readAll, isPending: isReadingAll } = useMutation({
		mutationFn: () => APIService.notifications.readAll(),
		onSuccess: invalidate,
	});

	const { mutate: readOne } = useMutation({
		mutationFn: (id: string) => APIService.notifications.read(id),
		onSuccess: invalidate,
	});

	const handleClick = (n: Notification) => {
		if (!n.read) readOne(n.id);
		if (n.link) router.push(n.link);
	};

	const handleTabChange = (t: "all" | "unread") => {
		setTab(t);
		setPage(1);
	};

	return (
		<div className="w-full space-y-6">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Bell className="w-5 h-5 text-ink-3" />
					<h1 className="text-lg font-bold text-ink">Notifications</h1>
					{unreadCount > 0 && (
						<span className="text-[11px] font-semibold bg-red-500/15 text-red-600 px-2 py-0.5 rounded-full">
							{unreadCount} unread
						</span>
					)}
				</div>
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

			{/* List */}
			<div className="rounded-xl border bg-background overflow-hidden">
				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
					</div>
				) : notifications.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Bell className="w-8 h-8 text-ink-3/30 mb-3" />
						<p className="text-sm text-ink-3">
							{tab === "unread" ? "No unread notifications" : "No notifications yet"}
						</p>
					</div>
				) : (
					notifications.map((n) => (
						<button
							key={n.id}
							type="button"
							onClick={() => handleClick(n)}
							className={cn(
								"w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/50 border-b border-border/30 last:border-0",
								!n.read && "bg-mint/5",
							)}
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
					))
				)}
			</div>

			{/* Pagination */}
			{pagination && pagination.pages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-xs text-ink-3">
						Page {pagination.page} of {pagination.pages} · {pagination.total} total
					</p>
					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={page <= 1}
							onClick={() => setPage((p) => p - 1)}
						>
							Previous
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={page >= pagination.pages}
							onClick={() => setPage((p) => p + 1)}
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
