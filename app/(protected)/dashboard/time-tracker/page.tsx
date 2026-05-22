"use client";

import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";
import APIService from "@/lib/infra/api";
import { PageTour } from "@/components/dashboard/page-tour";
import type { DriveStep } from "driver.js";

const TIME_TRACKER_STEPS: DriveStep[] = [
	{
		element: "#tour-time-tracker-page",
		popover: {
			title: "Time Tracker",
			description: "Log and review your work hours. Every time entry can be linked to a specific ticket so nothing goes untracked.",
		},
	},
];
import { TimeDateRange } from "@/components/dashboard/time-manager/time-date-range";
import { TimeSummaryCards } from "@/components/dashboard/time-manager/time-summary-cards";
import { TimeDayBars } from "@/components/dashboard/time-manager/time-day-bars";
import { TimeEntriesTable } from "@/components/dashboard/time-tracker/time-entries-table";
import type { TimeSummary } from "@/components/dashboard/time-manager/types";
import { todayDateStr, daysAgoDateStr, startOfMonthDateStr, startOfLastMonthDateStr, endOfLastMonthDateStr } from "@/lib/utils/format";

const DATE_PRESETS = [
	{ label: "Today",        from: () => todayDateStr(),            to: () => todayDateStr() },
	{ label: "Last 7 days",  from: () => daysAgoDateStr(6),         to: () => todayDateStr() },
	{ label: "Last 14 days", from: () => daysAgoDateStr(13),        to: () => todayDateStr() },
	{ label: "This month",   from: () => startOfMonthDateStr(),     to: () => todayDateStr() },
	{ label: "Last month",   from: () => startOfLastMonthDateStr(), to: () => endOfLastMonthDateStr() },
	{ label: "Last 30 days", from: () => daysAgoDateStr(29),        to: () => todayDateStr() },
	{ label: "Last 90 days", from: () => daysAgoDateStr(89),        to: () => todayDateStr() },
];

function getPresetLabel(from: string, to: string): string {
	const match = DATE_PRESETS.find((p) => p.from() === from && p.to() === to);
	return match ? match.label : "Custom range";
}

export default function TimeTrackerPage() {
	const router = useRouter();
	const [from, setFrom] = useState(daysAgoDateStr(6));
	const [to,   setTo]   = useState(todayDateStr());
	const tzOffset = new Date().getTimezoneOffset();

	const { data: summary, isLoading } = useQuery<TimeSummary>({
		queryKey: ["time-summary", from, to],
		queryFn: () => APIService.time.summary(from, to, undefined, tzOffset),
		enabled: !!from && !!to,
	});

	return (
		<div id="tour-time-tracker-page" className="relative w-full space-y-6">
			<Suspense><PageTour tourKey="time-tracker" steps={TIME_TRACKER_STEPS} /></Suspense>
			<div
				className="fixed inset-0 -z-10 pointer-events-none"
				style={{
					background: `
						radial-gradient(ellipse at 12% 8%, rgba(128, 237, 153, 0.20) 0%, transparent 42%),
						radial-gradient(ellipse at 88% 85%, rgba(128, 237, 153, 0.14) 0%, transparent 42%)
					`,
				}}
			/>

			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-ink">Time Tracker</h1>
					<p className="text-ink-3 mt-1 text-sm">Your personal time overview and session history.</p>
				</div>
				<button
					type="button"
					onClick={() => router.push("/dashboard/time-tracker/manage")}
					className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border hover:border-ink-3/40 hover:bg-accent/50 transition-colors text-xs font-medium text-ink-3 hover:text-ink"
				>
					<Settings2 className="w-3.5 h-3.5" />
					Manage Time
				</button>
			</div>

			<TimeDateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

			{isLoading ? (
				<div className="flex items-center justify-center py-16">
					<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			) : summary ? (
				<div className="space-y-4">
					<TimeSummaryCards summary={summary} rangeLabel={getPresetLabel(from, to)} />
					<TimeDayBars days={summary.days} />
				</div>
			) : null}

			<div className="space-y-2">
				<h2 className="text-sm font-semibold text-ink">Session Log</h2>
				<TimeEntriesTable from={from} to={to} />
			</div>
		</div>
	);
}
