"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { LinksEditor, type TicketLink } from "./links-editor";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import type { TicketTemplate } from "./types";

function isRteEmpty(val: string): boolean {
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

interface TaskFormDialogProps {
	isPending: boolean;
	onSubmit: (data: {
		title: string;
		description?: string;
		priority?: string;
		due_date?: string;
		assigned_to?: string;
		ticket_type?: string;
		client_name?: string;
		client_id?: string;
		estimated_hours?: number;
		billable_hours?: number;
		implementation_plan?: string;
		rollback_plan?: string;
		links?: { url: string; label?: string }[];
		source?: string;
		assignee_permission?: string;
	}) => Promise<void>;
	trigger: React.ReactNode;
}

const TYPE_PREFIX: Record<string, string> = {
	internal_task: "TASK",
	request:       "REQ",
	incident:      "INC",
	change:        "RFC",
};

const TYPE_HINT: Record<string, string> = {
	internal_task: "e.g. Migrate user auth to new provider",
	request:       "e.g. Add export functionality to reports",
	incident:      "e.g. Production API returning 500 on /login",
	change:        "e.g. Roll back the Node.js upgrade",
};

const inputCls =
	"w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint placeholder:text-ink-3/40";

function FieldOpt({ children }: { children: React.ReactNode }) {
	return (
		<span className="flex items-center gap-1.5">
			{children}
			<span className="text-[10px] font-normal text-ink-3/50">optional</span>
		</span>
	);
}

function SectionDivider({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-3 pt-1">
			<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">
				{label}
			</span>
			<div className="flex-1 border-t border-border/40" />
		</div>
	);
}

export function TaskFormDialog({
	isPending,
	onSubmit,
	trigger,
}: TaskFormDialogProps) {
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";

	const [open, setOpen] = useState(false);
	// titleBody holds only the text AFTER the prefix (prefix is managed separately)
	const [titleBody, setTitleBody] = useState("");
	const [description, setDescription] = useState("");
	const [ticketType, setTicketType] = useState("internal_task");
	const titleRef = useRef<HTMLInputElement>(null);

	const activePrefix = TYPE_PREFIX[ticketType] ?? "TASK";
	const activeHint   = TYPE_HINT[ticketType]   ?? "e.g. Ticket summary";
	const [priority, setPriority] = useState("medium");
	const [dueDate, setDueDate] = useState("");
	const [assignedTo, setAssignedTo] = useState("");
	const [clientId, setClientId] = useState("");
	const [clientName, setClientName] = useState("");
	const [clientComboValue, setClientComboValue] = useState("");
	const [estimatedHours, setEstimatedHours] = useState("");
	const [implementationPlan, setImplementationPlan] = useState("");
	const [rollbackPlan, setRollbackPlan] = useState("");
	const [links, setLinks] = useState<TicketLink[]>([]);
	const [source, setSource] = useState("in_system");
	const [assigneePermission, setAssigneePermission] = useState("editor");
	const [error, setError] = useState("");

	// Template state
	const [selectedTemplateId, setSelectedTemplateId] = useState("");

	const { data: templatesResult, isLoading: templatesLoading } = useQuery({
		queryKey: ["ticket-templates"],
		queryFn: () => APIService.ticketTemplates.list(),
		enabled: open,
		staleTime: 120_000,
	});
	const templates: TicketTemplate[] = Array.isArray(templatesResult) ? templatesResult : [];

	const applyTemplate = useCallback((template: TicketTemplate) => {
		if (template.ticket_type) setTicketType(template.ticket_type);
		if (template.priority) setPriority(template.priority);
		if (template.title) {
			const prefix = TYPE_PREFIX[template.ticket_type ?? "internal_task"] ?? "TASK";
			const body = template.title.startsWith(`${prefix}: `)
				? template.title.slice(prefix.length + 2)
				: template.title;
			setTitleBody(body);
		}
		setDescription(template.description ?? "");
		setImplementationPlan(template.implementation_plan ?? "");
		setRollbackPlan(template.rollback_plan ?? "");
		setLinks(Array.isArray(template.links) ? template.links.map((l) => ({ url: l.url, label: l.label ?? "" })) : []);
		requestAnimationFrame(() => titleRef.current?.focus());
	}, []);

	const { data: employeesResult } = useQuery({
		queryKey: ["employees", 1],
		queryFn: () => APIService.employees.list(1, 50),
		enabled: open,
		staleTime: 300_000,
	});
	const employees: any[] = (employeesResult as any)?.data ?? [];

	const { data: orgSettings } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
		enabled: open && !isAdmin,
	});

	const showClientField = isAdmin || (orgSettings?.employees_can_set_client_on_create ?? false);

	const { data: clientsResult } = useQuery({
		queryKey: ["clients"],
		queryFn: () => APIService.clients.list(),
		enabled: open && showClientField,
		staleTime: 60_000,
	});
	const clients: any[] = (clientsResult as any)?.data ?? [];

	const handleTypeChange = useCallback((newType: string) => {
		setTicketType(newType);
		// Keep the body text, just the prefix changes — focus title body
		requestAnimationFrame(() => {
			titleRef.current?.focus();
		});
	}, []);

	function resetForm() {
		setTitleBody("");
		setDescription("");
		setTicketType("internal_task");
		setPriority("medium");
		setDueDate("");
		setAssignedTo("");
		setClientId("");
		setClientName("");
		setClientComboValue("");
		setEstimatedHours("");
		setImplementationPlan("");
		setRollbackPlan("");
		setLinks([]);
		setSource("in_system");
		setAssigneePermission("editor");
		setError("");
		setSelectedTemplateId("");
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		if (!titleBody.trim()) { setError("Title is required — add a summary after the prefix."); return; }
		const fullTitle = `${activePrefix}: ${titleBody.trim()}`;
		try {
			await onSubmit({
				title: fullTitle,
				description: isRteEmpty(description) ? undefined : description,
				ticket_type: ticketType || undefined,
				priority: priority || undefined,
				due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
				assigned_to: assignedTo || undefined,
				client_id: clientId || undefined,
				client_name: clientName.trim() || undefined,
				estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
				implementation_plan: isRteEmpty(implementationPlan) ? undefined : implementationPlan,
				rollback_plan: isRteEmpty(rollbackPlan) ? undefined : rollbackPlan,
				links: links.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), label: l.label?.trim() || undefined })),
				source: source || undefined,
				assignee_permission: assigneePermission || undefined,
			});
			setOpen(false);
			resetForm();
		} catch {
			setError("Failed to create ticket. Please try again.");
		}
	}

	return (
		<DialogRoot open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>

			<DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0">
				{/* Modal header */}
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-6 py-4">
					<DialogHeader>
						<div className="flex items-center justify-between">
							<DialogTitle className="text-base font-semibold">New Ticket</DialogTitle>
							<button
								type="button"
								onClick={() => { setOpen(false); resetForm(); }}
								className="rounded-md p-1 text-ink-3/50 hover:text-ink hover:bg-accent/60 transition-colors"
								aria-label="Close"
							>
								<X className="w-4 h-4" />
							</button>
						</div>
					</DialogHeader>
				</div>

				<form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

					{/* ── Template selector ── */}
					<div className="flex items-center gap-2 p-3 rounded-lg bg-accent/50 border border-border/40">
						<span className="text-xs text-ink-3/70 shrink-0">Template:</span>
						{templatesLoading ? (
							<span className="flex-1 text-xs text-ink-3/40 italic">Loading…</span>
						) : templates.length > 0 ? (
							<Combobox
								options={[
									{ value: "", label: "Select a template…" },
									...templates.filter((t) => t.is_shared).map((t) => ({ value: t.id, label: `[Shared] ${t.name}` })),
									...templates.filter((t) => !t.is_shared).map((t) => ({ value: t.id, label: `[Personal] ${t.name}` })),
								]}
								value={selectedTemplateId}
								onChange={(id) => {
									const t = templates.find((t) => t.id === id);
									if (t) {
										applyTemplate(t);
										setSelectedTemplateId("");
									}
								}}
								placeholder="Select a template…"
								searchPlaceholder="Search templates…"
							/>
						) : (
							<span className="flex-1 text-xs text-ink-3/50 italic">No templates saved yet</span>
						)}
					</div>

					{/* ── Classification ── */}
					<SectionDivider label="Classification" />

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="ticket-type">Type</Label>
							<Combobox
								options={[
									{ value: "internal_task", label: "Internal Task" },
									{ value: "request", label: "Request" },
									{ value: "incident", label: "Incident" },
									{ value: "change", label: "Request for Change" },
								]}
								value={ticketType}
								onChange={handleTypeChange}
								placeholder="Select type…"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="priority">Priority</Label>
							<Combobox
								options={[
									{ value: "low", label: "Low" },
									{ value: "medium", label: "Medium" },
									{ value: "high", label: "High" },
									{ value: "critical", label: "Critical" },
								]}
								value={priority}
								onChange={setPriority}
								placeholder="Select priority…"
							/>
						</div>
					</div>

					{/* ── Title ── */}
					<SectionDivider label="Title" />

					<div className="space-y-1.5">
						<Label htmlFor="task-title" className="sr-only">Title</Label>
						{/* Split input: locked prefix badge + editable body */}
						<div className="flex items-center rounded-lg border border-border focus-within:ring-1 focus-within:ring-mint overflow-hidden h-10 bg-background">
							<span className="shrink-0 px-3 text-sm font-semibold text-mint bg-mint/8 border-r border-border h-full flex items-center select-none">
								{activePrefix}:
							</span>
							<input
								ref={titleRef}
								id="task-title"
								type="text"
								value={titleBody}
								onChange={(e) => setTitleBody(e.target.value)}
								maxLength={190}
								placeholder={activeHint}
								className="flex-1 min-w-0 px-3 text-sm font-medium text-ink bg-transparent focus:outline-none placeholder:text-ink-3/40 h-full"
								autoFocus
							/>
						</div>
						<p className="text-[11px] text-ink-3/50 pl-0.5">
							Prefix is auto-set from the ticket type above.
						</p>
					</div>

					{/* ── Scheduling & Assignment ── */}
					<SectionDivider label="Scheduling & Assignment" />

					<div className={isAdmin ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
						<div className="space-y-1.5">
							<Label htmlFor="due-date"><FieldOpt>Due date &amp; time</FieldOpt></Label>
							<input
								id="due-date"
								type="datetime-local"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className={inputCls}
							/>
						</div>
						{isAdmin && (
							<div className="space-y-1.5">
								<Label htmlFor="assigned-to"><FieldOpt>Assign to</FieldOpt></Label>
								<Combobox
									options={[
										{ value: "", label: "Unassigned" },
										...employees.map((emp: any) => ({ value: emp.id, label: emp.name ?? emp.email })),
									]}
									value={assignedTo}
									onChange={setAssignedTo}
									placeholder="Unassigned"
									searchPlaceholder="Search employee…"
									emptyText="No employees found."
								/>
							</div>
						)}
					</div>

					{/* Source & permission — admin only */}
					{isAdmin && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="source"><FieldOpt>Source</FieldOpt></Label>
								<Combobox
									options={[
										{ value: "", label: "Not specified" },
										{ value: "in_system", label: "In-system" },
										{ value: "email", label: "Email" },
										{ value: "sms", label: "SMS" },
									]}
									value={source}
									onChange={setSource}
									placeholder="Not specified"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="assignee-permission">Assignee access</Label>
								<Combobox
									options={[
										{ value: "editor", label: "Editor — can edit fields" },
										{ value: "viewer", label: "Viewer — read-only" },
									]}
									value={assigneePermission}
									onChange={setAssigneePermission}
									placeholder="Select access…"
								/>
							</div>
						</div>
					)}

					{/* ── Billing ── */}
					{(isAdmin || showClientField) && <SectionDivider label="Billing" />}

					<div className={showClientField ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}>
						{showClientField && (
							<div className="space-y-1.5">
								<Label><FieldOpt>Client</FieldOpt></Label>
								<Combobox
									options={[
										{ value: "", label: "No client" },
										{ value: "__front_office__", label: "Front Office" },
										{ value: "__back_office__", label: "Back Office" },
										...clients
											.filter((c: any) => !c.deleted_at)
											.map((c: any) => ({ value: c.id, label: c.name })),
									]}
									value={clientComboValue}
									onChange={(v) => {
										setClientComboValue(v);
										if (v === "__front_office__") {
											setClientId("");
											setClientName("Front Office");
										} else if (v === "__back_office__") {
											setClientId("");
											setClientName("Back Office");
										} else {
											setClientId(v);
											const found = clients.find((c: any) => c.id === v);
											setClientName(found?.name ?? "");
										}
									}}
									placeholder="No client"
									searchPlaceholder="Search clients…"
									emptyText="No clients found."
								/>
							</div>
						)}
						{isAdmin && (
							<div className="space-y-1.5">
								<Label htmlFor="estimated-hours"><FieldOpt>Estimated hours</FieldOpt></Label>
								<input
									id="estimated-hours"
									type="number"
									min="0"
									step="0.5"
									value={estimatedHours}
									onChange={(e) => setEstimatedHours(e.target.value)}
									placeholder="e.g. 4"
									className={inputCls}
								/>
							</div>
						)}
					</div>

					{/* ── Plans ── */}
					<SectionDivider label="Plans" />

					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label><FieldOpt>Implementation plan</FieldOpt></Label>
							<RichTextEditor
								value={implementationPlan}
								onChange={setImplementationPlan}
								placeholder="Step 1: Deploy to staging&#10;Step 2: Run migrations&#10;Step 3: Verify all endpoints respond"
								minHeight={80}
							/>
						</div>
						<div className="space-y-1.5">
							<Label><FieldOpt>Rollback plan</FieldOpt></Label>
							<RichTextEditor
								value={rollbackPlan}
								onChange={setRollbackPlan}
								placeholder="Step 1: Roll back deployment&#10;Step 2: Restore database snapshot if needed"
								minHeight={64}
							/>
						</div>
					</div>

					{/* ── Links ── */}
					<SectionDivider label="Links" />
					<LinksEditor links={links} onChange={setLinks} />

					{/* ── Description ── */}
					<SectionDivider label="Description" />

					<RichTextEditor
						value={description}
						onChange={setDescription}
						placeholder="What needs to be done? Provide context, steps to reproduce, acceptance criteria…"
						minHeight={120}
					/>

					{!isAdmin && (
						<p className="text-xs text-ink-3/70 bg-accent/50 border border-border/40 rounded-lg px-3 py-2">
							Your ticket will be reviewed by an admin before becoming active.
						</p>
					)}

					{error && <p className="text-xs text-destructive">{error}</p>}

					{/* ── Footer ── */}
					<div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => { setOpen(false); resetForm(); }}
						>
							Cancel
						</Button>
						<Button type="submit" size="sm" disabled={isPending} isLoading={isPending}>
							Create ticket
						</Button>
					</div>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
