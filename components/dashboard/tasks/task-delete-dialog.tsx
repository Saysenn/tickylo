"use client";

import { useState } from "react";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Task } from "./types";

interface TaskDeleteDialogProps {
	task: Task;
	isPending: boolean;
	onConfirm: () => Promise<void>;
	trigger: React.ReactNode;
}

export function TaskDeleteDialog({
	task,
	isPending,
	onConfirm,
	trigger,
}: TaskDeleteDialogProps) {
	const [open, setOpen] = useState(false);

	async function handleConfirm() {
		await onConfirm();
		setOpen(false);
	}

	return (
		<DialogRoot open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{trigger}</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Delete ticket</DialogTitle>
				</DialogHeader>
				<p className="text-sm text-ink-3 pt-1">
					Are you sure you want to delete{" "}
					<span className="font-medium text-ink">{task.title}</span>? This
					action cannot be undone.
				</p>
				<div className="flex justify-end gap-2 pt-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setOpen(false)}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						variant="destructive"
						disabled={isPending}
						onClick={handleConfirm}
					>
						{isPending ? "Deleting…" : "Delete"}
					</Button>
				</div>
			</DialogContent>
		</DialogRoot>
	);
}
