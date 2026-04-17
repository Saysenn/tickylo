"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Trash2, AlertCircle, Info, MessageSquare, Eraser, ArrowRightLeft } from "lucide-react";
import APIService from "@/lib/infra/api";
import { useAppSelector } from "@/store/hooks";
import { formatInitials, formatDate, formatTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { ROLES } from "@/configs/rbac.config";

const COMMENT_DELETE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

interface CommentAuthor {
	id: string;
	name: string | null;
	email: string;
	role?: string | null;
}

interface Comment {
	id: string;
	task_id: string;
	user_id: string | null;
	body: string;
	is_system: boolean;
	created_at: string;
	author: CommentAuthor | null;
}

interface TaskThreadProps {
	taskId: string;
	taskCreatedBy: string;
}

function getSystemEventMeta(body: string): {
	icon: React.ReactNode;
	dotClass: string;
	labelClass: string;
} {
	const lower = body.toLowerCase();
	if (lower.includes("reassigned")) {
		return {
			icon: <AlertCircle className="w-3.5 h-3.5" />,
			dotClass: "bg-orange-400",
			labelClass: "text-orange-600",
		};
	}
	if (lower.includes("requested to transfer")) {
		return {
			icon: <ArrowRightLeft className="w-3.5 h-3.5" />,
			dotClass: "bg-purple-400",
			labelClass: "text-purple-600",
		};
	}
	return {
		icon: <Info className="w-3.5 h-3.5" />,
		dotClass: "bg-blue-400",
		labelClass: "text-blue-600",
	};
}

export function TaskThread({ taskId, taskCreatedBy }: TaskThreadProps) {
	const queryClient = useQueryClient();
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === ROLES.ADMIN;
	const isCreator = user?.id === taskCreatedBy;
	const canClearAll = isAdmin || isCreator;

	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const { data: comments = [], isLoading } = useQuery<Comment[]>({
		queryKey: ["task-comments", taskId],
		queryFn: () => APIService.tasks.comments.list(taskId),
		enabled: !!taskId,
		refetchInterval: 15000,
	});

	const userCommentCount = comments.filter((c) => !c.is_system).length;

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });

	const { mutateAsync: postComment, isPending: isPosting } = useMutation({
		mutationFn: (body: string) => APIService.tasks.comments.post(taskId, body),
		onSuccess: () => {
			setDraft("");
			setError(null);
			invalidate();
		},
		onError: (err) => {
			setError(
				isAxiosError(err)
					? (err.response?.data?.error ?? "Failed to post comment.")
					: "Something went wrong.",
			);
		},
	});

	const { mutateAsync: deleteComment } = useMutation({
		mutationFn: (commentId: string) =>
			APIService.tasks.comments.remove(taskId, commentId),
		onSuccess: invalidate,
	});

	const { mutateAsync: clearAll, isPending: isClearing } = useMutation({
		mutationFn: () => APIService.tasks.comments.clear(taskId),
		onSuccess: invalidate,
	});

	const handleSubmit = (e: React.SyntheticEvent) => {
		e.preventDefault();
		const body = draft.trim();
		if (!body) return;
		postComment(body);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			const body = draft.trim();
			if (body) postComment(body);
		}
	};

	const canDeleteComment = (c: Comment) => {
		if (c.is_system) return false;
		if (isAdmin) return true;
		if (c.user_id !== user?.id) return false;
		// Non-admins: only within 5-min window
		return Date.now() - new Date(c.created_at).getTime() < COMMENT_DELETE_WINDOW_MS;
	};

	return (
		<div className="space-y-5">
			{/* Header */}
			<div className="flex items-center gap-2">
				<MessageSquare className="w-4 h-4 text-ink-3" />
				<h3 className="text-sm font-semibold text-ink">Thread</h3>
				{userCommentCount > 0 && (
					<Badge
						variant="outline"
						className="text-[10px] px-1.5 py-0 h-4 bg-ink/5 text-ink-3 border-border/40"
					>
						{userCommentCount}
					</Badge>
				)}
				{canClearAll && userCommentCount > 0 && (
					<button
						type="button"
						onClick={() => clearAll()}
						disabled={isClearing}
						className="ml-auto flex items-center gap-1 text-[11px] text-ink-3 hover:text-red-500 transition-colors disabled:opacity-50"
					>
						<Eraser className="w-3 h-3" />
						Clear all
					</button>
				)}
			</div>

			{/* Timeline */}
			<div className="space-y-1">
				{isLoading ? (
					<div className="flex items-center justify-center py-10">
						<div className="w-4 h-4 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
					</div>
				) : comments.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-10 text-center">
						<div className="w-8 h-8 rounded-full bg-ink/5 flex items-center justify-center mb-2">
							<MessageSquare className="w-4 h-4 text-ink-3" />
						</div>
						<p className="text-xs text-ink-3">No activity yet.</p>
						<p className="text-[11px] text-ink-3/60 mt-0.5">
							Be the first to add context to this task.
						</p>
					</div>
				) : (
					comments.map((c) => {
						if (c.is_system) {
							const { icon, dotClass, labelClass } = getSystemEventMeta(c.body);
							return (
								<div key={c.id} className="flex items-center gap-3 py-1.5 px-1">
									<div className={cn("w-2 h-2 rounded-full shrink-0 ml-2.5", dotClass)} />
									<span className={cn("text-xs font-medium flex items-center gap-1.5", labelClass)}>
										{icon}
										{c.body}
									</span>
									<span className="text-[10px] text-ink-3 ml-auto whitespace-nowrap">
										{formatDate(c.created_at)} · {formatTime(c.created_at)}
									</span>
								</div>
							);
						}

						const isOwn = c.user_id === user?.id;
						const name = c.author?.name ?? c.author?.email ?? "Unknown";
						const initials = formatInitials(c.author?.name ?? null, c.author?.email ?? "");
						const authorRole = c.author?.role ?? ROLES.EMPLOYEE;

						return (
							<div key={c.id} className="group flex items-start gap-3 py-2 px-1">
								<div
									className={cn(
										"w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5",
										isOwn ? "bg-mint/20 text-mint" : "bg-ink/8 text-ink-3",
									)}
								>
									{initials}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1.5">
										<span className="text-xs font-semibold text-ink leading-none">
											{isOwn ? "You" : name}
										</span>
										<Badge
											variant="outline"
											className={cn(
												"text-[9px] px-1.5 py-0 h-3.5 leading-none uppercase tracking-wide",
												authorRole === ROLES.ADMIN
													? "bg-mint/10 text-mint border-mint/20"
													: "bg-ink/5 text-ink-3 border-border/30",
											)}
										>
											{authorRole === ROLES.ADMIN ? "Admin" : "Employee"}
										</Badge>
										<span className="text-[10px] text-ink-3 ml-0.5">
											{formatDate(c.created_at)} · {formatTime(c.created_at)}
										</span>
									</div>

									<div className="relative rounded-lg border border-border/50 bg-accent/30 px-3 py-2.5">
										<p className="text-sm text-ink-2 whitespace-pre-wrap wrap-break-word leading-relaxed">
											{c.body}
										</p>
										{canDeleteComment(c) && (
											<button
												type="button"
												onClick={() => deleteComment(c.id)}
												className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-red-500 hover:bg-red-500/10"
												aria-label="Delete comment"
											>
												<Trash2 className="w-3 h-3" />
											</button>
										)}
									</div>
								</div>
							</div>
						);
					})
				)}
			</div>

			{comments.length > 0 && <div className="border-t border-border/30" />}

			{/* Compose */}
			<form onSubmit={handleSubmit}>
				{error && <p className="text-xs text-destructive mb-2">{error}</p>}
				<div className="flex items-start gap-3">
					<div className="w-7 h-7 rounded-full bg-mint/20 flex items-center justify-center text-[10px] font-bold text-mint shrink-0 mt-1">
						{formatInitials(user?.name ?? null, user?.email ?? "")}
					</div>

					<div className="flex-1 space-y-2">
						<textarea
							ref={textareaRef}
							value={draft}
							onChange={(e) => {
								setDraft(e.target.value);
								setError(null);
							}}
							onKeyDown={handleKeyDown}
							placeholder="Add a comment…"
							maxLength={2000}
							rows={2}
							className={cn(
								"w-full resize-none rounded-lg border border-border/50 bg-background px-3 py-2 text-sm text-ink placeholder:text-ink-3",
								"focus:outline-none focus:ring-1 focus:ring-mint/50 focus:border-mint/40 transition-colors",
							)}
						/>
						<div className="flex items-center justify-between">
							<span className="text-[10px] text-ink-3">
								{draft.length > 0 ? `${draft.length}/2000` : "⌘↵ to send"}
							</span>
							<Button
								type="submit"
								size="sm"
								disabled={!draft.trim() || isPosting}
								isLoading={isPosting}
								className="bg-mint hover:bg-mint/90 text-ink font-semibold h-7 px-3 text-xs"
							>
								Post
							</Button>
						</div>
					</div>
				</div>
			</form>
		</div>
	);
}
