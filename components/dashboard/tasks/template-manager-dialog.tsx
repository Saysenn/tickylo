"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { useAppSelector } from "@/store/hooks";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { TicketTemplate } from "./types";

const TYPE_LABEL: Record<string, string> = {
	internal_task: "Task",
	request: "Request",
	incident: "Incident",
	change: "RFC",
};

const PRIORITY_LABEL: Record<string, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	critical: "Critical",
};

function EditRow({
	template,
	isAdmin,
	onSave,
	onCancel,
	isSaving,
}: {
	template: TicketTemplate;
	isAdmin: boolean;
	onSave: (name: string, is_shared: boolean) => void;
	onCancel: () => void;
	isSaving: boolean;
}) {
	const [name, setName] = useState(template.name);
	const [shared, setShared] = useState(template.is_shared);
	return (
		<div className="flex items-center gap-2 w-full">
			<input
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				maxLength={100}
				autoFocus
				className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-mint"
			/>
			{isAdmin && (
				<label className="flex items-center gap-1 text-xs text-ink-3/70 cursor-pointer select-none shrink-0">
					<input
						type="checkbox"
						checked={shared}
						onChange={(e) => setShared(e.target.checked)}
						className="rounded border-border accent-mint"
					/>
					Shared
				</label>
			)}
			<Button
				type="button"
				size="sm"
				onClick={() => onSave(name, shared)}
				isLoading={isSaving}
				disabled={isSaving || !name.trim()}
				className="shrink-0"
			>
				Save
			</Button>
			<Button type="button" variant="ghost" size="sm" onClick={onCancel} className="shrink-0">
				Cancel
			</Button>
		</div>
	);
}

export function TemplateManagerDialog({ trigger }: { trigger: React.ReactNode }) {
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";
	const userId = user?.id ?? "";

	const [open, setOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const queryClient = useQueryClient();

	const { data: result, isLoading } = useQuery({
		queryKey: ["ticket-templates"],
		queryFn: () => APIService.ticketTemplates.list(),
		enabled: open,
		staleTime: 120_000,
	});
	const templates: TicketTemplate[] = Array.isArray(result) ? result : [];

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: object }) =>
			APIService.ticketTemplates.update(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
			setEditingId(null);
		},
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => APIService.ticketTemplates.remove(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
			setDeletingId(null);
		},
	});

	const shared = templates.filter((t) => t.is_shared);
	const personal = templates.filter((t) => !t.is_shared);

	function renderTemplate(t: TicketTemplate) {
		const canEdit = isAdmin || t.user_id === userId;
		if (editingId === t.id) {
			return (
				<div key={t.id} className="px-4 py-3 border-b border-border/30 last:border-0">
					<EditRow
						template={t}
						isAdmin={isAdmin}
						onSave={(name, is_shared) =>
							updateMutation.mutate({ id: t.id, data: { name, is_shared } })
						}
						onCancel={() => setEditingId(null)}
						isSaving={updateMutation.isPending}
					/>
				</div>
			);
		}
		return (
			<div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/30 last:border-0">
				<div className="flex-1 min-w-0">
					<p className="text-sm font-medium text-ink truncate">{t.name}</p>
					<p className="text-[11px] text-ink-3/60 mt-0.5">
						{[
							t.ticket_type ? TYPE_LABEL[t.ticket_type] ?? t.ticket_type : null,
							t.priority ? PRIORITY_LABEL[t.priority] ?? t.priority : null,
						]
							.filter(Boolean)
							.join(" · ") || "No prefill"}
					</p>
				</div>
				{canEdit && (
					<div className="flex items-center gap-1 shrink-0">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="text-xs h-7 px-2"
							onClick={() => setEditingId(t.id)}
						>
							Edit
						</Button>
						{deletingId === t.id ? (
							<>
								<Button
									type="button"
									variant="destructive"
									size="sm"
									className="text-xs h-7 px-2"
									onClick={() => deleteMutation.mutate(t.id)}
									isLoading={deleteMutation.isPending}
									disabled={deleteMutation.isPending}
								>
									Confirm
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="text-xs h-7 px-2"
									onClick={() => setDeletingId(null)}
								>
									Cancel
								</Button>
							</>
						) : (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="text-xs h-7 px-2 text-destructive hover:text-destructive"
								onClick={() => setDeletingId(t.id)}
							>
								Delete
							</Button>
						)}
					</div>
				)}
			</div>
		);
	}

	return (
		<DialogRoot open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto p-0">
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-6 py-4">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">Manage Templates</DialogTitle>
					</DialogHeader>
				</div>

				<div className="py-2">
					{isLoading && (
						<p className="px-6 py-8 text-sm text-ink-3/60 text-center">Loading templates…</p>
					)}

					{!isLoading && templates.length === 0 && (
						<p className="px-6 py-8 text-sm text-ink-3/60 text-center">
							No templates yet. Use "Save as template" when creating a ticket.
						</p>
					)}

					{shared.length > 0 && (
						<>
							<p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-3/50">
								Shared
							</p>
							<div className="rounded-lg border border-border/40 mx-4 mb-3 overflow-hidden">
								{shared.map(renderTemplate)}
							</div>
						</>
					)}

					{personal.length > 0 && (
						<>
							<p className="px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-ink-3/50">
								Personal
							</p>
							<div className="rounded-lg border border-border/40 mx-4 mb-3 overflow-hidden">
								{personal.map(renderTemplate)}
							</div>
						</>
					)}
				</div>

				<div className="sticky bottom-0 border-t border-border/40 bg-background/95 px-6 py-3 flex justify-end">
					<Button variant="outline" size="sm" onClick={() => setOpen(false)}>
						Close
					</Button>
				</div>
			</DialogContent>
		</DialogRoot>
	);
}
