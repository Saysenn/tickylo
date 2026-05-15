"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import APIService from "@/lib/infra/api";
import { TimeDateRange } from "@/components/dashboard/time-manager/time-date-range";
import { TimeSummaryCards } from "@/components/dashboard/time-manager/time-summary-cards";
import { TimeDayBars } from "@/components/dashboard/time-manager/time-day-bars";
import { TimeEmployeeTable } from "@/components/dashboard/time-manager/time-employee-table";
import type { TimeSummary } from "@/components/dashboard/time-manager/types";
import {
	todayDateStr, daysAgoDateStr, formatDurationMs,
	startOfMonthDateStr,
} from "@/lib/utils/format";
import { useAppSelector } from "@/store/hooks";
import { RecentTasksCard } from "@/components/dashboard/reports/team-activity-cards";
import { EmployeeSessionLog } from "@/components/dashboard/time-manager/employee-session-log";

const DATE_PRESETS = [
	{ label: "Today",        from: () => todayDateStr(),        to: () => todayDateStr() },
	{ label: "Last 7 days",  from: () => daysAgoDateStr(6),     to: () => todayDateStr() },
	{ label: "This month",   from: () => startOfMonthDateStr(), to: () => todayDateStr() },
	{ label: "Last 30 days", from: () => daysAgoDateStr(29),    to: () => todayDateStr() },
	{ label: "Last 90 days", from: () => daysAgoDateStr(89),    to: () => todayDateStr() },
];

function getPresetLabel(from: string, to: string): string {
	const match = DATE_PRESETS.find((p) => p.from() === from && p.to() === to);
	return match ? match.label : "Custom range";
}

export default function TimeManagerPage() {
	const user     = useAppSelector((s) => s.auth.user);
	const tzOffset = new Date().getTimezoneOffset();

	const [from, setFrom]           = useState(daysAgoDateStr(6));
	const [to,   setTo]             = useState(todayDateStr());
	const [searchInput,   setSearchInput]   = useState("");
	const [committedSearch, setCommittedSearch] = useState("");
	const [selectedEmployee, setSelectedEmployee] = useState("");
	const [selectedName,     setSelectedName]     = useState("");

	const submitSearch = () => setCommittedSearch(searchInput);

	const { data: teamData, isFetching: teamFetching } = useQuery<any>({
		queryKey: ["time-team-summary", from, to, committedSearch],
		queryFn: () => APIService.time.teamSummary(from, to, tzOffset, committedSearch || undefined),
		enabled: !selectedEmployee,
		placeholderData: (prev) => prev,
	});


	const { data: summary, isLoading: summaryLoading } = useQuery<TimeSummary>({
		queryKey: ["time-summary", from, to, selectedEmployee],
		queryFn: () => APIService.time.summary(from, to, selectedEmployee, tzOffset),
		enabled: !!selectedEmployee,
	});

	const showEmployee = !!selectedEmployee;
	const isLoading    = showEmployee ? summaryLoading : (!teamData && teamFetching);

	return (
		<div className="relative w-full space-y-6">
			<div
				className="fixed inset-0 -z-10 pointer-events-none"
				style={{
					background: `
						radial-gradient(ellipse at 12% 8%, rgba(128, 237, 153, 0.20) 0%, transparent 42%),
						radial-gradient(ellipse at 88% 85%, rgba(128, 237, 153, 0.14) 0%, transparent 42%)
					`,
				}}
			/>

			<div>
				<h1 className="text-2xl font-bold text-ink">Team Overview</h1>
				<p className="text-ink-3 mt-1 text-sm">Team time analytics and per-employee session breakdowns.</p>
			</div>

			<div className="flex flex-wrap items-end gap-3">
				{showEmployee && (
					<Button size="sm" variant="ghost" className="h-8 gap-1.5 text-ink-3"
						onClick={() => { setSelectedEmployee(""); setSelectedName(""); setSearchInput(""); setCommittedSearch(""); }}>
						<ChevronLeft className="w-4 h-4" />
						All Employees
					</Button>
				)}
				<TimeDateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
			</div>

			{showEmployee && (
				<p className="text-sm font-medium text-ink">
					Showing: <span className="text-mint font-semibold">{selectedName}</span>
				</p>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center py-16">
					<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			) : !showEmployee && teamData ? (
				<div className="space-y-6">
					<div className="grid grid-cols-2 gap-4">
						{/* Featured — total hours */}
						<div
							className="rounded-xl border border-mint/30 p-5 relative overflow-hidden shadow-[0_0_40px_rgba(128,237,153,0.22)]"
							style={{ background: "linear-gradient(135deg, #1c3a1c 0%, #143018 50%, #0d200d 100%)" }}
						>
							<div className="absolute inset-0 pointer-events-none"
								style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(128, 237, 153, 0.15) 0%, transparent 60%)" }} />
							<p className="relative text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
								Total team hours
								<span className="normal-case font-normal ml-1 opacity-70">({getPresetLabel(from, to)})</span>
							</p>
							<p className="relative text-3xl font-bold text-white">{formatDurationMs(teamData.totalTeamMs)}</p>
						</div>

						{/* Active members */}
						<div className="glass rounded-xl border-mint/25 p-5">
							<p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2 flex items-center gap-1.5">
								<span className="relative flex h-2 w-2 shrink-0">
									<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
									<span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
								</span>
								Active members
							</p>
							<p className="text-3xl font-bold text-ink">
								{teamData.activeCount}
								<span className="text-base font-normal text-ink-3 ml-1">/ {teamData.employees?.length ?? 0}</span>
							</p>
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex items-center gap-3 flex-wrap">
							<h2 className="text-sm font-semibold text-ink">Employee Breakdown</h2>
							<div className="flex items-center gap-1.5 ml-auto">
								<input
									type="text"
									placeholder="Search employee…"
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && submitSearch()}
									className="h-7 rounded-md border border-border bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-mint w-44"
								/>
								<Button size="sm" variant="outline" className="h-7 px-3 text-xs" onClick={submitSearch}>
									Search
								</Button>
							</div>
						</div>
						<TimeEmployeeTable
							employees={teamData.employees ?? []}
							onSelect={(id, name) => { setSelectedEmployee(id); setSelectedName(name); }}
							currentUserId={user?.id}
							isLoading={teamFetching}
						/>
					</div>
					<RecentTasksCard />
				</div>
			) : showEmployee && summary ? (
				<div className="space-y-4">
					<TimeSummaryCards summary={summary} rangeLabel={getPresetLabel(from, to)} />
					<TimeDayBars days={summary.days} />
					<EmployeeSessionLog userId={selectedEmployee} from={from} to={to} />
				</div>
			) : null}
		</div>
	);
}
