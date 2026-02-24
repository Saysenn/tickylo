"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, Send, FileBarChart, Clock, CheckSquare, TrendingUp, CalendarOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { startOfMonthDateStr, todayDateStr } from "@/lib/utils/format";

interface PageProps {
	params: Promise<{ id: string }>;
}

export default function EmployeeReportPage({ params }: PageProps) {
	const { id } = use(params);
	const from = startOfMonthDateStr();
	const to = todayDateStr();

	return (
		<div className="relative w-full space-y-6">
			{/* Mint mesh gradient background */}
			<div
				className="fixed inset-0 -z-10 pointer-events-none"
				style={{
					background: `
						radial-gradient(ellipse at 12% 8%, rgba(128, 237, 153, 0.20) 0%, transparent 42%),
						radial-gradient(ellipse at 88% 85%, rgba(128, 237, 153, 0.14) 0%, transparent 42%)
					`,
				}}
			/>

			{/* Back link */}
			<Link
				href="/dashboard/reports"
				className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-mint transition-colors"
			>
				<ChevronLeft className="w-4 h-4" />
				Back to Reports
			</Link>

			{/* Employee header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-4">
					<div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center text-ink font-bold text-lg shrink-0">
						—
					</div>
					<div>
						<h1 className="text-2xl font-bold text-ink">Employee Report</h1>
						<p className="text-ink-3 text-sm mt-0.5">
							Performance summary for employee{" "}
							<span className="font-mono text-xs bg-accent/50 px-1.5 py-0.5 rounded">
								{id.slice(0, 8)}…
							</span>
						</p>
					</div>
				</div>

				{/* Send Report — disabled */}
				<Button variant="outline" className="gap-2 shrink-0" disabled>
					<Send className="w-4 h-4" />
					Send Report
				</Button>
			</div>

			{/* Report period */}
			<Card
				className="p-0 gap-0 border border-[rgba(128,237,153,0.18)] backdrop-blur-xl"
				style={{ background: "var(--surface)" }}
			>
				<CardContent className="p-4">
					<div className="flex flex-wrap items-end gap-4">
						<div className="space-y-1.5">
							<Label htmlFor="rpt-from" className="text-xs text-ink-3">
								From
							</Label>
							<Input
								id="rpt-from"
								type="date"
								defaultValue={from}
								className="h-8 w-auto"
								disabled
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="rpt-to" className="text-xs text-ink-3">
								To
							</Label>
							<Input
								id="rpt-to"
								type="date"
								defaultValue={to}
								className="h-8 w-auto"
								disabled
							/>
						</div>
						<Button size="sm" disabled className="mb-0.5">
							Generate Report
						</Button>
						<p className="text-xs text-ink-3 ml-auto self-center">
							Generate a report to populate the metrics below.
						</p>
					</div>
				</CardContent>
			</Card>

			{/* KPI Cards */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Featured */}
				<Card
					className="p-0 gap-0 border border-mint/30 shadow-[0_0_40px_rgba(128,237,153,0.22)] overflow-hidden relative"
					style={{ background: "linear-gradient(135deg, #1c3a1c 0%, #143018 50%, #0d200d 100%)" }}
				>
					<div
						className="absolute inset-0 pointer-events-none"
						style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(128, 237, 153, 0.15) 0%, transparent 60%)" }}
					/>
					<CardContent className="relative p-5 flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<Clock className="w-4 h-4 text-white/50" />
							<p className="text-xs font-medium text-white/60 uppercase tracking-wider">
								Total Time
							</p>
						</div>
						<p className="text-3xl font-bold text-white">—</p>
						<p className="text-xs text-white/40">No report generated</p>
					</CardContent>
				</Card>

				{/* Glass — Tasks Completed */}
				<Card
					className="p-0 gap-0 border border-[rgba(128,237,153,0.18)] backdrop-blur-xl"
					style={{ background: "var(--surface)" }}
				>
					<CardContent className="p-5 flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<CheckSquare className="w-4 h-4 text-ink-3" />
							<p className="text-xs font-medium text-ink-3 uppercase tracking-wider">
								Tasks Completed
							</p>
						</div>
						<p className="text-3xl font-bold text-ink">—</p>
						<p className="text-xs text-ink-3">No report generated</p>
					</CardContent>
				</Card>

				{/* Glass — Completion Rate */}
				<Card
					className="p-0 gap-0 border border-[rgba(128,237,153,0.18)] backdrop-blur-xl"
					style={{ background: "var(--surface)" }}
				>
					<CardContent className="p-5 flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<TrendingUp className="w-4 h-4 text-ink-3" />
							<p className="text-xs font-medium text-ink-3 uppercase tracking-wider">
								Completion Rate
							</p>
						</div>
						<p className="text-3xl font-bold text-ink">—%</p>
						<p className="text-xs text-ink-3">No report generated</p>
					</CardContent>
				</Card>

				{/* Glass — Leaves Taken */}
				<Card
					className="p-0 gap-0 border border-[rgba(128,237,153,0.18)] backdrop-blur-xl"
					style={{ background: "var(--surface)" }}
				>
					<CardContent className="p-5 flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<CalendarOff className="w-4 h-4 text-ink-3" />
							<p className="text-xs font-medium text-ink-3 uppercase tracking-wider">
								Leaves Taken
							</p>
						</div>
						<p className="text-3xl font-bold text-ink">—</p>
						<p className="text-xs text-ink-3">No report generated</p>
					</CardContent>
				</Card>
			</div>

			{/* Activity breakdown — empty state */}
			<Card
				className="p-0 gap-0 border border-[rgba(128,237,153,0.18)] backdrop-blur-xl"
				style={{ background: "var(--surface)" }}
			>
				<CardContent className="p-5">
					<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider mb-4">
						Activity Breakdown
					</p>
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="w-12 h-12 rounded-2xl bg-mint/10 border border-mint/20 flex items-center justify-center mb-4">
							<FileBarChart className="w-6 h-6 text-ink-3" strokeWidth={1.5} />
						</div>
						<p className="font-medium text-ink mb-1">No report generated yet</p>
						<p className="text-sm text-ink-3 max-w-xs">
							Select a date range and click{" "}
							<span className="font-medium text-ink">Generate Report</span> to see
							this employee&apos;s activity breakdown.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
