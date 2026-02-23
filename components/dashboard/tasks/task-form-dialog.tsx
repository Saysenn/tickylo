"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface TaskFormDialogProps {
	isPending: boolean;
	onSubmit: (data: {
		title: string;
		description?: string;
		priority?: string;
		due_date?: string;
		assigned_to?: string;
	}) => Promise<void>;
	trigger: React.ReactNode;
}

export function TaskFormDialog({
	isPending,
	onSubmit,
	trigger,
}: TaskFormDialogProps) {
	const [open, setOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [priority, setPriority] = useState<string>("medium");
	const [dueDate, setDueDate] = useState("");
	const [assignedTo, setAssignedTo] = useState<string>("");
	const [error, setError] = useState("");

	// Load employee list for assignee dropdown
	const { data: employeesResult } = useQuery({
		queryKey: ["employees", 1],
		queryFn: () => APIService.employees.list(1, 50),
		enabled: open,
	});

	const employees: any[] = (employeesResult as any)?.data ?? [];

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		if (!title.trim()) {
			setError("Title is required.");
			return;
		}

		try {
			await onSubmit({
				title: title.trim(),
				description: description.trim() || undefined,
				priority: priority || undefined,
				due_date: dueDate || undefined,
				assigned_to: assignedTo || undefined,
			});
			setOpen(false);
			setTitle("");
			setDescription("");
			setPriority("medium");
			setDueDate("");
			setAssignedTo("");
		} catch {
			setError("Failed to create task. Please try again.");
		}
	}

	return (
		<DialogRoot open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>New Task</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					{/* Title */}
					<div className="space-y-1.5">
						<Label htmlFor="task-title">Title</Label>
						<input
							id="task-title"
							type="text"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							maxLength={200}
							placeholder="Task title"
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
							required
						/>
					</div>

					{/* Description */}
					<div className="space-y-1.5">
						<Label htmlFor="task-desc">Description (optional)</Label>
						<textarea
							id="task-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							rows={2}
							maxLength={1000}
							placeholder="What needs to be done?"
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-mint"
						/>
					</div>

					{/* Priority + Due date */}
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<Label htmlFor="priority">Priority</Label>
							<select
								id="priority"
								value={priority}
								onChange={(e) => setPriority(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
							>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="due-date">Due date (optional)</Label>
							<input
								id="due-date"
								type="date"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
							/>
						</div>
					</div>

					{/* Assign to */}
					<div className="space-y-1.5">
						<Label htmlFor="assigned-to">Assign to (optional)</Label>
						<select
							id="assigned-to"
							value={assignedTo}
							onChange={(e) => setAssignedTo(e.target.value)}
							className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-mint"
						>
							<option value="">Unassigned</option>
							{employees.map((emp: any) => (
								<option key={emp.id} value={emp.id}>
									{emp.name ?? emp.email}
								</option>
							))}
						</select>
					</div>

					{error && <p className="text-xs text-destructive">{error}</p>}

					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button type="submit" size="sm" disabled={isPending}>
							{isPending ? "Creating…" : "Create task"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</DialogRoot>
	);
}
