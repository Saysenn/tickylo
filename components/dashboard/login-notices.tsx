"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import APIService from "@/lib/infra/api";
import Link from "next/link";

interface Notice {
	id: string;
	message: string;
	href: string;
	linkLabel: string;
}

function NoticeBanner({ notice }: { notice: Notice }) {
	const key = `notice_dismissed_${notice.id}`;
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (sessionStorage.getItem(key) === "1") setDismissed(true);
	}, [key]);

	const dismiss = () => {
		sessionStorage.setItem(key, "1");
		setDismissed(true);
	};

	if (dismissed) return null;

	return (
		<div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-500/15 px-4 py-3">
			<AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
			<p className="text-xs text-ink flex-1">
				{notice.message}{" "}
				<Link href={notice.href} className="font-semibold text-amber-600 underline underline-offset-2 hover:text-amber-500">
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

	const notices: Notice[] = [];

	// All users — shift not set (show if loaded and shift fields are absent/null)
	// me === undefined means still loading — skip
	// me === null means user not in DB yet — still show notice
	if (me !== undefined && (!me?.shift_start || !me?.shift_end)) {
		notices.push({
			id: "shift_not_set",
			message: "You haven't set your personal shift hours. Your timer won't auto-close at shift end.",
			href: "/dashboard/settings/profile",
			linkLabel: "Set shift hours →",
		});
	}

	// Admin — no org work schedule at all
	if (isAdmin && schedule === null) {
		notices.push({
			id: "no_org_schedule",
			message: "Your organization has no work schedule configured. Employee timers won't auto-close at shift end.",
			href: "/dashboard/settings/organization",
			linkLabel: "Set up work schedule →",
		});
	}

	// Admin — schedule exists but max_timer_hours not set
	if (isAdmin && schedule !== null && schedule !== undefined && schedule.max_timer_hours == null) {
		notices.push({
			id: "no_max_timer",
			message: "No maximum timer limit is set. Timers on weekends or outside shift hours will run indefinitely.",
			href: "/dashboard/settings/organization",
			linkLabel: "Enable max timer limit →",
		});
	}

	if (notices.length === 0) return null;

	return (
		<div className="space-y-2 mb-5">
			{notices.map((n) => (
				<NoticeBanner key={n.id} notice={n} />
			))}
		</div>
	);
}
