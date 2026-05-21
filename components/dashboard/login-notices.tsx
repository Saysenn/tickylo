"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import APIService from "@/lib/infra/api";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notice {
	id: string;
	message: string;
	href: string;
	linkLabel: string;
}

interface NoticeContext {
	isAdmin: boolean;
	me: { shift_start: string | null; shift_end: string | null } | null | undefined;
	schedule: { shift_start: string; shift_end: string; max_timer_hours: number | null } | null | undefined;
}

interface NoticeRule {
	id: string;
	message: string;
	href: string;
	linkLabel: string;
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
];

// ─── Banner component ─────────────────────────────────────────────────────────

function NoticeBanner({ notice }: { notice: Notice }) {
	const storageKey = `notice_dismissed_${notice.id}`;
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (sessionStorage.getItem(storageKey) === "1") setDismissed(true);
	}, [storageKey]);

	const dismiss = () => {
		sessionStorage.setItem(storageKey, "1");
		setDismissed(true);
	};

	if (dismissed) return null;

	return (
		<div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 dark:bg-warning/15 px-4 py-3">
			<AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
			<p className="text-xs text-ink flex-1">
				{notice.message}{" "}
				<Link href={notice.href} className="font-semibold text-warning-fg underline underline-offset-2 hover:text-warning">
					{notice.linkLabel}
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

	const ctx: NoticeContext = { isAdmin, me, schedule };
	const active = NOTICE_RULES.filter((rule) => rule.when(ctx));

	if (active.length === 0) return null;

	return (
		<div className="space-y-2 mb-5">
			{active.map((rule) => (
				<NoticeBanner key={rule.id} notice={rule} />
			))}
		</div>
	);
}
