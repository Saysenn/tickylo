"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Puzzle } from "lucide-react";
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

const EXTENSION_URL = "https://chrome.google.com/webstore/detail/tickylo";

export function ExtensionAdminSection() {
	const queryClient = useQueryClient();

	const { data: orgSettings } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});

	const enabled = orgSettings?.extension_enabled ?? false;
	const [pendingToggle, setPendingToggle] = useState<boolean | null>(null);
	const [copied, setCopied] = useState(false);

	const { mutate: updateSettings, isPending: isToggling } = useMutation({
		mutationFn: (val: boolean) => APIService.orgSettings.update({ extension_enabled: val }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["org-settings"] });
			setPendingToggle(null);
		},
		onError: () => setPendingToggle(null),
	});

	function handleCopy() {
		navigator.clipboard.writeText(EXTENSION_URL).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	return (
		<section className="rounded-xl border bg-background p-6 space-y-4">
			{/* Header */}
			<div className="flex items-center gap-3">
				<div className="w-7 h-7 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
					<Puzzle className="w-3.5 h-3.5 text-mint" />
				</div>
				<div className="flex-1">
					<h2 className="text-xs font-semibold text-ink">Browser Extension</h2>
					<p className="text-[11px] text-ink-3 mt-0.5">
						Allow employees to clock in/out and manage tickets from the browser extension.
					</p>
				</div>
			</div>

			{/* Toggle row */}
			<div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
				<div>
					<p className="text-sm font-medium text-ink">Enable browser extension</p>
					<p className="text-xs text-ink-3">Employees can install the Tickylo extension and use it while logged into the dashboard.</p>
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

			{/* Install link info box */}
			{enabled && (
				<div className="rounded-lg border border-mint/30 bg-mint/5 px-4 py-3 space-y-2">
					<p className="text-xs font-medium text-ink-2">
						Share this link with your team to install the extension:
					</p>
					<div className="flex items-center gap-2">
						<code className="flex-1 text-[11px] font-mono bg-background border border-border rounded-md px-3 py-2 text-ink-2 truncate">
							{EXTENSION_URL}
						</code>
						<button
							type="button"
							onClick={handleCopy}
							className="shrink-0 px-3 py-2 rounded-md border border-border text-xs font-medium text-ink-2 hover:bg-accent/30 transition-colors"
						>
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>
				</div>
			)}

			{/* Toggle confirmation dialog */}
			<DialogRoot open={pendingToggle !== null} onOpenChange={() => setPendingToggle(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{pendingToggle ? "Enable Browser Extension?" : "Disable Browser Extension?"}
						</DialogTitle>
						<DialogDescription>
							{pendingToggle
								? "Employees will be able to install and use the Tickylo browser extension to clock in/out and manage tickets from any tab."
								: "The browser extension will stop working for all employees in your organisation. They can still use the dashboard normally."}
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
