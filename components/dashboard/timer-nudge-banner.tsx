"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import APIService from "@/lib/infra/api";
import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimeEntry } from "@/components/dashboard/time-tracker/types";

const DISMISS_KEY = "timer_nudge_dismissed";

export function TimerNudgeBanner() {
	// Start as dismissed=true to avoid flash before sessionStorage is read
	const [dismissed, setDismissed] = useState(true);
	const queryClient = useQueryClient();

	useEffect(() => {
		setDismissed(!!sessionStorage.getItem(DISMISS_KEY));
	}, []);

	const { data: activeEntry, isLoading } = useQuery<TimeEntry | null>({
		queryKey: ["time", "active"],
		queryFn: () => APIService.time.active(),
		staleTime: 0,
		refetchOnWindowFocus: true,
	});

	const { mutate: startTimer, isPending } = useMutation({
		mutationFn: () => APIService.time.start(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["time", "active"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
		},
	});

	function dismiss() {
		sessionStorage.setItem(DISMISS_KEY, "1");
		setDismissed(true);
	}

	if (isLoading || dismissed || activeEntry) return null;

	return (
		<div className="flex items-center gap-3 px-5 md:px-7 py-2.5 bg-mint/8 border-b border-mint/15">
			<Clock className="w-3.5 h-3.5 text-mint shrink-0" />
			<span className="text-sm text-ink-2">You're not tracking time yet.</span>
			<div className="flex items-center gap-2 ml-auto">
				<Button
					size="sm"
					className="h-7 px-3 text-xs bg-mint hover:bg-mint/90 text-ink font-medium"
					isLoading={isPending}
					onClick={() => startTimer()}
				>
					Start Timer
				</Button>
				<button
					onClick={dismiss}
					className="text-ink-3 hover:text-ink-2 transition-colors p-0.5"
					aria-label="Dismiss"
				>
					<X className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
}
