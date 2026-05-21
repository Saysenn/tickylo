"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import APIService from "@/lib/infra/api";
import { cn } from "@/lib/utils/cn";

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

export function AdminPermissionsSection() {
  const queryClient = useQueryClient();

  const { data: orgSettings } = useQuery({
    queryKey: ["org-settings"],
    queryFn: () => APIService.orgSettings.get(),
    staleTime: 300_000,
  });

  const { mutate: update, isPending } = useMutation({
    mutationFn: (data: { admins_can_work_on_tickets?: boolean; include_admins_in_summary?: boolean }) =>
      APIService.orgSettings.update(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["org-settings"] }),
  });

  const canWork = orgSettings?.admins_can_work_on_tickets ?? false;
  const inSummary = orgSettings?.include_admins_in_summary ?? false;

  return (
    <section className="rounded-xl border bg-background p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-mint" />
        </div>
        <div className="flex-1">
          <h2 className="text-xs font-semibold text-ink">Admin Permissions</h2>
          <p className="text-[11px] text-ink-3 mt-0.5">
            Control how admin accounts participate in ticket work and team reporting.
          </p>
        </div>
      </div>

      <ToggleRow
        label="Allow admins to work on tickets"
        description="When enabled, admin accounts appear in assignee pickers when creating or reassigning tickets."
        checked={canWork}
        disabled={isPending}
        onChange={(val) => update({ admins_can_work_on_tickets: val })}
      />

      <ToggleRow
        label="Include admins in team summary"
        description="When enabled, admin time logs and activity are counted in the team overview and total team hours computation."
        checked={inSummary}
        disabled={isPending}
        onChange={(val) => update({ include_admins_in_summary: val })}
      />
    </section>
  );
}
