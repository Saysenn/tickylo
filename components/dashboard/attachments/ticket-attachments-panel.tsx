"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Trash2, FileText, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import APIService from "@/lib/infra/api";
import { useAppSelector } from "@/store/hooks";
import { formatDate, formatTime } from "@/lib/utils/format";
import { ROLES } from "@/configs/rbac.config";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface AttachmentAuthor {
	id: string;
	name: string | null;
	email: string;
}

interface Attachment {
	id: string;
	file_name: string;
	file_size: number;
	mime_type: string;
	url: string;
	created_at: string;
	author: AttachmentAuthor | null;
}

interface CommentGroup {
	id: string;
	created_at: string;
	author: AttachmentAuthor | null;
	attachments: Attachment[];
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TicketAttachmentsPanel({ ticketId }: { ticketId: string }) {
	const queryClient = useQueryClient();
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === ROLES.ADMIN;
	const [expanded, setExpanded] = useState(false);
	const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

	const { data: groups = [], isLoading } = useQuery<CommentGroup[]>({
		queryKey: ["ticket-attachments", ticketId],
		queryFn: () => APIService.attachments.byTicket(ticketId),
		enabled: expanded,
	});

	const totalCount = groups.reduce((acc, g) => acc + g.attachments.length, 0);

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["ticket-attachments", ticketId] });

	const { mutate: deleteOne, isPending: isDeletingOne } = useMutation({
		mutationFn: (id: string) => APIService.attachments.delete(id),
		onSuccess: invalidate,
	});

	const { mutate: deleteAll, isPending: isDeletingAll } = useMutation({
		mutationFn: () => APIService.attachments.deleteAllForTicket(ticketId),
		onSuccess: () => { invalidate(); setConfirmDeleteAll(false); },
	});

	return (
		<div className="rounded-xl border bg-background">
			{/* Header — always visible */}
			<button
				type="button"
				onClick={() => setExpanded((e) => !e)}
				className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors rounded-xl"
			>
				<div className="flex items-center gap-2">
					<Paperclip className="w-3.5 h-3.5 text-ink-3" />
					<span className="text-xs font-semibold text-ink">Attachments</span>
					{totalCount > 0 && (
						<span className="text-[10px] bg-accent/60 text-ink-3 px-1.5 py-0.5 rounded-full">{totalCount}</span>
					)}
				</div>
				{expanded ? <ChevronUp className="w-3.5 h-3.5 text-ink-3" /> : <ChevronDown className="w-3.5 h-3.5 text-ink-3" />}
			</button>

			{expanded && (
				<div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-4">
					{isLoading ? (
						<div className="flex items-center justify-center py-4">
							<div className="w-4 h-4 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
						</div>
					) : groups.length === 0 ? (
						<p className="text-xs text-ink-3 text-center py-2">No attachments yet.</p>
					) : (
						<>
							{/* Admin: Delete All */}
							{isAdmin && (
								<div className="flex items-center justify-end">
									{confirmDeleteAll ? (
										<div className="flex items-center gap-2">
											<span className="text-[11px] text-ink-3">Delete all {totalCount} files?</span>
											<Button
												size="sm"
												variant="destructive"
												className="h-6 text-[10px] px-2"
												onClick={() => deleteAll()}
												disabled={isDeletingAll}
												isLoading={isDeletingAll}
											>
												Yes, delete all
											</Button>
											<button type="button" onClick={() => setConfirmDeleteAll(false)} className="text-[11px] text-ink-3 hover:text-ink">Cancel</button>
										</div>
									) : (
										<button
											type="button"
											onClick={() => setConfirmDeleteAll(true)}
											className="flex items-center gap-1 text-[11px] text-ink-3/70 hover:text-destructive transition-colors"
										>
											<Trash2 className="w-3 h-3" />
											Delete all
										</button>
									)}
								</div>
							)}

							{/* Groups by comment */}
							{groups.map((group) => (
								<div key={group.id} className="space-y-2">
									<p className="text-[10px] text-ink-3/60">
										{group.author?.name ?? group.author?.email ?? "Unknown"} · {formatDate(group.created_at)} {formatTime(group.created_at)}
									</p>
									<div className="flex flex-wrap gap-2">
										{group.attachments.map((a) => {
											const isImage = a.mime_type.startsWith("image/");
											const isOwner = a.author?.id === user?.id;
											const canDelete = isAdmin || isOwner;

											return (
												<div key={a.id} className="relative group/att">
													{isImage ? (
														<a href={a.url} target="_blank" rel="noopener noreferrer" className="block">
															<img
																src={a.url}
																alt={a.file_name}
																className="w-16 h-16 object-cover rounded-lg border border-border/40 hover:opacity-90 transition-opacity"
															/>
														</a>
													) : (
														<a
															href={a.url}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border/40 bg-accent/30 hover:bg-accent/50 transition-colors max-w-[130px]"
														>
															<FileText className="w-3.5 h-3.5 text-ink-3 shrink-0" />
															<div className="min-w-0">
																<p className="text-[11px] text-ink truncate">{a.file_name}</p>
																<p className="text-[10px] text-ink-3">{formatBytes(a.file_size)}</p>
															</div>
															<ExternalLink className="w-2.5 h-2.5 text-ink-3 shrink-0" />
														</a>
													)}
													{canDelete && (
														<button
															type="button"
															onClick={() => deleteOne(a.id)}
															disabled={isDeletingOne}
															className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity disabled:opacity-50"
															title="Delete attachment"
														>
															<Trash2 className="w-2 h-2" />
														</button>
													)}
												</div>
											);
										})}
									</div>
								</div>
							))}
						</>
					)}
				</div>
			)}
		</div>
	);
}
