"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WorkSchedule {
	timezone: string;
	shift_start: string;
	shift_end: string;
	working_days: number[];
	daily_cap_h: number;
}

export function WorkScheduleReadonlySection() {
	const { data, isLoading } = useQuery<WorkSchedule | null>({
		queryKey: ["work-schedule"],
		queryFn: () => APIService.workSchedule.get(),
		staleTime: 600_000,
	});

	if (isLoading) return (
		<div className="rounded-xl border p-6 space-y-4">
			<Skeleton className="h-5 w-40" />
			<div className="grid grid-cols-7 gap-2">
				{Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-9 rounded-lg" />)}
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div className="space-y-1.5"><Skeleton className="h-3.5 w-20" /><Skeleton className="h-9 w-full rounded-lg" /></div>
				<div className="space-y-1.5"><Skeleton className="h-3.5 w-20" /><Skeleton className="h-9 w-full rounded-lg" /></div>
			</div>
		</div>
	);

	if (!data) return (
		<div className="rounded-xl border bg-background p-6 flex flex-col items-center justify-center gap-2 py-10 text-center">
			<Clock className="w-7 h-7 text-ink-3/30" strokeWidth={1.5} />
			<p className="text-sm text-ink-3">Work schedule not yet configured by your organization.</p>
		</div>
	);

	return (
		<div className="rounded-xl border bg-background p-6 space-y-4">
			<div>
				<h2 className="text-sm font-semibold text-ink">Work Schedule</h2>
				<p className="text-xs text-ink-3 mt-0.5">Your organization's shift configuration.</p>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
				<div>
					<p className="text-[10px] text-ink-3 uppercase tracking-wider mb-0.5">Timezone</p>
					<p className="text-sm font-medium text-ink">{data.timezone}</p>
				</div>
				<div>
					<p className="text-[10px] text-ink-3 uppercase tracking-wider mb-0.5">Shift Hours</p>
					<p className="text-sm font-medium text-ink">{data.shift_start} – {data.shift_end}</p>
				</div>
				<div>
					<p className="text-[10px] text-ink-3 uppercase tracking-wider mb-0.5">Daily Cap</p>
					<p className="text-sm font-medium text-ink">{data.daily_cap_h}h</p>
				</div>
			</div>

			<div>
				<p className="text-[10px] text-ink-3 uppercase tracking-wider mb-1.5">Working Days</p>
				<div className="flex gap-1.5 flex-wrap">
					{DAYS.map((day, i) => (
						<span
							key={day}
							className={`px-3 py-1 rounded-lg text-xs font-medium border ${
								data.working_days.includes(i)
									? "bg-mint/15 border-mint/30 text-mint"
									: "bg-background border-border text-ink-3/40"
							}`}
						>
							{day}
						</span>
					))}
				</div>
			</div>
		</div>
	);
}
