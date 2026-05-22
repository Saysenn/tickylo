"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Combobox } from "@/components/ui/combobox";
import type { TicketTemplate } from "@/components/dashboard/tasks/types";

function isRteEmpty(val: string | null | undefined): boolean {
	if (!val) return true;
	try {
		const doc = JSON.parse(val);
		const text = doc.content
			?.flatMap((n: any) => n.content ?? [])
			.map((n: any) => n.text ?? "")
			.join("") ?? "";
		return !text.trim();
	} catch {
		return !val.trim();
	}
}

function rteToPlain(val: string | null | undefined): string {
	if (!val) return "";
	try {
		const doc = JSON.parse(val);
		return doc.content
			?.flatMap((n: any) => n.content ?? [])
			.map((n: any) => n.text ?? "")
			.join(" ")
			.trim() ?? "";
	} catch {
		return val;
	}
}

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

const inputCls =
	"w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint placeholder:text-ink-3/40";

// ── Create / Edit form ──────────────────────────────────────────────────────

function TemplateForm({
	initial,
	isAdmin,
	onSave,
	onCancel,
	isSaving,
}: {
	initial?: Partial<TicketTemplate>;
	isAdmin: boolean;
	onSave: (data: Partial<TicketTemplate>) => void;
	onCancel: () => void;
	isSaving: boolean;
}) {
	const [name, setName] = useState(initial?.name ?? "");
	const [isShared, setIsShared] = useState(initial?.is_shared ?? true);
	const [ticketType, setTicketType] = useState(initial?.ticket_type ?? "");
	const [priority, setPriority] = useState(initial?.priority ?? "");
	const [title, setTitle] = useState(initial?.title ?? "");
	const [description, setDescription] = useState(initial?.description ?? "");
	const [implPlan, setImplPlan] = useState(initial?.implementation_plan ?? "");
	const [rollbackPlan, setRollbackPlan] = useState(initial?.rollback_plan ?? "");
	const [error, setError] = useState("");

	function handleSave() {
		setError("");
		if (!name.trim()) { setError("Template name is required."); return; }
		onSave({
			name: name.trim(),
			is_shared: isAdmin ? isShared : false,
			ticket_type: ticketType || undefined,
			priority: priority || undefined,
			title: title.trim() || undefined,
			description: isRteEmpty(description) ? undefined : description,
			implementation_plan: isRteEmpty(implPlan) ? undefined : implPlan,
			rollback_plan: isRteEmpty(rollbackPlan) ? undefined : rollbackPlan,
		});
	}

	return (
		<div className="rounded-xl border border-border bg-background">
			<div className="px-4 py-3 space-y-3">

				{/* Row 1: name */}
				<div className="space-y-1.5">
					<Label htmlFor="tpl-name">Template name</Label>
					<input
						id="tpl-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						maxLength={100}
						placeholder="e.g. Standard Incident Response"
						className={inputCls}
						autoFocus
					/>
				</div>

				{/* Row 2: type + priority + title in one row */}
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_2fr]">
					<div className="space-y-1.5">
						<Label htmlFor="tpl-type">Type</Label>
						<Combobox
							options={[
								{ value: "", label: "No prefill" },
								{ value: "internal_task", label: "Internal Task" },
								{ value: "request", label: "Request" },
								{ value: "incident", label: "Incident" },
								{ value: "change", label: "Request for Change" },
							]}
							value={ticketType}
							onChange={setTicketType}
							placeholder="No prefill"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="tpl-priority">Priority</Label>
						<Combobox
							options={[
								{ value: "", label: "No prefill" },
								{ value: "low", label: "Low" },
								{ value: "medium", label: "Medium" },
								{ value: "high", label: "High" },
								{ value: "critical", label: "Critical" },
							]}
							value={priority}
							onChange={setPriority}
							placeholder="No prefill"
						/>
					</div>
					<div className="col-span-2 sm:col-span-1 space-y-1.5">
						<Label htmlFor="tpl-title">Title prefill</Label>
						<input
							id="tpl-title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={190}
							placeholder="Leave blank — user writes their own"
							className={inputCls}
						/>
					</div>
				</div>

				{/* Description */}
				<div className="space-y-1.5">
					<Label>Description</Label>
					<RichTextEditor
						value={description}
						onChange={setDescription}
						placeholder="Provide context, steps to reproduce, or acceptance criteria…"
						minHeight={72}
					/>
				</div>

				{/* Plans side by side */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div className="space-y-1.5">
						<Label>Implementation plan</Label>
						<RichTextEditor
							value={implPlan}
							onChange={setImplPlan}
							placeholder="Step 1: Deploy to staging&#10;Step 2: Run migrations&#10;Step 3: Verify endpoints"
							minHeight={80}
						/>
					</div>
					<div className="space-y-1.5">
						<Label>Rollback plan</Label>
						<RichTextEditor
							value={rollbackPlan}
							onChange={setRollbackPlan}
							placeholder="Step 1: Revert deployment&#10;Step 2: Restore DB snapshot"
							minHeight={80}
						/>
					</div>
				</div>

				{/* Footer */}
				{error && <p className="text-xs text-destructive">{error}</p>}
				<div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
					{isAdmin ? (
						<div className="flex flex-col gap-0.5">
							<label className="flex items-center gap-2 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={isShared}
									onChange={(e) => setIsShared(e.target.checked)}
									className="rounded border-border accent-mint"
								/>
								<span className="text-sm text-ink-2">Share org-wide</span>
							</label>
							<p className="text-[11px] text-ink-3/50 pl-5">
								{isShared
									? "All employees can see and apply this template."
									: "Only you can see this template."}
							</p>
						</div>
					) : <span />}
					<div className="flex items-center gap-2">
						<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
							Cancel
						</Button>
						<Button type="button" size="sm" onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
							{initial?.id ? "Save changes" : "Create template"}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

const PRIORITY_COLOR: Record<string, string> = {
	low:      "text-sky-500 bg-sky-500/10",
	medium:   "text-amber-500 bg-amber-500/10",
	high:     "text-orange-500 bg-orange-500/10",
	critical: "text-destructive bg-destructive/10",
};

const TYPE_COLOR: Record<string, string> = {
	internal_task: "text-violet-500 bg-violet-500/10",
	request:       "text-blue-500 bg-blue-500/10",
	incident:      "text-destructive bg-destructive/10",
	change:        "text-amber-600 bg-amber-500/10",
};

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
	template,
	canEdit,
	onEdit,
	onDelete,
	isDeleting,
}: {
	template: TicketTemplate;
	canEdit: boolean;
	onEdit: () => void;
	onDelete: () => void;
	isDeleting: boolean;
}) {
	const [confirming, setConfirming] = useState(false);

	const descPlain = rteToPlain(template.description);
	const hasPlan = !!(template.implementation_plan || template.rollback_plan);

	return (
		<div className="flex flex-col rounded-xl border border-border bg-background hover:border-border/80 transition-colors overflow-hidden">
			{/* Card header */}
			<div className="px-4 pt-4 pb-3 space-y-2">
				<div className="flex items-start gap-2 min-w-0">
					<p className="text-sm font-semibold text-ink flex-1 min-w-0 wrap-break-word line-clamp-2 leading-snug">
						{template.name}
					</p>
					{template.is_shared && (
						<span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-mint bg-mint/10 px-1.5 py-0.5 rounded-md mt-0.5">
							Shared
						</span>
					)}
				</div>

				{/* Type + priority badges */}
				<div className="flex items-center gap-1.5 flex-wrap">
					{template.ticket_type ? (
						<span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0", TYPE_COLOR[template.ticket_type] ?? "text-ink-3 bg-accent")}>
							{TYPE_LABEL[template.ticket_type] ?? template.ticket_type}
						</span>
					) : (
						<span className="text-[11px] text-ink-3/40 italic">Any type</span>
					)}
					{template.priority && (
						<span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-md shrink-0", PRIORITY_COLOR[template.priority] ?? "text-ink-3 bg-accent")}>
							{PRIORITY_LABEL[template.priority]}
						</span>
					)}
				</div>
			</div>

			{/* Title prefill */}
			{template.title && (
				<div className="px-4 pb-3">
					<p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/40 mb-1">Title</p>
					<p className="text-xs text-ink-2 line-clamp-1 break-all">{template.title}</p>
				</div>
			)}

			{/* Description preview */}
			{descPlain && (
				<div className="px-4 pb-3">
					<p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/40 mb-1">Description</p>
					<p className="text-xs text-ink-3/70 line-clamp-2 wrap-break-word">{descPlain}</p>
				</div>
			)}

			{/* Plans indicator */}
			{hasPlan && (
				<div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
					{template.implementation_plan && (
						<span className="text-[11px] text-ink-3/50 flex items-center gap-1 shrink-0">
							<span className="w-1.5 h-1.5 rounded-full bg-mint/60 inline-block" />
							Implementation plan
						</span>
					)}
					{template.rollback_plan && (
						<span className="text-[11px] text-ink-3/50 flex items-center gap-1 shrink-0">
							<span className="w-1.5 h-1.5 rounded-full bg-amber-400/70 inline-block" />
							Rollback plan
						</span>
					)}
				</div>
			)}

			{/* Spacer so footer always sticks to bottom */}
			<div className="flex-1" />

			{/* Actions footer */}
			{canEdit && (
				<div className="flex items-center gap-1 px-3 py-2 border-t border-border/40 bg-accent/20">
					<Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={onEdit}>
						Edit
					</Button>
					<div className="ml-auto flex items-center gap-1">
						{confirming ? (
							<>
								<Button
									variant="destructive"
									size="sm"
									className="text-xs h-7 px-2"
									onClick={() => { onDelete(); setConfirming(false); }}
									isLoading={isDeleting}
									disabled={isDeleting}
								>
									Confirm
								</Button>
								<Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={() => setConfirming(false)}>
									Cancel
								</Button>
							</>
						) : (
							<Button
								variant="ghost"
								size="sm"
								className="text-xs h-7 px-2 text-destructive hover:text-destructive"
								onClick={() => setConfirming(true)}
							>
								Delete
							</Button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesSettingsPage() {
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";
	const userId = user?.id ?? "";

	const [creating, setCreating] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const queryClient = useQueryClient();

	const { data: result, isLoading } = useQuery({
		queryKey: ["ticket-templates"],
		queryFn: () => APIService.ticketTemplates.list(),
		staleTime: 120_000,
	});
	const templates: TicketTemplate[] = Array.isArray(result) ? result : [];

	const createMutation = useMutation({
		mutationFn: (data: object) => APIService.ticketTemplates.create(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ticket-templates"] });
			setCreating(false);
		},
	});

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

	function renderSection(label: string, items: TicketTemplate[]) {
		if (items.length === 0) return null;
		return (
			<div className="space-y-2">
				<p className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50">{label}</p>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{items.map((t) =>
						editingId === t.id ? (
							<div key={t.id} className="sm:col-span-2">
								<TemplateForm
									initial={t}
									isAdmin={isAdmin}
									onSave={(data) => updateMutation.mutate({ id: t.id, data })}
									onCancel={() => setEditingId(null)}
									isSaving={updateMutation.isPending}
								/>
							</div>
						) : (
							<TemplateCard
								key={t.id}
								template={t}
								canEdit={isAdmin || t.user_id === userId}
								onEdit={() => setEditingId(t.id)}
								onDelete={() => {
									setDeletingId(t.id);
									deleteMutation.mutate(t.id);
								}}
								isDeleting={deletingId === t.id && deleteMutation.isPending}
							/>
						)
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3/60">Templates</p>
					<p className="text-xs text-ink-3/50 mt-1">
						Pre-fill ticket fields when creating new tickets.
						{isAdmin && " Shared templates are visible to all employees."}
					</p>
				</div>
				{!creating && (
					<Button size="sm" onClick={() => { setCreating(true); setEditingId(null); }}>
						New template
					</Button>
				)}
			</div>

			{creating && (
				<TemplateForm
					isAdmin={isAdmin}
					onSave={(data) => createMutation.mutate(data as object)}
					onCancel={() => setCreating(false)}
					isSaving={createMutation.isPending}
				/>
			)}

			{isLoading && (
				<p className="text-sm text-ink-3/50 py-8 text-center">Loading templates…</p>
			)}

			{!isLoading && templates.length === 0 && !creating && (
				<div className="text-center py-12 rounded-xl border border-dashed border-border">
					<p className="text-sm text-ink-3/60">No templates yet.</p>
					<p className="text-xs text-ink-3/40 mt-1">Create one to pre-fill common ticket fields.</p>
				</div>
			)}

			{renderSection("Shared", shared)}
			{renderSection("Personal", personal)}
		</div>
	);
}
