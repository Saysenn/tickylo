"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TimeOutDialogProps {
  open: boolean;
  isPending: boolean;
  onConfirm: (data: { title?: string; description?: string }) => void;
  onCancel: () => void;
}

export function TimeOutDialog({ open, isPending, onConfirm, onCancel }: TimeOutDialogProps) {
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");

  const handleConfirm = () => {
    onConfirm({
      title:       title.trim() || undefined,
      description: description.trim() || undefined,
    });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isPending) onCancel();
  };

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>End session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-ink-2 text-sm">
              Task title <span className="text-ink-3">(optional)</span>
            </Label>
            <Input
              id="task-title"
              placeholder="What were you working on?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description" className="text-ink-2 text-sm">
              Description <span className="text-ink-3">(optional)</span>
            </Label>
            <Input
              id="task-description"
              placeholder="Any additional notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            Keep running
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isPending}
            className="bg-destructive/90 hover:bg-destructive text-white"
          >
            Clock out
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
