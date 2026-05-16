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
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils/cn";
import { LinksEditor, type TicketLink } from "./links-editor";

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

const selectCls =
	"w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint";

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
	const [clientName, setClientName] = useState("");
	const [estimatedHours, setEstimatedHours] = useState("");
	const [implementationPlan, setImplementationPlan] = useState("");
	const [rollbackPlan, setRollbackPlan] = useState("");
	const [links, setLinks] = useState<TicketLink[]>([]);
	const [source, setSource] = useState("");
	const [assigneePermission, setAssigneePermission] = useState("editor");
	const [error, setError] = useState("");

	const { data: employeesResult } = useQuery({
		queryKey: ["employees", 1],
		queryFn: () => APIService.employees.list(1, 50),
		enabled: open,
	});
	const employees: any[] = (employeesResult as any)?.data ?? [];

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
		setClientName("");
		setEstimatedHours("");
		setImplementationPlan("");
		setRollbackPlan("");
		setLinks([]);
		setSource("");
		setAssigneePermission("editor");
		setError("");
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		if (!titleBody.trim()) { setError("Title is required — add a summary after the prefix."); return; }
		const fullTitle = `${activePrefix}: ${titleBody.trim()}`;
		try {
			await onSubmit({
				title: fullTitle,
				description: description.trim() || undefined,
				ticket_type: ticketType || undefined,
				priority: priority || undefined,
				due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
				assigned_to: assignedTo || undefined,
				client_name: clientName.trim() || undefined,
				estimated_hours: estimatedHours ? parseFloat(estimatedHours) : undefined,
				implementation_plan: implementationPlan.trim() || undefined,
				rollback_plan: rollbackPlan.trim() || undefined,
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
						<DialogTitle className="text-base font-semibold">New Ticket</DialogTitle>
					</DialogHeader>
				</div>

				<form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

					{/* ── Classification ── */}
					<SectionDivider label="Classification" />

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="ticket-type">Type</Label>
							<select
								id="ticket-type"
								value={ticketType}
								onChange={(e) => handleTypeChange(e.target.value)}
								className={selectCls}
							>
								<option value="internal_task">Internal Task</option>
								<option value="request">Request</option>
								<option value="incident">Incident</option>
								<option value="change">Request for Change</option>
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="priority">Priority</Label>
							<select
								id="priority"
								value={priority}
								onChange={(e) => setPriority(e.target.value)}
								className={selectCls}
							>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
								<option value="critical">Critical</option>
							</select>
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
								<select id="source" value={source} onChange={(e) => setSource(e.target.value)} className={selectCls}>
									<option value="">Not specified</option>
									<option value="in_system">In-system</option>
									<option value="email">Email</option>
									<option value="sms">SMS</option>
								</select>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="assignee-permission">Assignee access</Label>
								<select id="assignee-permission" value={assigneePermission} onChange={(e) => setAssigneePermission(e.target.value)} className={selectCls}>
									<option value="editor">Editor — can edit fields</option>
									<option value="viewer">Viewer — read-only</option>
								</select>
							</div>
						</div>
					)}

					{/* ── Billing ── */}
					<SectionDivider label="Billing" />

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="client-name"><FieldOpt>Client</FieldOpt></Label>
							<input
								id="client-name"
								type="text"
								value={clientName}
								onChange={(e) => setClientName(e.target.value)}
								maxLength={100}
								placeholder="e.g. Acme Corp"
								className={inputCls}
							/>
						</div>
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
					</div>

					{/* ── Plans ── */}
					<SectionDivider label="Plans" />

					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label htmlFor="impl-plan"><FieldOpt>Implementation plan</FieldOpt></Label>
							<textarea
								id="impl-plan"
								value={implementationPlan}
								onChange={(e) => setImplementationPlan(e.target.value)}
								rows={3}
								maxLength={5000}
								placeholder={"- Step 1: Deploy to staging\n- Step 2: Run migrations\n• Verify all endpoints respond"}
								className={cn(inputCls, "resize-none")}
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="rollback-plan"><FieldOpt>Rollback plan</FieldOpt></Label>
							<textarea
								id="rollback-plan"
								value={rollbackPlan}
								onChange={(e) => setRollbackPlan(e.target.value)}
								rows={2}
								maxLength={2000}
								placeholder={"- Step 1: Roll back deployment\n• Restore database snapshot if needed"}
								className={cn(inputCls, "resize-none")}
							/>
						</div>
					</div>

					{/* ── Links ── */}
					<SectionDivider label="Links" />
					<LinksEditor links={links} onChange={setLinks} />

					{/* ── Description (last — future rich text editor) ── */}
					<SectionDivider label="Description" />

					<div className="space-y-1.5">
						<Label htmlFor="task-desc" className="sr-only">Description</Label>
						{/* Placeholder for future rich text / attachment area */}
						<div className="rounded-lg border border-border focus-within:ring-1 focus-within:ring-mint overflow-hidden">
							<textarea
								id="task-desc"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={5}
								maxLength={1000}
								placeholder="What needs to be done? Provide context, steps to reproduce, acceptance criteria…"
								className="w-full bg-background px-3 py-3 text-sm focus:outline-none placeholder:text-ink-3/40 resize-none"
							/>
							{/* Toolbar strip — stubbed for future rich-text / attachments */}
							<div className="flex items-center gap-1 px-3 py-2 border-t border-border/40 bg-accent/40">
								<span className="text-[10px] text-ink-3/50 font-medium">
									Markdown supported &middot; Attachments coming soon
								</span>
							</div>
						</div>
					</div>

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
