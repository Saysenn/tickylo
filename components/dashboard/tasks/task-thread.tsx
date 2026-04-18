"use client";

import { useRef, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Trash2, AlertCircle, Info, Eraser, ArrowRightLeft, Smile } from "lucide-react";
import APIService from "@/lib/infra/api";
import { useAppSelector } from "@/store/hooks";
import { formatInitials, formatDate, formatTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { ROLES } from "@/configs/rbac.config";

const FIXED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

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
	/** "thread" = user comments only, "activity" = system events only, undefined = all */
	view?: "thread" | "activity";
	/** When true the compose box is hidden — used for stale/locked tickets */
	readOnly?: boolean;
}

interface ReactionGroup {
	emoji: string;
	count: number;
	reacted: boolean;
}

function CommentReactions({ taskId, commentId }: { taskId: string; commentId: string }) {
	const [pickerOpen, setPickerOpen] = useState(false);
	const queryClient = useQueryClient();

	const { data: reactions = [] } = useQuery<ReactionGroup[]>({
		queryKey: ["reactions", commentId],
		queryFn: () => APIService.tasks.reactions.list(taskId, commentId),
	});

	const { mutate: toggle } = useMutation({
		mutationFn: (emoji: string) => APIService.tasks.reactions.toggle(taskId, commentId, emoji),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reactions", commentId] }),
	});

	return (
		<div className="flex items-center flex-wrap gap-1 mt-1.5">
			{reactions.map((r) => (
				<button
					key={r.emoji}
					type="button"
					onClick={() => toggle(r.emoji)}
					className={cn(
						"inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
						r.reacted
							? "border-mint/40 bg-mint/10 text-mint"
							: "border-border/50 bg-accent/30 text-ink-3 hover:border-mint/30 hover:bg-mint/5",
					)}
				>
					{r.emoji} <span>{r.count}</span>
				</button>
			))}
			<div className="relative">
				<button
					type="button"
					onClick={() => setPickerOpen((o) => !o)}
					className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-border/50 bg-accent/30 text-ink-3 hover:border-mint/30 hover:bg-mint/5 transition-colors opacity-0 group-hover:opacity-100"
				>
					<Smile className="w-3 h-3" />
				</button>
				{pickerOpen && (
					<div className="absolute bottom-7 left-0 z-20 flex gap-1 rounded-lg border bg-background shadow-md p-1.5">
						{FIXED_EMOJIS.map((e) => (
							<button
								key={e}
								type="button"
								onClick={() => { toggle(e); setPickerOpen(false); }}
								className="text-base w-7 h-7 flex items-center justify-center rounded hover:bg-accent/50 transition-colors"
							>
								{e}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
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

export function TaskThread({ taskId, taskCreatedBy, view, readOnly = false }: TaskThreadProps) {
	const queryClient = useQueryClient();
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === ROLES.ADMIN;
	const isCreator = user?.id === taskCreatedBy;
	const canClearAll = isAdmin || isCreator;

	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// @mention autocomplete
	const [mentionQuery, setMentionQuery] = useState<string | null>(null); // null = closed
	const { data: employeesResult } = useQuery<{ data: { id: string; name: string | null; email: string }[] }>({
		queryKey: ["employees-list"],
		queryFn: () => APIService.employees.list(1, 50),
		enabled: mentionQuery !== null,
	});
	const mentionSuggestions = (employeesResult?.data ?? []).filter((e) => {
		if (!mentionQuery) return true;
		const q = mentionQuery.toLowerCase();
		return (e.name ?? e.email).toLowerCase().includes(q);
	}).slice(0, 6);

	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMentionQuery(null);
		};
		document.addEventListener("keydown", handleKey);
		return () => document.removeEventListener("keydown", handleKey);
	}, []);

	const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setDraft(val);
		setError(null);
		// Detect @mention: look for @ followed by word chars at cursor
		const cursor = e.target.selectionStart ?? val.length;
		const before = val.slice(0, cursor);
		const match = before.match(/@(\w*)$/);
		if (match) {
			setMentionQuery(match[1]);
		} else {
			setMentionQuery(null);
		}
	};

	const insertMention = (name: string) => {
		const cursor = textareaRef.current?.selectionStart ?? draft.length;
		const before = draft.slice(0, cursor);
		const after = draft.slice(cursor);
		const replaced = before.replace(/@(\w*)$/, `@${name} `);
		setDraft(replaced + after);
		setMentionQuery(null);
		setTimeout(() => textareaRef.current?.focus(), 0);
	};

	const { data: allComments = [], isLoading } = useQuery<Comment[]>({
		queryKey: ["task-comments", taskId],
		queryFn: () => APIService.tasks.comments.list(taskId),
		enabled: !!taskId,
		refetchInterval: 15000,
	});

	const comments = view === "thread"
		? allComments.filter((c) => !c.is_system)
		: view === "activity"
		? allComments.filter((c) => c.is_system)
		: allComments;

	const userCommentCount = allComments.filter((c) => !c.is_system).length;

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
		<div className="space-y-3">
			{/* Timeline */}
			<div className="space-y-0.5">
				{isLoading ? (
					<div className="flex items-center justify-center py-8">
						<div className="w-4 h-4 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
					</div>
				) : comments.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						{view === "activity" ? (
							<>
								<p className="text-xs text-ink-3">No activity yet.</p>
								<p className="text-[11px] text-ink-3/60 mt-0.5">System events like assignments and transfers will appear here.</p>
							</>
						) : (
							<p className="text-xs text-ink-3">No comments yet. Be the first to add context.</p>
						)}
					</div>
				) : (
					comments.map((c) => {
						if (c.is_system) {
							const { icon, dotClass, labelClass } = getSystemEventMeta(c.body);
							return (
								<div key={c.id} className="flex items-center gap-2.5 py-1 px-1">
									<div className={cn("w-1.5 h-1.5 rounded-full shrink-0 ml-1", dotClass)} />
									<span className={cn("text-xs flex items-center gap-1", labelClass)}>
										{icon}
										{c.body}
									</span>
									<span className="text-[10px] text-ink-3/60 ml-auto whitespace-nowrap">
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
							<div key={c.id} className="group flex items-start gap-2.5 py-1.5">
								<div
									className={cn(
										"w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5",
										isOwn ? "bg-mint/20 text-mint" : "bg-ink/8 text-ink-3",
									)}
								>
									{initials}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5 mb-1">
										<span className="text-xs font-semibold text-ink leading-none">
											{isOwn ? "You" : name}
										</span>
										<Badge
											variant="outline"
											className={cn(
												"text-[9px] px-1 py-0 h-3.5 leading-none uppercase tracking-wide",
												authorRole === ROLES.ADMIN
													? "bg-mint/10 text-mint border-mint/20"
													: "bg-ink/5 text-ink-3 border-border/30",
											)}
										>
											{authorRole === ROLES.ADMIN ? "Admin" : "Employee"}
										</Badge>
										<span className="text-[10px] text-ink-3/60">
											{formatDate(c.created_at)} · {formatTime(c.created_at)}
										</span>
										{canClearAll && userCommentCount > 0 && view !== "activity" && isOwn && comments[comments.length - 1]?.id === c.id && (
											<button
												type="button"
												onClick={() => clearAll()}
												disabled={isClearing}
												className="ml-auto flex items-center gap-1 text-[10px] text-ink-3/50 hover:text-red-500 transition-colors disabled:opacity-50"
											>
												<Eraser className="w-2.5 h-2.5" />
												Clear all
											</button>
										)}
									</div>

									<div className="relative rounded-lg border border-border/40 bg-accent/30 px-3 py-2">
										<p className="text-xs text-ink-2 whitespace-pre-wrap wrap-break-word leading-relaxed">
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
									<CommentReactions taskId={taskId} commentId={c.id} />
								</div>
							</div>
						);
					})
				)}
			</div>

			{/* Compose */}
			{view !== "activity" && !readOnly && (
				<form onSubmit={handleSubmit} className="pt-2 border-t border-border/30">
					{error && <p className="text-xs text-destructive mb-2">{error}</p>}
					<div className="flex items-start gap-2.5">
						<div className="w-6 h-6 rounded-full bg-mint/20 flex items-center justify-center text-[9px] font-bold text-mint shrink-0 mt-1">
							{formatInitials(user?.name ?? null, user?.email ?? "")}
						</div>

						<div className="flex-1 space-y-1.5">
							<div className="relative">
								<textarea
									ref={textareaRef}
									value={draft}
									onChange={handleDraftChange}
									onKeyDown={handleKeyDown}
									placeholder="Add a comment… (use @ to mention)"
									maxLength={2000}
									rows={2}
									className={cn(
										"w-full resize-none rounded-lg border border-border/40 bg-background px-3 py-2 text-xs text-ink placeholder:text-ink-3/50",
										"focus:outline-none focus:ring-1 focus:ring-mint/50 focus:border-mint/40 transition-colors",
									)}
								/>
								{mentionQuery !== null && mentionSuggestions.length > 0 && (
									<div className="absolute bottom-full left-0 mb-1 z-20 min-w-[160px] rounded-lg border bg-background shadow-md overflow-hidden">
										{mentionSuggestions.map((e) => (
											<button
												key={e.id}
												type="button"
												onMouseDown={(ev) => { ev.preventDefault(); insertMention(e.name ?? e.email); }}
												className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-accent/50 transition-colors"
											>
												{e.name ?? e.email}
											</button>
										))}
									</div>
								)}
							</div>
							<div className="flex items-center justify-between">
								<span className="text-[10px] text-ink-3/60">
									{draft.length > 0 ? `${draft.length}/2000` : "⌘↵ to send"}
								</span>
								<Button
									type="submit"
									size="sm"
									disabled={!draft.trim() || isPosting}
									isLoading={isPosting}
									className="h-7 px-3 text-xs"
								>
									Post
								</Button>
							</div>
						</div>
					</div>
				</form>
			)}
		</div>
	);
}
