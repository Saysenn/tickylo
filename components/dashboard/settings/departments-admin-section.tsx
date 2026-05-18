"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, ArrowRight } from "lucide-react";
import Link from "next/link";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
	DialogRoot,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "@/components/ui/dialog";

export function DepartmentsAdminSection() {
	const queryClient = useQueryClient();

	const { data: orgSettings } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});

	const enabled = orgSettings?.departments_enabled ?? false;
	const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);

	const { mutate: updateSettings, isPending: isToggling } = useMutation({
		mutationFn: (val: boolean) => APIService.orgSettings.update({ departments_enabled: val }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["org-settings"] });
			setPendingToggle(null);
		},
		onError: () => setPendingToggle(null),
	});

	return (
		<section className="rounded-xl border bg-background p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-7 h-7 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
					<Building2 className="w-3.5 h-3.5 text-mint" />
				</div>
				<div className="flex-1">
					<h2 className="text-xs font-semibold text-ink">Department Hierarchy</h2>
					<p className="text-[11px] text-ink-3 mt-0.5">
						Organise employees into departments and assign managers.
					</p>
				</div>
			</div>

			{/* Toggle row */}
			<div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
				<div>
					<p className="text-sm font-medium text-ink">Enable departments</p>
					<p className="text-xs text-ink-3">Show department management, column, and filters across the system.</p>
				</div>
				<button
					type="button"
					role="switch"
					aria-checked={enabled}
					disabled={isToggling}
					onClick={() => setPendingToggle(!enabled)}
					className={cn(
						"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint",
						enabled ? "bg-mint" : "bg-accent",
						isToggling && "opacity-50 cursor-not-allowed",
					)}
				>
					<span
						className={cn(
							"pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
							enabled ? "translate-x-4" : "translate-x-0",
						)}
					/>
				</button>
			</div>

			{/* Link to departments page */}
			{enabled && (
				<Link
					href="/dashboard/departments"
					className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:border-mint/30 hover:bg-accent/20 transition-all group"
				>
					<div>
						<p className="text-sm font-medium text-ink">Manage Departments</p>
						<p className="text-xs text-ink-3">Create departments, assign managers, and add members.</p>
					</div>
					<ArrowRight className="w-4 h-4 text-ink-3 group-hover:text-ink transition-colors" />
				</Link>
			)}

			{/* Toggle confirmation dialog */}
			<DialogRoot open={pendingToggle !== null} onOpenChange={() => setPendingToggle(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{pendingToggle ? "Enable Department Hierarchy?" : "Disable Department Hierarchy?"}
						</DialogTitle>
						<DialogDescription>
							{pendingToggle
								? "Departments will appear in Settings and a dedicated Departments page will be added to the sidebar. You can disable this at any time — no data will be lost."
								: "The Departments page and all department columns, filters, and manager badges will be hidden. All assignments are preserved — re-enabling restores everything exactly as it was."}
						</DialogDescription>
					</DialogHeader>
					<div className="flex justify-end gap-2 pt-2">
						<DialogClose asChild>
							<Button variant="outline" size="sm">Cancel</Button>
						</DialogClose>
						<Button
							size="sm"
							className={pendingToggle ? "bg-mint hover:bg-mint/90 text-ink" : "bg-destructive hover:bg-destructive/90 text-white"}
							isLoading={isToggling}
							onClick={() => { if (pendingToggle !== null) updateSettings(pendingToggle); }}
						>
							{pendingToggle ? "Enable" : "Disable"}
						</Button>
					</div>
				</DialogContent>
			</DialogRoot>
		</section>
	);
}
