"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Skeleton } from "@/components/ui/skeleton";

const INTERVAL_OPTIONS = [
	{ value: "5",   label: "Every 5 minutes" },
	{ value: "10",  label: "Every 10 minutes" },
	{ value: "15",  label: "Every 15 minutes" },
	{ value: "20",  label: "Every 20 minutes" },
	{ value: "30",  label: "Every 30 minutes" },
	{ value: "45",  label: "Every 45 minutes" },
	{ value: "60",  label: "Every hour" },
];

export function NudgeIntervalSection() {
	const queryClient = useQueryClient();
	const { data, isLoading } = useQuery<{ nudge_interval_minutes: number } | null>({
		queryKey: ["user-me"],
		queryFn: () => APIService.users.me(),
	});

	const [interval, setInterval] = useState("10");
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		if (data?.nudge_interval_minutes) setInterval(String(data.nudge_interval_minutes));
	}, [data]);

	const { mutate, isPending } = useMutation({
		mutationFn: () => APIService.users.updateNudgeInterval(Number(interval)),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["user-me"] });
			setSuccess(true);
			setError("");
			setTimeout(() => setSuccess(false), 3000);
		},
		onError: () => setError("Failed to save. Please try again."),
	});

	if (isLoading) return (
		<div className="rounded-xl border p-6 space-y-4">
			<div className="space-y-1"><Skeleton className="h-5 w-32" /><Skeleton className="h-3.5 w-64" /></div>
			<Skeleton className="h-10 w-48 rounded-md" />
		</div>
	);

	return (
		<div className="rounded-xl border bg-background p-6 space-y-4">
			<div className="flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg bg-mint/15 flex items-center justify-center shrink-0">
					<Bell className="w-4 h-4 text-mint" />
				</div>
				<div>
					<h2 className="text-xs font-semibold text-ink">Clock-in Reminder Interval</h2>
					<p className="text-[11px] text-ink-3 mt-0.5">How long to wait before reminding you to start your timer after it stops.</p>
				</div>
			</div>

			<div className="space-y-1.5 max-w-sm">
				<Label className="text-xs">Remind me after</Label>
				<Combobox
					options={INTERVAL_OPTIONS}
					value={interval}
					onChange={setInterval}
					placeholder="Every 10 minutes"
				/>
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}
			{success && <p className="text-xs text-mint">Reminder interval saved.</p>}

			<Button
				size="sm"
				className="bg-mint hover:bg-mint/90 text-ink"
				onClick={() => mutate()}
				disabled={isPending}
				isLoading={isPending}
			>
				Save
			</Button>
		</div>
	);
}
