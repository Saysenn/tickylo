"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Plus, Trash2 } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface Subtask {
	id: string;
	task_id: string;
	title: string;
	completed: boolean;
	position: number;
}

interface TaskSubtasksProps {
	taskId: string;
	enabled?: boolean;
}

export function TaskSubtasks({ taskId, enabled = true }: TaskSubtasksProps) {
	const queryClient = useQueryClient();
	const [newTitle, setNewTitle] = useState("");
	const [addError, setAddError] = useState<string | null>(null);

	const invalidate = () =>
		queryClient.invalidateQueries({ queryKey: ["task-subtasks", taskId] });

	const { data: subtasks = [], isLoading } = useQuery<Subtask[]>({
		queryKey: ["task-subtasks", taskId],
		queryFn: () => APIService.tasks.subtasks.list(taskId),
		enabled: !!taskId && enabled,
	});

	const { mutateAsync: addSubtask, isPending: isAdding } = useMutation({
		mutationFn: (title: string) => APIService.tasks.subtasks.create(taskId, title),
		onSuccess: () => {
			setNewTitle("");
			setAddError(null);
			invalidate();
		},
		onError: (err) => {
			setAddError(
				isAxiosError(err)
					? (err.response?.data?.error ?? "Failed to add subtask.")
					: "Something went wrong.",
			);
		},
	});

	const { mutate: toggleSubtask } = useMutation({
		mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
			APIService.tasks.subtasks.update(taskId, id, { completed }),
		onSuccess: invalidate,
	});

	const { mutate: removeSubtask } = useMutation({
		mutationFn: (id: string) => APIService.tasks.subtasks.remove(taskId, id),
		onSuccess: invalidate,
	});

	const handleAdd = (e: React.FormEvent) => {
		e.preventDefault();
		const t = newTitle.trim();
		if (!t) return;
		addSubtask(t);
	};

	const completedCount = subtasks.filter((s) => s.completed).length;
	const total = subtasks.length;
	const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

	return (
		<div className="space-y-3">
			{/* Progress bar */}
			{total > 0 && (
				<div className="h-1.5 rounded-full bg-border/50 overflow-hidden">
					<div
						className="h-full rounded-full bg-mint transition-all duration-300"
						style={{ width: `${pct}%` }}
					/>
				</div>
			)}

			{/* List */}
			{isLoading ? (
				<div className="flex justify-center py-4">
					<div className="w-4 h-4 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			) : (
				<ul className="space-y-1">
					{subtasks.map((s) => (
						<li key={s.id} className="group flex items-center gap-2 py-1">
							<input
								type="checkbox"
								checked={s.completed}
								onChange={() => toggleSubtask({ id: s.id, completed: !s.completed })}
								className="w-4 h-4 rounded border-border text-mint accent-mint cursor-pointer shrink-0"
							/>
							<span className={cn("text-sm flex-1", s.completed ? "line-through text-ink-3" : "text-ink")}>
								{s.title}
							</span>
							<button
								type="button"
								onClick={() => removeSubtask(s.id)}
								className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-ink-3 hover:text-destructive hover:bg-destructive/10"
								aria-label="Remove subtask"
							>
								<Trash2 className="w-3 h-3" />
							</button>
						</li>
					))}
				</ul>
			)}

			{/* Add form */}
			<form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
				<input
					type="text"
					value={newTitle}
					onChange={(e) => { setNewTitle(e.target.value); setAddError(null); }}
					placeholder="Add subtask…"
					maxLength={200}
					className="flex-1 h-7 rounded-md border border-border/50 bg-background px-2 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-mint/50 focus:border-mint/40"
				/>
				<Button type="submit" size="sm" variant="outline" className="h-7 px-2" disabled={!newTitle.trim() || isAdding}>
					<Plus className="w-3.5 h-3.5" />
				</Button>
			</form>
			{addError && <p className="text-xs text-destructive">{addError}</p>}
		</div>
	);
}
