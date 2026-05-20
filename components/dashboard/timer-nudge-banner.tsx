"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import APIService from "@/lib/infra/api";
import { Clock, X, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimeEntry } from "@/components/dashboard/time-tracker/types";

const DISMISS_KEY = "timer_nudge_dismissed";

export function TimerNudgeBanner() {
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
			dismiss();
		},
	});

	function dismiss() {
		sessionStorage.setItem(DISMISS_KEY, "1");
		setDismissed(true);
	}

	const open = !isLoading && !dismissed && !activeEntry;

	return (
		<Dialog.Root open={open}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
				<Dialog.Content
					className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 focus:outline-none"
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<Dialog.Title className="sr-only">Clock in reminder</Dialog.Title>
					<div className="rounded-2xl border bg-background p-6 shadow-xl">
						{/* Close */}
						<button
							onClick={dismiss}
							className="absolute right-4 top-4 rounded-lg p-1 text-ink-3 hover:text-ink-2 transition-colors"
							aria-label="Dismiss"
						>
							<X className="w-4 h-4" />
						</button>

						{/* Icon */}
						<div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-mint/15 border border-mint/25 mx-auto mb-5">
							<Timer className="w-7 h-7 text-mint" />
						</div>

						{/* Text */}
						<div className="text-center mb-6">
							<h2 className="text-lg font-bold text-ink mb-1.5">
								Don't forget to clock in
							</h2>
							<p className="text-sm text-ink-3 leading-relaxed">
								Your time isn't being tracked yet. Start your timer so your work hours are recorded accurately.
							</p>
						</div>

						{/* Live pulse indicator */}
						<div className="flex items-center justify-center gap-2 mb-6">
							<span className="relative flex h-2 w-2">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ink-3/40 opacity-75" />
								<span className="relative inline-flex h-2 w-2 rounded-full bg-ink-3/40" />
							</span>
							<span className="text-xs text-ink-3 font-medium tracking-wide uppercase">
								Timer not running
							</span>
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-2">
							<Button
								className="w-full bg-mint hover:bg-mint/90 text-ink font-semibold h-10"
								isLoading={isPending}
								onClick={() => startTimer()}
							>
								<Clock className="w-4 h-4 mr-2" />
								Start Timer Now
							</Button>
							<button
								onClick={dismiss}
								className="w-full text-xs text-ink-3 hover:text-ink-2 transition-colors py-1.5"
							>
								I'll start it later
							</button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
