"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";

interface Toggle {
	key: keyof ReturnType<typeof useFeatureData>;
	label: string;
	description: string;
	enterprise?: boolean;
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
	},
	{
		key:         "extension_enabled",
		label:       "Chrome Extension",
		description: "Allow employees to create and complete tickets directly from the Chrome extension without opening the dashboard.",
	},
	{
		key:         "attachments_enabled",
		label:       "File Attachments",
		description: "Allow employees to attach files to tickets. Stored in your organization's storage allocation.",
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
				return (
					<div key={t.key} className="flex items-start gap-4 rounded-xl border bg-background px-5 py-4">
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
				);
			})}
		</div>
	);
}
