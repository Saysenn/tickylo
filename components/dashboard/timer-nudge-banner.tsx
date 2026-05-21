"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "radix-ui";
import APIService from "@/lib/infra/api";
import { Clock, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TimeEntry } from "@/components/dashboard/time-tracker/types";

const SHOW_AFTER_KEY = "tw_show_after";
const SNOOZE_MS      = 10 * 60 * 1000; // 10 minutes

function getShowAfter(): number | null {
	if (typeof window === "undefined") return null;
	const val = localStorage.getItem(SHOW_AFTER_KEY);
	return val ? Number(val) : null;
}

function shouldShow(hasActiveTimer: boolean): boolean {
	if (hasActiveTimer) return false;
	const showAfter = getShowAfter();
	if (showAfter === null) return true;          // first visit — key never set
	return Date.now() >= showAfter;               // snooze expired
}

export function TimerNudgeBanner() {
	const queryClient = useQueryClient();
	const [visible, setVisible] = useState(false);
	const prevActiveRef = useRef<TimeEntry | null | undefined>(undefined);

	const { data: activeEntry, isLoading } = useQuery<TimeEntry | null>({
		queryKey: ["time", "active"],
		queryFn: () => APIService.time.active(),
		staleTime: 0,
		refetchOnWindowFocus: true,
	});

	// Watch for timer state transitions
	useEffect(() => {
		const prev = prevActiveRef.current;

		if (prev !== undefined) {
			if (prev && !activeEntry) {
				// Timer just ended → start 10-min countdown
				localStorage.setItem(SHOW_AFTER_KEY, String(Date.now() + SNOOZE_MS));
				setVisible(false);
			}
			if (!prev && activeEntry) {
				// Timer just started → remove key, hide
				localStorage.removeItem(SHOW_AFTER_KEY);
				setVisible(false);
			}
		}

		prevActiveRef.current = activeEntry;
	}, [activeEntry]);

	// Evaluate visibility every 60s + on mount + when timer changes
	useEffect(() => {
		if (isLoading) return;

		const check = () => setVisible(shouldShow(!!activeEntry));

		check();
		const id = setInterval(check, 60_000);
		return () => clearInterval(id);
	}, [activeEntry, isLoading]);

	const { mutate: startTimer, isPending } = useMutation({
		mutationFn: () => APIService.time.start(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["time", "active"] });
			queryClient.invalidateQueries({ queryKey: ["dashboard"] });
			localStorage.removeItem(SHOW_AFTER_KEY);
			setVisible(false);
		},
	});

	function snooze() {
		localStorage.setItem(SHOW_AFTER_KEY, String(Date.now() + SNOOZE_MS));
		setVisible(false);
	}

	return (
		<Dialog.Root open={visible}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
				<Dialog.Content
					className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 focus:outline-none"
					onInteractOutside={(e) => e.preventDefault()}
					onEscapeKeyDown={(e) => e.preventDefault()}
				>
					<Dialog.Title className="sr-only">Clock in reminder</Dialog.Title>
					<div className="rounded-2xl border bg-background p-6 shadow-xl">
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
								onClick={snooze}
								className="w-full text-xs text-ink-3 hover:text-ink-2 transition-colors py-1.5"
							>
								Remind me in 10 minutes
							</button>
						</div>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
