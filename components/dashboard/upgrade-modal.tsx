"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Zap, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import APIService from "@/lib/infra/api";
import { cn } from "@/lib/utils/cn";
import type { Feature } from "@/lib/utils/plan-gate";

// ─── Feature metadata ──────────────────────────────────────────────────────────

interface FeatureMeta {
	label: string;
	description: string;
	plan: "business" | "enterprise";
}

const FEATURE_META: Partial<Record<Feature, FeatureMeta>> = {
	employees:        { label: "Employee Management", description: "Manage your team, roles, and departments.", plan: "business" },
	departments:      { label: "Departments", description: "Organise employees into departments with managers.", plan: "business" },
	bulk_operations:  { label: "Bulk Operations", description: "Perform actions on multiple records at once.", plan: "business" },
	ticket_requests:  { label: "Ticket Requests", description: "Review transfer, reopen, and due date requests.", plan: "business" },
	ticket_templates: { label: "Ticket Templates", description: "Save and reuse common ticket structures.", plan: "business" },
	work_schedule:    { label: "Work Schedule", description: "Configure shift hours and timer caps.", plan: "business" },
	attachments:      { label: "Attachments", description: "Attach files to tickets.", plan: "business" },
	time_manager:     { label: "Team Overview", description: "View time analytics across your whole team.", plan: "business" },
	audit_logs:       { label: "Time & Ticket Logs", description: "Immutable audit trail of all org activity.", plan: "business" },
	reports:          { label: "Reports", description: "Task completion rates and productivity metrics.", plan: "enterprise" },
	performance:      { label: "Performance Tracking", description: "Per-employee performance reports.", plan: "enterprise" },
	csv_export:       { label: "CSV / PDF Export", description: "Export your data in bulk.", plan: "enterprise" },
	ai:               { label: "AI Ticket Assistance", description: "Auto-fill tickets and chat with your data.", plan: "enterprise" },
	sms_ticket:       { label: "SMS → Ticket", description: "Convert inbound SMS into tickets automatically.", plan: "enterprise" },
	email_ticket:     { label: "Email → Ticket", description: "Convert inbound emails into tickets automatically.", plan: "enterprise" },
};

const PLAN_INFO = {
	business: {
		label: "Business",
		price: "$20/mo",
		priceNote: "+ $3.99/seat/mo",
		color: "text-blue-600",
		bg: "bg-blue-500/10 border-blue-500/20",
		icon: Zap,
		highlights: [
			"Employee & department management",
			"Bulk operations",
			"Ticket requests & templates",
			"Team time overview",
			"Work schedule & timer caps",
		],
	},
	enterprise: {
		label: "Enterprise",
		price: "$100/mo",
		priceNote: "25 seats included",
		color: "text-purple-600",
		bg: "bg-purple-500/10 border-purple-500/20",
		icon: Shield,
		highlights: [
			"Everything in Business",
			"Reports & analytics",
			"Performance tracking",
			"Audit logs (time & tickets)",
			"AI assistance, SMS & email → ticket",
		],
	},
};

// ─── Component ─────────────────────────────────────────────────────────────────

export function UpgradeModal() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [feature, setFeature] = useState<Feature | null>(null);
	const [portalError, setPortalError] = useState<string | null>(null);

	const upgradeParam = searchParams.get("upgrade") as Feature | null;

	useEffect(() => {
		if (upgradeParam) {
			setFeature(upgradeParam);
			setOpen(true);
		}
	}, [upgradeParam]);

	const { mutate: openPortal, isPending } = useMutation({
		mutationFn: () => APIService.billing.portal(),
		onSuccess: (res: any) => { window.location.href = res.data.url; },
		onError: (err: any) => {
			const msg = err?.response?.data?.error ?? "Failed to open billing portal. Please try again.";
			setPortalError(msg);
		},
	});

	const dismiss = () => {
		setOpen(false);
		setPortalError(null);
		const url = new URL(window.location.href);
		url.searchParams.delete("upgrade");
		router.replace(url.pathname + url.search);
	};

	const meta = feature ? FEATURE_META[feature] : null;
	const plan = meta?.plan ?? "business";
	const planInfo = PLAN_INFO[plan];
	const PlanIcon = planInfo.icon;

	return (
		<Dialog.Root open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
				<Dialog.Content
					className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background border border-border rounded-2xl shadow-2xl p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
				>
					<Dialog.Title className="sr-only">Upgrade required</Dialog.Title>

					{/* Close */}
					<button
						onClick={dismiss}
						className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-accent transition-colors"
					>
						<X className="w-4 h-4" />
					</button>

					{/* Lock icon + feature name */}
					<div className="flex flex-col items-center text-center mb-6">
						<div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center mb-4">
							<Lock className="w-5 h-5 text-ink-3" />
						</div>
						<h2 className="text-lg font-bold text-ink">
							{meta ? `${meta.label} requires ${planInfo.label}` : `Upgrade to ${planInfo.label}`}
						</h2>
						{meta && (
							<p className="text-sm text-ink-3 mt-1">{meta.description}</p>
						)}
					</div>

					{/* Plan card */}
					<div className={cn("rounded-xl border p-4 mb-5", planInfo.bg)}>
						<div className="flex items-center justify-between mb-3">
							<div className="flex items-center gap-2">
								<PlanIcon className={cn("w-4 h-4", planInfo.color)} />
								<span className={cn("text-sm font-semibold", planInfo.color)}>{planInfo.label}</span>
							</div>
							<div className="text-right">
								<span className="text-sm font-bold text-ink">{planInfo.price}</span>
								<p className="text-[10px] text-ink-3">{planInfo.priceNote}</p>
							</div>
						</div>
						<ul className="space-y-1.5">
							{planInfo.highlights.map((h) => (
								<li key={h} className="flex items-center gap-2 text-xs text-ink-2">
									<span className="w-1 h-1 rounded-full bg-ink-3 shrink-0" />
									{h}
								</li>
							))}
						</ul>
					</div>

					{/* CTAs */}
					<div className="flex flex-col gap-2">
						<Button
							className="w-full"
							isLoading={isPending}
							onClick={() => { setPortalError(null); openPortal(); }}
						>
							Upgrade Now
						</Button>
						<Button
							variant="outline"
							className="w-full"
							onClick={() => { dismiss(); router.push("/dashboard/settings/subscription"); }}
						>
							View Plans & Billing
						</Button>
					</div>
					{portalError && (
						<p className="text-center text-xs text-destructive mt-2">{portalError}</p>
					)}

					<p className="text-center text-[11px] text-ink-3 mt-4">
						Secured by Stripe · Cancel anytime
					</p>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
