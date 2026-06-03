"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { TIMEZONES } from "@/lib/utils/format";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface WorkSchedule {
	timezone: string;
	shift_start: string;
	shift_end: string;
	working_days: number[];
	daily_cap_h: number;
	max_timer_hours: number | null;
}

export function WorkScheduleAdminSection() {
	const queryClient = useQueryClient();
	const { data, isLoading } = useQuery<WorkSchedule | null>({
		queryKey: ["work-schedule"],
		queryFn: () => APIService.workSchedule.get(),
		staleTime: 600_000,
	});

	const [timezone, setTimezone] = useState("UTC");
	const [shiftStart, setShiftStart] = useState("09:00");
	const [shiftEnd, setShiftEnd] = useState("17:00");
	const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
	const [dailyCap, setDailyCap] = useState(8);
	const [maxTimerEnabled, setMaxTimerEnabled] = useState(false);
	const [maxTimerHours, setMaxTimerHours] = useState(12);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (data) {
			setTimezone(data.timezone);
			setShiftStart(data.shift_start);
			setShiftEnd(data.shift_end);
			setWorkingDays(data.working_days);
			setDailyCap(data.daily_cap_h);
			setMaxTimerEnabled(data.max_timer_hours != null);
			setMaxTimerHours(data.max_timer_hours ?? 12);
		}
	}, [data]);

	const { mutate, isPending } = useMutation({
		mutationFn: () => APIService.workSchedule.update({
			timezone,
			shift_start: shiftStart,
			shift_end: shiftEnd,
			working_days: workingDays,
			daily_cap_h: dailyCap,
			max_timer_hours: maxTimerEnabled ? maxTimerHours : null,
		}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["work-schedule"] });
			setSuccess(true);
			setError("");
			setTimeout(() => setSuccess(false), 3000);
		},
		onError: () => setError("Failed to save. Please try again."),
	});

	const toggleDay = (day: number) => {
		setWorkingDays((prev) =>
			prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
		);
	};

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
			<Skeleton className="h-10 w-28 rounded-md" />
		</div>
	);

	return (
		<div className="rounded-xl border bg-background p-6 space-y-5">
			<div>
				<h2 className="text-xs font-semibold text-ink">Work Schedule</h2>
				<p className="text-[11px] text-ink-3 mt-0.5">Set the org-wide shift hours and working days. Used to auto-close forgotten timers.</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{/* Timezone */}
				<div className="sm:col-span-3 space-y-1.5">
					<Label className="text-xs">Org Timezone</Label>
					<Combobox
						options={TIMEZONES.map((tz) => ({ value: tz.value, label: tz.label }))}
						value={timezone}
						onChange={setTimezone}
						placeholder="Select timezone…"
						searchPlaceholder="Search timezone…"
						emptyText="No timezone found."
					/>
					<p className="text-[10px] text-ink-3">This is the timezone the shift runs in — where your team works.</p>
				</div>

				{/* Shift start */}
				<div className="space-y-1.5">
					<Label className="text-xs">Shift Start</Label>
					<Input
						type="time"
						value={shiftStart}
						onChange={(e) => setShiftStart(e.target.value)}
						className="h-9 text-sm"
					/>
				</div>

				{/* Shift end */}
				<div className="space-y-1.5">
					<Label className="text-xs">Shift End</Label>
					<Input
						type="time"
						value={shiftEnd}
						onChange={(e) => setShiftEnd(e.target.value)}
						className="h-9 text-sm"
					/>
				</div>

				{/* Daily cap */}
				<div className="space-y-1.5">
					<Label className="text-xs">Daily Cap (hours)</Label>
					<Input
						type="number"
						min={0.5}
						max={24}
						step={0.5}
						value={dailyCap}
						onChange={(e) => setDailyCap(parseFloat(e.target.value))}
						className="h-9 text-sm"
					/>
					<p className="text-[10px] text-ink-3">Timers longer than 1.5× this are flagged for review.</p>
				</div>
			</div>

			{/* Auto-close after max hours */}
			<div className="rounded-lg border border-border/60 bg-accent/20 px-4 py-3 space-y-3">
				<div className="flex items-center justify-between gap-4">
					<div>
						<p className="text-xs font-semibold text-ink">Auto-close after max hours</p>
						<p className="text-[11px] text-ink-3 mt-0.5">
							Automatically stop any timer running longer than the limit, regardless of shift schedule.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setMaxTimerEnabled((v) => !v)}
						className={cn(
							"relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
							maxTimerEnabled ? "bg-mint" : "bg-border",
						)}
					>
						<span
							className={cn(
								"pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
								maxTimerEnabled ? "translate-x-4" : "translate-x-0",
							)}
						/>
					</button>
				</div>
				{maxTimerEnabled && (
					<div className="flex items-center gap-3">
						<Input
							type="number"
							min={1}
							max={72}
							step={1}
							value={maxTimerHours}
							onChange={(e) => setMaxTimerHours(parseInt(e.target.value, 10))}
							className="h-9 text-sm w-28"
						/>
						<span className="text-xs text-ink-3">hours maximum per timer</span>
					</div>
				)}
			</div>

			{/* Working days */}
			<div className="space-y-1.5">
				<Label className="text-xs">Working Days</Label>
				<div className="flex gap-1.5 flex-wrap">
					{DAYS.map((day, i) => (
						<button
							key={day}
							type="button"
							onClick={() => toggleDay(i)}
							className={cn(
								"px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
								workingDays.includes(i)
									? "bg-mint/15 border-mint/30 text-mint"
									: "bg-background border-border text-ink-3 hover:bg-accent/50",
							)}
						>
							{day}
						</button>
					))}
				</div>
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}
			{success && <p className="text-xs text-mint">Work schedule saved.</p>}

			<Button
				size="sm"
				className="bg-mint hover:bg-mint/90 text-ink"
				onClick={() => mutate()}
				disabled={isPending || workingDays.length === 0}
				isLoading={isPending}
			>
				Save Schedule
			</Button>
		</div>
	);
}
