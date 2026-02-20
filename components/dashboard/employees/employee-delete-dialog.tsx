"use client";

import { useState } from "react";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Employee } from "./types";

interface EmployeeDeleteDialogProps {
  employee: Employee;
  trigger: React.ReactNode;
  onConfirm: () => Promise<void>;
  isPending: boolean;
}

export function EmployeeDeleteDialog({
  employee,
  trigger,
  onConfirm,
  isPending,
}: EmployeeDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setError("");
    try {
      await onConfirm();
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Failed to delete employee.");
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete employee</DialogTitle>
          <DialogDescription>
            This will permanently delete{" "}
            <span className="font-medium text-ink">{employee.name ?? employee.email}</span> and
            revoke their access. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive mb-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" size="sm" isLoading={isPending} onClick={handleConfirm}>
            Delete
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  );
}
