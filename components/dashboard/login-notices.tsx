"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Puzzle, X } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import APIService from "@/lib/infra/api";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notice {
	id: string;
	message: string;
	href: string;
	linkLabel: string;
	adminMessage?: string;
	adminLinkLabel?: string;
	variant?: "warning" | "info";
}

interface NoticeContext {
	isAdmin: boolean;
	me: { shift_start: string | null; shift_end: string | null } | null | undefined;
	schedule: { shift_start: string; shift_end: string; max_timer_hours: number | null } | null | undefined;
	orgSettings?: { extension_enabled: boolean } | null;
}

interface NoticeRule {
	id: string;
	message: string;
	href: string;
	linkLabel: string;
	adminMessage?: string;
	adminLinkLabel?: string;
	variant?: "warning" | "info";
	/** Return true when this notice should be shown */
	when: (ctx: NoticeContext) => boolean;
}

// ─── Notice rule registry ─────────────────────────────────────────────────────
// To add a new notice: append a new entry here. No other code changes needed.

const NOTICE_RULES: NoticeRule[] = [
	{
		id: "shift_not_set",
		message: "You haven't set personal shift hours. Your timer will auto-close based on your organization's shift schedule.",
		href: "/dashboard/settings/profile",
		linkLabel: "Set shift hours →",
		// Skip for admins when org has no schedule — the org schedule notice already covers the gap
		when: ({ me, isAdmin, schedule }) =>
			me !== undefined && (!me?.shift_start || !me?.shift_end) && !(isAdmin && schedule === null),
	},
	{
		id: "no_org_schedule",
		message: "Your organization has no work schedule configured. Employee timers won't auto-close at shift end.",
		href: "/dashboard/settings/organization",
		linkLabel: "Set up work schedule →",
		when: ({ isAdmin, schedule }) => isAdmin && schedule === null,
	},
	{
		id: "no_max_timer",
		message: "No maximum timer limit is set. Timers on weekends or outside shift hours will run indefinitely.",
		href: "/dashboard/settings/organization",
		linkLabel: "Enable max timer limit →",
		when: ({ isAdmin, schedule }) => isAdmin && schedule != null && schedule.max_timer_hours == null,
	},
	{
		id: "extension_available",
		message: "Your admin has enabled the Tickylo browser extension. Install it to clock in/out from any tab.",
		href: "https://chrome.google.com/webstore/detail/tickylo",
		linkLabel: "Install Extension →",
		adminMessage: "The browser extension is enabled for your organisation. Employees can install it to clock in/out from any tab.",
		adminLinkLabel: "Manage Extension →",
		variant: "info",
		when: ({ orgSettings }) => !!(orgSettings?.extension_enabled),
	},
];

// ─── Banner component ─────────────────────────────────────────────────────────

function NoticeBanner({ notice, isAdmin }: { notice: Notice; isAdmin: boolean }) {
	const storageKey = `notice_dismissed_${notice.id}`;
	const [dismissed, setDismissed] = useState(false);
	const useLocal = notice.id === "extension_available";

	useEffect(() => {
		const storage = useLocal ? localStorage : sessionStorage;
		if (storage.getItem(storageKey) === "1") setDismissed(true);
	}, [storageKey, useLocal]);

	const dismiss = () => {
		const storage = useLocal ? localStorage : sessionStorage;
		storage.setItem(storageKey, "1");
		setDismissed(true);
	};

	if (dismissed) return null;

	const isInfo = notice.variant === "info";

	return (
		<div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
			isInfo
				? "border-info/40 bg-info/5 dark:bg-info/15"
				: "border-warning/40 bg-warning/5 dark:bg-warning/15"
		}`}>
			{isInfo
				? <Puzzle className="w-4 h-4 text-info shrink-0 mt-0.5" />
				: <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
			}
			<p className="text-xs text-ink flex-1">
				{(isAdmin && notice.adminMessage) ? notice.adminMessage : notice.message}{" "}
				<Link
					href={(isAdmin && notice.adminMessage) ? "/dashboard/settings/organization?tab=extension" : notice.href}
					target={notice.href.startsWith("http") && !(isAdmin && notice.adminMessage) ? "_blank" : undefined}
					rel={notice.href.startsWith("http") && !(isAdmin && notice.adminMessage) ? "noopener noreferrer" : undefined}
					className={`font-semibold underline underline-offset-2 ${
						isInfo
							? "text-info hover:text-info/80"
							: "text-warning-fg hover:text-warning"
					}`}
				>
					{(isAdmin && notice.adminLinkLabel) ? notice.adminLinkLabel : notice.linkLabel}
				</Link>
			</p>
			<button
				type="button"
				onClick={dismiss}
				className="text-ink-3 hover:text-ink transition-colors shrink-0"
				aria-label="Dismiss"
			>
				<X className="w-3.5 h-3.5" />
			</button>
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LoginNotices() {
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";

	const { data: me } = useQuery<{ shift_start: string | null; shift_end: string | null }>({
		queryKey: ["user-me-shift"],
		queryFn: () => APIService.users.getMe(),
		staleTime: 300_000,
	});

	const { data: schedule } = useQuery<{
		shift_start: string;
		shift_end: string;
		max_timer_hours: number | null;
	} | null>({
		queryKey: ["work-schedule"],
		queryFn: () => APIService.workSchedule.get(),
		staleTime: 300_000,
		enabled: isAdmin,
	});

	const { data: orgSettings } = useQuery<{ extension_enabled: boolean }>({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});

	const ctx: NoticeContext = { isAdmin, me, schedule, orgSettings };
	const active = NOTICE_RULES.filter((rule) => rule.when(ctx));

	if (active.length === 0) return null;

	return (
		<div className="space-y-2 mb-5">
			{active.map((rule) => (
				<NoticeBanner key={rule.id} notice={rule} isAdmin={isAdmin} />
			))}
		</div>
	);
}
