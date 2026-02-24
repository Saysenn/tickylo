"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import APIService from "@/lib/infra/api";
import { TimeDateRange } from "@/components/dashboard/time-manager/time-date-range";
import { TimeSummaryCards } from "@/components/dashboard/time-manager/time-summary-cards";
import { TimeDayBars } from "@/components/dashboard/time-manager/time-day-bars";
import { TimeEmployeeTable } from "@/components/dashboard/time-manager/time-employee-table";
import type { TimeSummary } from "@/components/dashboard/time-manager/types";
import { todayDateStr, daysAgoDateStr, formatDurationMs } from "@/lib/utils/format";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";

export default function TimeManagerPage() {
	const [from, setFrom] = useState(daysAgoDateStr(6));
	const [to, setTo] = useState(todayDateStr());

	// selectedEmployee = "" means "team view" (admin), or current user (employee)
	const [selectedEmployee, setSelectedEmployee] = useState<string>("");
	const [selectedName, setSelectedName] = useState<string>("");

	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";
	const tzOffset = new Date().getTimezoneOffset(); // in minutes
	// Admin: fetch team summary for the employee table
	const { data: teamData, isLoading: teamLoading } = useQuery<any>({
		queryKey: ["time-team-summary", from, to],
		queryFn: () => APIService.time.teamSummary(from, to, tzOffset),
		enabled: isAdmin && !selectedEmployee,
	});

	// Individual time breakdown (always for non-admin; for admin when employee is selected)
	const { data: summary, isLoading: summaryLoading } = useQuery<TimeSummary>({
		queryKey: ["time-summary", from, to, selectedEmployee],
		queryFn: () =>
			APIService.time.summary(
				from,
				to,
				selectedEmployee || undefined,
				tzOffset,
			),
		enabled: !!from && !!to && (!isAdmin || !!selectedEmployee),
	});

	const handleSelectEmployee = (id: string, name: string) => {
		setSelectedEmployee(id);
		setSelectedName(name);
	};

	const handleBackToTeam = () => {
		setSelectedEmployee("");
		setSelectedName("");
	};

	const showTeamView = isAdmin && !selectedEmployee;
	const isLoading = showTeamView ? teamLoading : summaryLoading;

	return (
		<div className="w-full space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Time Manager</h1>
				<p className="text-ink-3 mt-1 text-sm">
					{isAdmin
						? "View time breakdown by employee and date range."
						: "View your time breakdown for any date range."}
				</p>
			</div>

			{/* Header controls */}
			<div className="flex flex-wrap items-end gap-3">
				{/* Admin individual view: back button */}
				{isAdmin && selectedEmployee && (
					<Button
						size="sm"
						variant="ghost"
						className="h-8 gap-1.5 text-ink-3"
						onClick={handleBackToTeam}
					>
						<ChevronLeft className="w-4 h-4" />
						Team Overview
					</Button>
				)}

				<TimeDateRange
					from={from}
					to={to}
					onChange={(f, t) => {
						setFrom(f);
						setTo(t);
					}}
				/>
			</div>

			{/* Employee name when viewing individual */}
			{isAdmin && selectedEmployee && (
				<p className="text-sm font-medium text-ink">
					Showing:{" "}
					<span className="text-mint font-semibold">{selectedName}</span>
				</p>
			)}

			{isLoading ? (
				<div className="flex items-center justify-center py-24">
					<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
				</div>
			) : showTeamView ? (
				/* ─── Admin: Team View ─── */
				<div className="space-y-6">
					{/* Team summary cards */}
					{teamData && (
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-lg border bg-mint/15 border-mint/30 p-5">
								<p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2">
									Total team hours
								</p>
								<p className="text-3xl font-bold text-ink">
									{formatDurationMs(teamData.totalTeamMs)}
								</p>
							</div>
							<div className="rounded-lg border bg-mint/15 border-mint/30 p-5">
								<p className="text-xs font-medium text-ink-3 uppercase tracking-wider mb-2 flex items-center gap-1.5">
									<span className="relative flex h-2 w-2 shrink-0">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
										<span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
									</span>
									Active members
								</p>
								<p className="text-3xl font-bold text-ink">
									{teamData.activeCount}
									<span className="text-base font-normal text-ink-3 ml-1">
										/ {teamData.employees?.length ?? 0}
									</span>
								</p>
							</div>
						</div>
					)}

					{/* Employee list */}
					<div className="space-y-2">
						<h2 className="text-sm font-semibold text-ink">
							Employee Breakdown
						</h2>
						<TimeEmployeeTable
							employees={teamData?.employees ?? []}
							onSelect={handleSelectEmployee}
						/>
					</div>
				</div>
			) : summary ? (
				/* ─── Individual View ─── */
				<div className="space-y-4">
					<TimeSummaryCards summary={summary} />
					<TimeDayBars days={summary.days} />
				</div>
			) : null}
		</div>
	);
}
