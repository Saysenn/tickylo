"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { LinksEditor } from "@/components/dashboard/tasks/links-editor";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { cn } from "@/lib/utils/cn";
import { toDatetimeInput } from "@/lib/utils/format";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import type { Task, TicketLink } from "@/components/dashboard/tasks/types";

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint placeholder:text-ink-3/50";
const optLabel = (text: string) => (
	<span className="flex items-center gap-1.5">
		{text}
		<span className="text-[10px] text-ink-3/50 font-normal">optional</span>
	</span>
);

const BUILTIN_CLIENTS = ["Front Office", "Back Office"];

function initClientCombo(ticket: Task): string {
	if ((ticket as any).client_id) return (ticket as any).client_id;
	if (BUILTIN_CLIENTS.includes(ticket.client_name ?? ""))
		return `__${(ticket.client_name ?? "").toLowerCase().replace(" ", "_")}__`;
	return "";
}

interface Props {
	ticket: Task;
	open: boolean;
	onOpenChange: (v: boolean) => void;
	isEmployee?: boolean;
}

export function EditTicketDialog({ ticket, open, onOpenChange, isEmployee = false }: Props) {
	const queryClient = useQueryClient();

	const [title,              setTitle]              = useState(ticket.title);
	const [description,        setDescription]        = useState(ticket.description ?? "");
	const [ticketType,         setTicketType]         = useState<string>(ticket.ticket_type ?? "internal_task");
	const [status,             setStatus]             = useState<string>(ticket.status);
	const [priority,           setPriority]           = useState<string>(ticket.priority ?? "medium");
	const [dueDate,            setDueDate]            = useState(ticket.due_date ? toDatetimeInput(ticket.due_date) : "");
	const [clientId,           setClientId]           = useState<string>((ticket as any).client_id ?? "");
	const [clientName,         setClientName]         = useState(ticket.client_name ?? "");
	const [clientComboValue,   setClientComboValue]   = useState<string>(initClientCombo(ticket));
	const [clientEmail,        setClientEmail]        = useState((ticket as any).client_email ?? "");
	const [estimatedHours,     setEstimatedHours]     = useState(ticket.estimated_hours != null ? String(ticket.estimated_hours) : "");
	const [billableHours,      setBillableHours]      = useState(ticket.billable_hours  != null ? String(ticket.billable_hours)  : "");
	const [implementationPlan, setImplementationPlan] = useState(ticket.implementation_plan ?? "");
	const [rollbackPlan,       setRollbackPlan]       = useState(ticket.rollback_plan ?? "");
	const [links,              setLinks]              = useState<TicketLink[]>(Array.isArray((ticket as any).links) ? (ticket as any).links : []);
	const [source,             setSource]             = useState<string>((ticket as any).source ?? "");
	const [assigneePermission, setAssigneePermission] = useState<string>((ticket as any).assignee_permission ?? "editor");
	const [error,              setError]              = useState("");

	// Always fetch fresh ticket data when the dialog opens so stale list cache
	// doesn't cause fields like client_id to show outdated values.
	const { data: freshData } = useQuery({
		queryKey: ["ticket", ticket.id],
		queryFn: () => APIService.tasks.get(ticket.id),
		enabled: open,
		staleTime: 0,
	});

	const { data: clientsData } = useQuery({
		queryKey: ["clients"],
		queryFn: () => APIService.clients.list(),
		enabled: open && !isEmployee,
		staleTime: 60_000,
	});
	const clientOptions: any[] = (clientsData as any)?.data ?? [];

	useEffect(() => {
		if (!open) return;
		// Prefer freshly fetched data over the (possibly stale) list cache entry
		const t: any = (freshData as any) ?? ticket;
		setTitle(t.title);
		setDescription(t.description ?? "");
		setTicketType(t.ticket_type ?? "internal_task");
		setStatus(t.status);
		setPriority(t.priority ?? "medium");
		setDueDate(t.due_date ? toDatetimeInput(t.due_date) : "");
		setClientId(t.client_id ?? "");
		setClientName(t.client_name ?? "");
		setClientComboValue(initClientCombo(t));
		setClientEmail(t.client_email ?? "");
		setEstimatedHours(t.estimated_hours != null ? String(t.estimated_hours) : "");
		setBillableHours(t.billable_hours  != null ? String(t.billable_hours)  : "");
		setImplementationPlan(t.implementation_plan ?? "");
		setRollbackPlan(t.rollback_plan ?? "");
		setLinks(Array.isArray(t.links) ? t.links : []);
		setSource(t.source ?? "");
		setAssigneePermission(t.assignee_permission ?? "editor");
		setError("");
	}, [open, ticket, freshData]);

	const { mutateAsync: saveTicket, isPending: isSaving } = useMutation({
		mutationFn: (data: object) => APIService.tasks.update(ticket.id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["tasks"] });
			queryClient.invalidateQueries({ queryKey: ["ticket", ticket.id] });
			onOpenChange(false);
		},
		onError: () => setError("Failed to save changes."),
	});

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");
		if (!title.trim()) { setError("Title is required."); return; }
		const linksPayload = links.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), label: l.label?.trim() || undefined }));

		if (isEmployee) {
			await saveTicket({
				title: title.trim(),
				description: description.trim() || null,
				priority,
				implementation_plan: implementationPlan.trim() || null,
				rollback_plan:       rollbackPlan.trim()       || null,
				billable_hours:      billableHours ? parseFloat(billableHours) : null,
				links: linksPayload,
			});
		} else {
			await saveTicket({
				title: title.trim(),
				description: description.trim() || null,
				ticket_type: ticketType,
				status,
				priority,
				due_date: dueDate ? new Date(dueDate).toISOString() : null,
				source: source || null,
				assignee_permission: assigneePermission,
				client_id: clientId || null,
				client_name: clientName.trim() || null,
				client_email: clientEmail.trim() || null,
				estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
				billable_hours:  billableHours  ? parseFloat(billableHours)  : null,
				implementation_plan: implementationPlan.trim() || null,
				rollback_plan:       rollbackPlan.trim()       || null,
				links: linksPayload,
			});
		}
	}

	return (
		<DialogRoot open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0">
				<div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-6 py-4">
					<DialogHeader>
						<DialogTitle className="text-base font-semibold">Edit Ticket</DialogTitle>
						<DialogDescription className="sr-only">Edit the ticket fields below and save changes.</DialogDescription>
					</DialogHeader>
				</div>

				<form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

					{/* Classification */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Classification</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					{isEmployee ? (
						<div className="space-y-1.5">
							<Label>Priority</Label>
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
					) : (
						<>
							<div className="grid grid-cols-3 gap-4">
								<div className="space-y-1.5">
									<Label>Type</Label>
									<Combobox
										options={[
											{ value: "internal_task", label: "Internal Task" },
											{ value: "request", label: "Request" },
											{ value: "incident", label: "Incident" },
											{ value: "change", label: "Request for Change" },
										]}
										value={ticketType}
										onChange={setTicketType}
										placeholder="Select type…"
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Status</Label>
									<Combobox
										options={[
											{ value: "pending", label: "Open" },
											{ value: "assigned", label: "Assigned" },
											{ value: "in_progress", label: "In Progress" },
											{ value: "on_hold", label: "On Hold" },
											{ value: "stale", label: "Stale" },
											{ value: "completed", label: "Resolved" },
											{ value: "closed", label: "Closed" },
										]}
										value={status}
										onChange={setStatus}
										placeholder="Select status…"
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Priority</Label>
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
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-1.5">
									<Label>{optLabel("Source")}</Label>
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
									<Label>Assignee access</Label>
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
						</>
					)}

					{/* Title */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Title</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="edit-title" className="sr-only">Title</Label>
						<input id="edit-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={`${inputCls} font-medium`} required />
					</div>

					{/* Scheduling & Billing */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Scheduling & Billing</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					{!isEmployee && (
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<Label htmlFor="edit-due">{optLabel("Due date & time")}</Label>
								<input id="edit-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} />
							</div>
							<div className="space-y-1.5">
								<Label>{optLabel("Client")}</Label>
								<Combobox
									options={[
										{ value: "", label: "No client" },
										{ value: "__front_office__", label: "Front Office" },
										{ value: "__back_office__", label: "Back Office" },
										...clientOptions
											.filter((c: any) => !c.deleted_at)
											.map((c: any) => ({ value: c.id, label: c.name })),
									]}
									value={clientComboValue}
									onChange={(v) => {
										setClientComboValue(v);
										if (v === "__front_office__") {
											setClientId(""); setClientName("Front Office");
										} else if (v === "__back_office__") {
											setClientId(""); setClientName("Back Office");
										} else {
											setClientId(v);
											setClientName(clientOptions.find((c: any) => c.id === v)?.name ?? "");
										}
									}}
									placeholder="No client"
									searchPlaceholder="Search clients…"
									emptyText="No clients found."
								/>
							</div>
						</div>
					)}
					<div className="grid grid-cols-2 gap-4">
						{!isEmployee && (
							<div className="space-y-1.5">
								<Label htmlFor="edit-est">{optLabel("Est. hours")}</Label>
								<input id="edit-est" type="number" min="0" step="0.5" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="e.g. 4" className={inputCls} />
							</div>
						)}
						<div className={cn("space-y-1.5", isEmployee && "col-span-2")}>
							<Label htmlFor="edit-bill">{optLabel("Billable hours")}</Label>
							<input id="edit-bill" type="number" min="0" step="0.5" value={billableHours} onChange={(e) => setBillableHours(e.target.value)} placeholder="e.g. 4" className={inputCls} />
						</div>
					</div>

					{/* Plans */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Plans</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<div className="space-y-4">
						<div className="space-y-1.5">
							<Label>{optLabel("Implementation plan")}</Label>
							<RichTextEditor value={implementationPlan} onChange={setImplementationPlan} placeholder="- Step 1: Deploy to staging&#10;- Step 2: Run migrations" />
						</div>
						<div className="space-y-1.5">
							<Label>{optLabel("Rollback plan")}</Label>
							<RichTextEditor value={rollbackPlan} onChange={setRollbackPlan} placeholder="- Step 1: Roll back deployment&#10;• Restore database snapshot if needed" />
						</div>
					</div>

					{/* Links */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Links</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<LinksEditor links={links} onChange={setLinks} />

					{/* Description */}
					<div className="flex items-center gap-3">
						<span className="text-[10px] font-semibold uppercase tracking-widest text-ink-3/50 whitespace-nowrap">Description</span>
						<div className="flex-1 border-t border-border/40" />
					</div>
					<RichTextEditor value={description} onChange={setDescription} placeholder="What needs to be done? Context, steps to reproduce, acceptance criteria…" />

					{error && <p className="text-xs text-destructive">{error}</p>}

					<div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
						<Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
						<Button type="submit" size="sm" isLoading={isSaving}>Save changes</Button>
					</div>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
