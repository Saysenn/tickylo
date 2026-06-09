"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Ticket, Save, RotateCcw } from "lucide-react";
import APIService from "@/lib/infra/api";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

// Single source of truth for configurable fields — mirrors CONFIGURABLE_FIELD_SCHEMAS in the API route
const EDITABLE_FIELD_OPTIONS: { key: string; label: string; description: string; defaultOn: boolean }[] = [
	{ key: "title",               label: "Title",               description: "Allow employees to rename the ticket.",                             defaultOn: true  },
	{ key: "description",         label: "Description",         description: "Allow employees to update the ticket description.",                 defaultOn: true  },
	{ key: "priority",            label: "Priority",            description: "Allow employees to change the ticket priority level.",              defaultOn: true  },
	{ key: "ticket_type",         label: "Ticket Type",         description: "Allow employees to change the ticket category.",                   defaultOn: true  },
	{ key: "due_date",            label: "Due Date",            description: "Allow employees to directly edit the due date without a request.",  defaultOn: true  },
	{ key: "billable_hours",      label: "Billable Hours",      description: "Allow employees to update billable hours logged.",                  defaultOn: true  },
	{ key: "implementation_plan", label: "Implementation Plan", description: "Allow employees to edit the implementation plan.",                  defaultOn: true  },
	{ key: "rollback_plan",       label: "Rollback Plan",       description: "Allow employees to edit the rollback plan.",                        defaultOn: true  },
	{ key: "links",               label: "Links",               description: "Allow employees to add or remove related links.",                   defaultOn: true  },
	{ key: "estimated_hours",     label: "Estimated Hours",     description: "Allow employees to update the estimated hours on a ticket.",        defaultOn: false },
	{ key: "status",              label: "Status",              description: "Allow employees to change the ticket status themselves.",            defaultOn: false },
];

const DEFAULT_ENABLED_FIELDS = EDITABLE_FIELD_OPTIONS.filter((f) => f.defaultOn).map((f) => f.key);

interface ToggleRowProps {
	label: string;
	description: string;
	checked: boolean;
	disabled: boolean;
	onChange: (val: boolean) => void;
}

function ToggleRow({ label, description, checked, disabled, onChange }: ToggleRowProps) {
	return (
		<div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
			<div className="flex-1 pr-6">
				<p className="text-sm font-medium text-ink">{label}</p>
				<p className="text-xs text-ink-3 mt-0.5">{description}</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				disabled={disabled}
				onClick={() => onChange(!checked)}
				className={cn(
					"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint",
					checked ? "bg-mint" : "bg-accent",
					disabled && "opacity-50 cursor-not-allowed",
				)}
			>
				<span
					className={cn(
						"pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
						checked ? "translate-x-4" : "translate-x-0",
					)}
				/>
			</button>
		</div>
	);
}

