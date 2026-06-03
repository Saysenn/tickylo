"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Trash2, AlertCircle, Info, Eraser, ArrowRightLeft, Smile, Paperclip } from "lucide-react";
import APIService from "@/lib/infra/api";
import { useAppSelector } from "@/store/hooks";
import { formatInitials, formatDate, formatTime } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { ROLES } from "@/configs/rbac.config";
import { RichTextEditor, type AttachmentPreview } from "@/components/ui/rich-text-editor";
import { useOrgSettings } from "@/providers/org-settings-provider";
import { Skeleton } from "@/components/ui/skeleton";

const FIXED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const COMMENT_DELETE_WINDOW_MS = 5 * 60 * 1000;

interface CommentAuthor {
	id: string;
	name: string | null;
	email: string;
	role?: string | null;
}

interface CommentAttachment {
	id: string;
	file_name: string;
	file_size: number;
	mime_type: string;
	url: string;
	created_at: string;
	author: { id: string; name: string | null; email: string } | null;
}

interface Comment {
	id: string;
	task_id: string;
	user_id: string | null;
	body: string;
	is_system: boolean;
	created_at: string;
	author: CommentAuthor | null;
	attachments: CommentAttachment[];
}

interface TaskThreadProps {
	taskId: string;
	taskCreatedBy: string;
	view?: "thread" | "activity";
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

function getSystemEventMeta(body: string): { icon: React.ReactNode; dotClass: string; labelClass: string } {
	const lower = body.toLowerCase();
	if (lower.includes("reassigned")) return { icon: <AlertCircle className="w-3.5 h-3.5" />, dotClass: "bg-orange-400", labelClass: "text-orange-600" };
	if (lower.includes("requested to transfer")) return { icon: <ArrowRightLeft className="w-3.5 h-3.5" />, dotClass: "bg-purple-400", labelClass: "text-purple-600" };
	return { icon: <Info className="w-3.5 h-3.5" />, dotClass: "bg-info", labelClass: "text-info-fg" };
}

export function TaskThread({ taskId, taskCreatedBy, view, readOnly = false }: TaskThreadProps) {
	const queryClient = useQueryClient();
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === ROLES.ADMIN;
	const { attachments_enabled } = useOrgSettings();
	const isCreator = user?.id === taskCreatedBy;
	const canClearAll = isAdmin || isCreator;

	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);
	// Attachments uploaded but not yet linked to a comment
	const [pendingAttachments, setPendingAttachments] = useState<AttachmentPreview[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [storageWarning, setStorageWarning] = useState("");

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

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });

	const { mutateAsync: postComment, isPending: isPosting } = useMutation({
		mutationFn: ({ body, attachmentIds }: { body: string; attachmentIds: string[] }) =>
			APIService.tasks.comments.post(taskId, body, attachmentIds),
		onSuccess: () => {
			setDraft("");
			setError(null);
			setPendingAttachments([]);
			invalidate();
		},
		onError: (err) => {
			setError(isAxiosError(err) ? (err.response?.data?.error ?? "Failed to post comment.") : "Something went wrong.");
		},
	});

	const { mutateAsync: deleteComment } = useMutation({
		mutationFn: (commentId: string) => APIService.tasks.comments.remove(taskId, commentId),
		onSuccess: invalidate,
	});

	const { mutateAsync: clearAll, isPending: isClearing } = useMutation({
		mutationFn: () => APIService.tasks.comments.clear(taskId),
		onSuccess: invalidate,
	});

	const { mutate: deleteAttachment } = useMutation({
		mutationFn: (id: string) => APIService.attachments.delete(id),
		onSuccess: (_, id) => {
			setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
			invalidate();
		},
	});

	const handleAttach = async (files: File[]) => {
		setStorageWarning("");
		setIsUploading(true);
		try {
			for (const file of files) {
				const fd = new FormData();
				fd.append("file", file);
				const result: AttachmentPreview = await APIService.upload.file(fd);
				setPendingAttachments((prev) => [...prev, result]);
			}
		} catch (err: any) {
			const msg = isAxiosError(err) ? (err.response?.data?.error ?? "") : "";
			if (msg.includes("No storage configured")) {
				setStorageWarning("Your organization hasn't configured file storage yet. Contact an admin.");
			} else {
				setStorageWarning(msg || "Upload failed.");
			}
		} finally {
			setIsUploading(false);
		}
	};

	const handleSubmit = (e: React.SyntheticEvent) => {
		e.preventDefault();
		// Check if body has actual content (TipTap JSON or plain text)
		let body = draft.trim();
		if (!body) return;
		// Don't submit if body is an empty TipTap doc
		try {
			const parsed = JSON.parse(body);
			const text = parsed?.content?.[0]?.content?.[0]?.text ?? "";
			const hasContent = parsed?.content?.some((node: any) =>
				node.content?.length > 0 || node.type === "codeBlock",
			);
			if (!hasContent && pendingAttachments.length === 0) return;
		} catch {
			// plain text — fine
		}
		postComment({ body, attachmentIds: pendingAttachments.map((a) => a.id) });
	};

	const canDeleteComment = (c: Comment) => {
		if (c.is_system) return false;
		if (isAdmin) return true;
		if (c.user_id !== user?.id) return false;
		return Date.now() - new Date(c.created_at).getTime() < COMMENT_DELETE_WINDOW_MS;
	};

	return (
		<div className="space-y-3">
			{/* Timeline */}
			<div className="space-y-0.5">
				{isLoading ? (
					<div className="space-y-4 py-2">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex items-start gap-3">
								<Skeleton className="h-7 w-7 rounded-full shrink-0" />
								<div className="flex-1 space-y-1.5">
									<div className="flex items-center gap-2">
										<Skeleton className="h-3 w-24" />
										<Skeleton className="h-3 w-16" />
									</div>
									<Skeleton className="h-3.5 w-full" />
									<Skeleton className="h-3.5 w-3/4" />
								</div>
							</div>
						))}
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
						const canDeleteOwn = isOwn && !isAdmin;

						return (
							<div key={c.id} className="group flex items-start gap-2.5 py-1.5">
								<div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5", isOwn ? "bg-mint/20 text-mint" : "bg-ink/8 text-ink-3")}>
									{initials}
								</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5 mb-1">
										<span className="text-xs font-semibold text-ink leading-none">{isOwn ? "You" : name}</span>
										<Badge
											variant="outline"
											className={cn("text-[9px] px-1 py-0 h-3.5 leading-none uppercase tracking-wide", authorRole === ROLES.ADMIN ? "bg-mint/10 text-mint border-mint/20" : "bg-ink/5 text-ink-3 border-border/30")}
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
												className="ml-auto flex items-center gap-1 text-[10px] text-ink-3/50 hover:text-destructive transition-colors disabled:opacity-50"
											>
												<Eraser className="w-2.5 h-2.5" />
												Clear all
											</button>
										)}
									</div>

									<div className="relative rounded-lg border border-border/40 bg-accent/30 px-3 py-2">
										<RichTextEditor
											value={c.body}
											readOnly
											attachments={c.attachments.map((a) => ({
												id: a.id, url: a.url, file_name: a.file_name,
												mime_type: a.mime_type, file_size: a.file_size,
											}))}
											onDeleteAttachment={isAdmin || canDeleteOwn ? (id) => deleteAttachment(id) : undefined}
										/>
										{canDeleteComment(c) && (
											<button
												type="button"
												onClick={() => deleteComment(c.id)}
												className="absolute top-1.5 right-1.5 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-ink-3 hover:text-destructive hover:bg-destructive/10"
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
					{!attachments_enabled && (
						<div className="flex items-center gap-2 rounded-lg bg-accent/50 border border-border/40 px-3 py-2 mb-2">
							<Paperclip className="w-3.5 h-3.5 text-ink-3 shrink-0" />
							<p className="text-xs text-ink-3">File attachments are disabled by your admin.</p>
						</div>
					)}
					{error && <p className="text-xs text-destructive mb-2">{error}</p>}
					{storageWarning && <p className="text-xs text-warning-fg mb-2">{storageWarning}</p>}
					<div className="flex items-start gap-2.5">
						<div className="w-6 h-6 rounded-full bg-mint/20 flex items-center justify-center text-[9px] font-bold text-mint shrink-0 mt-2">
							{formatInitials(user?.name ?? null, user?.email ?? "")}
						</div>

						<div className="flex-1 space-y-1.5">
							<RichTextEditor
								value={draft}
								onChange={setDraft}
								onAttach={attachments_enabled ? handleAttach : undefined}
								placeholder="Add a comment… (use the toolbar to format)"
								attachments={pendingAttachments}
								onDeleteAttachment={(id) => deleteAttachment(id)}
								minHeight={72}
							/>
							<div className="flex items-center justify-between">
								<span className="text-[10px] text-ink-3/60 flex items-center gap-1">
									{isUploading && (
										<span className="flex items-center gap-1">
											<div className="w-2.5 h-2.5 border border-mint/40 border-t-mint rounded-full animate-spin" />
											Uploading…
										</span>
									)}
									{!isUploading && pendingAttachments.length === 0 && "⌘↵ to send"}
									{!isUploading && pendingAttachments.length > 0 && `${pendingAttachments.length} file${pendingAttachments.length > 1 ? "s" : ""} attached`}
								</span>
								<Button
									type="submit"
									size="sm"
									disabled={isPosting || isUploading}
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
