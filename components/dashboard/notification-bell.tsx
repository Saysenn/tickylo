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
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
	unreadCount: number;
}

function notificationIcon(type: string) {
	switch (type) {
		case "task_assigned":
		case "task_reassigned":
			return <UserCog className="w-3.5 h-3.5 text-mint" />;
		case "transfer_requested":
			return <ArrowRightLeft className="w-3.5 h-3.5 text-purple-500" />;
		case "task_completed":
			return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
		case "task_claimed":
			return <ClipboardList className="w-3.5 h-3.5 text-blue-500" />;
		case "comment_added":
			return <MessageSquare className="w-3.5 h-3.5 text-yellow-500" />;
		case "task_available":
			return <ClipboardList className="w-3.5 h-3.5 text-mint" />;
		case "task_started":
			return <Play className="w-3.5 h-3.5 text-blue-500" />;
		case "task_updated":
			return <Pencil className="w-3.5 h-3.5 text-yellow-500" />;
		case "task_deleted":
			return <Trash2 className="w-3.5 h-3.5 text-red-500" />;
		case "leave_requested":
			return <CalendarClock className="w-3.5 h-3.5 text-purple-500" />;
		case "leave_approved":
			return <CalendarCheck className="w-3.5 h-3.5 text-green-500" />;
		case "leave_rejected":
			return <CalendarX className="w-3.5 h-3.5 text-red-500" />;
		case "time_clock_in":
			return <LogIn className="w-3.5 h-3.5 text-mint" />;
		case "time_clock_out":
			return <LogOut className="w-3.5 h-3.5 text-blue-500" />;
		case "comment_mention":
			return <AtSign className="w-3.5 h-3.5 text-purple-500" />;
		case "due_date_reminder":
			return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
		case "priority_escalated":
			return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
		case "timer_auto_closed":
			return <LogOut className="w-3.5 h-3.5 text-orange-500" />;
		case "task_watched":
			return <Eye className="w-3.5 h-3.5 text-mint" />;
		default:
			return <Info className="w-3.5 h-3.5 text-ink-3" />;
	}
}

export function NotificationBell() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [open, setOpen] = useState(false);

	const { data } = useQuery<NotificationsResponse>({
		queryKey: ["notifications"],
		queryFn: () => APIService.notifications.list(1, 20),
		refetchInterval: 30_000,
	});

	const notifications = data?.data ?? [];
	const unreadCount = data?.unreadCount ?? 0;

	const { mutate: readAll } = useMutation({
		mutationFn: () => APIService.notifications.readAll(),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});

	const { mutate: readOne } = useMutation({
		mutationFn: (id: string) => APIService.notifications.read(id),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["notifications"] }),
	});

	const handleClick = (n: Notification) => {
		if (!n.read) readOne(n.id);
		setOpen(false);
		if (n.link) router.push(n.link);
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="relative flex items-center justify-center w-8 h-8 rounded-xl hover:bg-mint/10 transition-colors focus:outline-none"
					aria-label="Notifications"
				>
					<Bell className="w-4 h-4 text-ink-2" />
					{unreadCount > 0 && (
						<span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-background" />
					)}
				</button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-80 p-0 mt-1 rounded-xl overflow-hidden"
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-ink">Notifications</span>
						{unreadCount > 0 && (
							<span className="text-[10px] font-semibold bg-red-500/15 text-red-600 px-1.5 py-0.5 rounded-full">
								{unreadCount}
							</span>
						)}
					</div>
					{unreadCount > 0 && (
						<button
							type="button"
							onClick={() => readAll()}
							className="text-[11px] text-ink-3 hover:text-mint transition-colors"
						>
							Mark all read
						</button>
					)}
				</div>

				{/* List */}
				<div className="max-h-[360px] overflow-y-auto">
					{notifications.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-10 text-center">
							<Bell className="w-6 h-6 text-ink-3/40 mb-2" />
							<p className="text-xs text-ink-3">You&apos;re all caught up</p>
						</div>
					) : (
						notifications.map((n) => (
							<button
								key={n.id}
								type="button"
								onClick={() => handleClick(n)}
								className={cn(
									"w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 border-b border-border/20 last:border-0",
									!n.read && "bg-mint/5",
								)}
							>
								<div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
									{notificationIcon(n.type)}
								</div>
								<div className="flex-1 min-w-0">
									<p className={cn("text-xs leading-snug text-ink", !n.read && "font-semibold")}>
										{n.title}
									</p>
									<p className="text-[11px] text-ink-3 mt-0.5 leading-snug line-clamp-2">
										{n.body}
									</p>
									<p className="text-[10px] text-ink-3/60 mt-1">
										{formatRelativeTime(n.created_at)}
									</p>
								</div>
								{!n.read && (
									<span className="w-1.5 h-1.5 rounded-full bg-mint shrink-0 mt-1.5" />
								)}
							</button>
						))
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-border/40 px-4 py-2.5">
					<button
						type="button"
						onClick={() => { setOpen(false); router.push("/dashboard/notifications"); }}
						className="w-full text-center text-xs text-ink-3 hover:text-mint transition-colors"
					>
						View all notifications →
					</button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
