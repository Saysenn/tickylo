"use client";

import { useEffect, useState } from "react";
import {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLES } from "@/configs/rbac.config";
import type { Employee } from "./types";

interface EmployeeFormDialogProps {
  mode: "create" | "edit";
  employee?: Employee;
  trigger: React.ReactNode;
  onSubmit: (data: { name: string; email?: string; password?: string; role: string }) => Promise<void>;
  isPending: boolean;
}

export function EmployeeFormDialog({
  mode,
  employee,
  trigger,
  onSubmit,
  isPending,
}: EmployeeFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(ROLES.EMPLOYEE);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName(employee?.name ?? "");
      setEmail(employee?.email ?? "");
      setPassword("");
      setRole(employee?.role ?? ROLES.EMPLOYEE);
      setError("");
    }
  }, [open, employee]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const payload =
        mode === "create"
          ? { name, email, password, role }
          : { name, role };
      await onSubmit(payload);
      setOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? "Something went wrong.");
    }
  };

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add employee" : "Edit employee"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new account for a team member."
              : "Update this employee's details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>

          {mode === "create" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@company.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Temporary password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label>Role</Label>
            <SelectRoot value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROLES.EMPLOYEE}>Employee</SelectItem>
                <SelectItem value={ROLES.ADMIN}>Admin</SelectItem>
              </SelectContent>
            </SelectRoot>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" size="sm" isLoading={isPending}>
              {mode === "create" ? "Add employee" : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