export function TicketPermissionsSection() {
	const queryClient = useQueryClient();

	// Draft state for the editable-fields checkboxes only
	const [draftFields, setDraftFields] = useState<string[] | null>(null);
	const savedFields = useRef<string[] | null>(null);

	const { data: orgSettings, isLoading } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});

	// Initialize draft once when server data loads
	useEffect(() => {
		if (orgSettings && !savedFields.current) {
			const initial = Array.isArray(orgSettings.employee_editable_fields)
				? [...(orgSettings.employee_editable_fields as string[])]
				: [...DEFAULT_ENABLED_FIELDS];
			setDraftFields(initial);
			savedFields.current = initial;
		}
	}, [orgSettings]);

	const { mutate: update, isPending } = useMutation({
		mutationFn: (data: Parameters<typeof APIService.orgSettings.update>[0]) =>
			APIService.orgSettings.update(data),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org-settings"] }),
	});

	const { mutate: saveFields, isPending: isSavingFields } = useMutation({
		mutationFn: (fields: string[]) =>
			APIService.orgSettings.update({ employee_editable_fields: fields }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["org-settings"] });
			if (draftFields) savedFields.current = [...draftFields];
		},
	});

	const fieldsDirty = draftFields && savedFields.current
		? [...draftFields].sort().join(",") !== [...savedFields.current].sort().join(",")
		: false;

	const togglesDisabled = isPending || isLoading;
	const fieldsDisabled  = isSavingFields || isLoading;

	const enabledFields = draftFields ?? DEFAULT_ENABLED_FIELDS;

	return (
		<div className="space-y-5">
			{/* Editable fields — batched save */}
			<section className="rounded-xl border bg-background p-6 space-y-4">
				<div className="flex items-center gap-3">
					<div className="w-7 h-7 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
						<Ticket className="w-3.5 h-3.5 text-mint" />
					</div>
					<div className="flex-1">
						<h2 className="text-xs font-semibold text-ink">Employee Editable Fields</h2>
						<p className="text-[11px] text-ink-3 mt-0.5">
							Select which ticket fields assigned employees with editor permission can modify.
						</p>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{EDITABLE_FIELD_OPTIONS.map((field) => {
						const checked = enabledFields.includes(field.key);
						return (
							<label
								key={field.key}
								className={cn(
									"flex items-start gap-3 rounded-lg border border-border px-4 py-3 cursor-pointer transition-colors",
									checked ? "bg-mint/5 border-mint/30" : "hover:bg-accent/40",
									fieldsDisabled && "opacity-60 cursor-not-allowed",
								)}
							>
								<Checkbox
									id={`field-${field.key}`}
									checked={checked}
									disabled={fieldsDisabled}
									onCheckedChange={(val) =>
										setDraftFields((prev) => {
											const base = prev ?? DEFAULT_ENABLED_FIELDS;
											return val
												? [...base, field.key]
												: base.filter((f) => f !== field.key);
										})
									}
									className="mt-0.5 shrink-0"
								/>
								<div>
									<p className="text-sm font-medium text-ink leading-tight">{field.label}</p>
									<p className="text-xs text-ink-3 mt-0.5">{field.description}</p>
								</div>
							</label>
						);
					})}
				</div>

				{/* Save / Discard — bottom right of this card */}
				<div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
					{fieldsDirty && (
						<>
							<p className="text-xs text-ink-3 mr-auto">You have unsaved changes.</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-1.5"
								disabled={isSavingFields}
								onClick={() => {
									if (savedFields.current) setDraftFields([...savedFields.current]);
								}}
							>
								<RotateCcw className="w-3.5 h-3.5" />
								Discard
							</Button>
						</>
					)}
					<Button
						type="button"
						size="sm"
						className="gap-1.5"
						isLoading={isSavingFields}
						disabled={isSavingFields || !fieldsDirty}
						onClick={() => draftFields && saveFields(draftFields)}
					>
						<Save className="w-3.5 h-3.5" />
						Save changes
					</Button>
				</div>
			</section>

			{/* Creator editing — immediate save */}
			<section className="rounded-xl border bg-background p-6 space-y-4">
				<div className="flex items-center gap-3">
					<div className="w-7 h-7 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
						<Ticket className="w-3.5 h-3.5 text-mint" />
					</div>
					<div className="flex-1">
						<h2 className="text-xs font-semibold text-ink">Ticket Creator Permissions</h2>
						<p className="text-[11px] text-ink-3 mt-0.5">
							Control what ticket creators can do on tickets they submitted.
						</p>
					</div>
				</div>

				<ToggleRow
					label="Allow ticket creators to edit their own tickets"
					description="When enabled, the employee who created a ticket can edit it using the same fields configured above, even if they are not the assignee."
					checked={orgSettings?.creator_can_edit_own_tickets ?? false}
					disabled={togglesDisabled}
					onChange={(val) => update({ creator_can_edit_own_tickets: val })}
				/>
			</section>

			{/* Client access — immediate save */}
			<section className="rounded-xl border bg-background p-6 space-y-4">
				<div className="flex items-center gap-3">
					<div className="w-7 h-7 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
						<Ticket className="w-3.5 h-3.5 text-mint" />
					</div>
					<div className="flex-1">
						<h2 className="text-xs font-semibold text-ink">Client Field Access</h2>
						<p className="text-[11px] text-ink-3 mt-0.5">
							Control whether employees can associate tickets with clients. Client fields affect billing and invoicing.
						</p>
					</div>
				</div>

				<ToggleRow
					label="Allow employees to select a client when creating a ticket"
					description="When enabled, employees see the client picker on the ticket creation form."
					checked={orgSettings?.employees_can_set_client_on_create ?? false}
					disabled={togglesDisabled}
					onChange={(val) => update({ employees_can_set_client_on_create: val })}
				/>

				<ToggleRow
					label="Allow employees to edit the client on a ticket"
					description="When enabled, employees can change which client a ticket is associated with. Use with caution — this directly affects invoicing."
					checked={orgSettings?.employees_can_edit_client ?? false}
					disabled={togglesDisabled}
					onChange={(val) => update({ employees_can_edit_client: val })}
				/>
			</section>

			{/* Merge tickets — immediate save */}
			<section className="rounded-xl border bg-background p-6 space-y-4">
				<div className="flex items-center gap-3">
					<div className="w-7 h-7 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
						<Ticket className="w-3.5 h-3.5 text-mint" />
					</div>
					<div className="flex-1">
						<h2 className="text-xs font-semibold text-ink">Ticket Merging</h2>
						<p className="text-[11px] text-ink-3 mt-0.5">
							Control whether employees can merge duplicate tickets. Admins can always merge.
						</p>
					</div>
				</div>

				<ToggleRow
					label="Allow employees to merge tickets"
					description="When enabled, employees can select 2–5 tickets in the tickets table and merge them into one. All comments, time entries, subtasks, and watchers are consolidated."
					checked={orgSettings?.employees_can_merge_tickets ?? false}
					disabled={togglesDisabled}
					onChange={(val) => update({ employees_can_merge_tickets: val })}
				/>
			</section>
		</div>
	);
}
