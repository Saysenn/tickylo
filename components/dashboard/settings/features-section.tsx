"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import APIService from "@/lib/infra/api";
import { StorageConfigForm } from "./storage-config-form";

type ExpandableType = "extension" | "departments" | "storage";

interface Toggle {
	key:         keyof ReturnType<typeof useFeatureData>;
	label:       string;
	description: string;
	enterprise?: boolean;
	expandable?: ExpandableType;
}

function useFeatureData() {
	const { data } = useQuery({
		queryKey: ["org-settings"],
		queryFn:  () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});
	return {
		performance_enabled: (data as any)?.performance_enabled ?? true,
		invoices_enabled:    (data as any)?.invoices_enabled ?? true,
		departments_enabled: (data as any)?.departments_enabled ?? false,
		extension_enabled:   (data as any)?.extension_enabled ?? false,
		attachments_enabled: (data as any)?.attachments_enabled ?? true,
	};
}

const EXTENSION_URL = "https://chrome.google.com/webstore/detail/tickworks";

function ExtensionDetails() {
	const [copied, setCopied] = useState(false);
	function handleCopy() {
		navigator.clipboard.writeText(EXTENSION_URL).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}
	return (
		<div className="px-5 py-4 space-y-2">
			<p className="text-xs font-medium text-ink-2">Share this link with your team to install the extension:</p>
			<div className="flex items-center gap-2">
				<code className="flex-1 text-[11px] font-mono bg-accent/40 border border-border rounded-md px-3 py-2 text-ink-2 truncate">
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
	);
}

function DepartmentsLink() {
	return (
		<div className="px-5 py-4">
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
		</div>
	);
}

function StorageDetails() {
	return (
		<div className="px-5 py-4">
			<StorageConfigForm />
		</div>
	);
}

const TOGGLES: Toggle[] = [
	{
		key:         "performance_enabled",
		label:       "Performance Reports",
		description: "Show the Performance page in the sidebar. Admins can view team activity, completion rates, and time tracked per employee.",
		enterprise:  true,
	},
	{
		key:         "invoices_enabled",
		label:       "Invoice Reports",
		description: "Show the Invoices page in the sidebar. Admins can generate and manage client invoices with full history.",
		enterprise:  true,
	},
	{
		key:         "departments_enabled",
		label:       "Departments",
		description: "Enable department hierarchy. Admins can create departments, assign employees, and designate department managers.",
		expandable:  "departments",
	},
	{
		key:         "extension_enabled",
		label:       "Chrome Extension",
		description: "Allow employees to create and complete tickets directly from the Chrome extension without opening the dashboard.",
		expandable:  "extension",
	},
	{
		key:         "attachments_enabled",
		label:       "File Attachments",
		description: "Allow employees to attach files to tickets. Configure your storage provider below when enabled.",
		expandable:  "storage",
	},
];

export function FeaturesSection() {
	const queryClient = useQueryClient();
	const values = useFeatureData();

	const { mutate: toggle } = useMutation({
		mutationFn: (data: Parameters<typeof APIService.orgSettings.update>[0]) =>
			APIService.orgSettings.update(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["org-settings"] });
		},
	});

	return (
		<div className="space-y-3">
			{TOGGLES.map((t) => {
				const enabled = values[t.key] as boolean;
				const hasExpandable = !!t.expandable;

				return (
					<div key={t.key} className="rounded-xl border bg-background overflow-hidden">
						{/* Toggle row */}
						<div className="flex items-start gap-4 px-5 py-4">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<p className="text-sm font-semibold text-ink">{t.label}</p>
									{t.enterprise && (
										<span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">Enterprise</span>
									)}
								</div>
								<p className="text-xs text-ink-3 mt-1 leading-relaxed">{t.description}</p>
							</div>
							<button
								type="button"
								role="switch"
								aria-checked={enabled}
								onClick={() => toggle({ [t.key]: !enabled } as any)}
								className={`relative shrink-0 mt-0.5 w-11 h-6 rounded-full transition-colors ${enabled ? "bg-mint" : "bg-border"}`}
							>
								<span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
							</button>
						</div>

						{/* Expandable section */}
						{hasExpandable && (
							<div className={`grid transition-all duration-300 ease-in-out ${enabled ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
								<div className="overflow-hidden">
									<div className="border-t border-border/50">
										{t.expandable === "extension"   && <ExtensionDetails />}
										{t.expandable === "departments" && <DepartmentsLink />}
										{t.expandable === "storage"     && <StorageDetails />}
									</div>
								</div>
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
}
