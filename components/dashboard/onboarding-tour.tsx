"use client";

import { useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/slices/auth-slice";
import APIService from "@/lib/infra/api";

const ADMIN_STEPS = [
	{
		element: "#tour-nav-dashboard",
		popover: {
			title: "Dashboard",
			description: "Your home base. See an overview of active tickets, team activity, and time tracked today.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-tickets",
		popover: {
			title: "Tickets",
			description: "Create and manage work items for your team. Assign tickets, set priorities, due dates, and track progress.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-timer",
		popover: {
			title: "Time Tracker",
			description: "Track time spent on tickets. Every entry is linked to a ticket so you always know where hours went.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-employees",
		popover: {
			title: "Employees",
			description: "Manage your team members, assign roles, set departments, and monitor workload.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-reports",
		popover: {
			title: "Reports",
			description: "Export billable hours, ticket summaries, and client invoices to Excel. No manual tallying.",
			side: "right" as const,
			align: "start" as const,
		},
	},
];

const EMPLOYEE_STEPS = [
	{
		element: "#tour-nav-dashboard",
		popover: {
			title: "Dashboard",
			description: "Your home base. See your active tickets and how much time you've tracked today.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-tickets",
		popover: {
			title: "Tickets",
			description: "View and work on tickets assigned to you. Update status, log progress, and communicate with your team.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-timer",
		popover: {
			title: "Time Tracker",
			description: "Start a timer when you begin working on a ticket. Your time is automatically logged and linked.",
			side: "right" as const,
			align: "start" as const,
		},
	},
];

export function OnboardingTour() {
	const user    = useAppSelector((s) => s.auth.user);
	const dispatch = useAppDispatch();
	const searchParams = useSearchParams();
	const router  = useRouter();

	const markComplete = useCallback(async () => {
		if (!user || user.onboarding_completed) return;
		try {
			await APIService.users.updateMe({ onboarding_completed: true });
			dispatch(setUser({ ...user, onboarding_completed: true }));
		} catch {}
	}, [user, dispatch]);

	const startTour = useCallback(() => {
		if (!user) return;

		const isAdmin = user.role === "admin" || user.role === "manager";
		const steps   = isAdmin ? ADMIN_STEPS : EMPLOYEE_STEPS;

		const driverObj = driver({
			showProgress:    true,
			animate:         true,
			overlayColor:    "#000",
			overlayOpacity:  0.4,
			smoothScroll:    true,
			allowClose:      true,
			progressText:    "{{current}} of {{total}}",
			nextBtnText:     "Next →",
			prevBtnText:     "← Back",
			doneBtnText:     "Done",
			steps,
			onDestroyStarted: () => {
				driverObj.destroy();
				markComplete();
				// Remove ?tour param without full reload
				const url = new URL(window.location.href);
				url.searchParams.delete("tour");
				router.replace(url.pathname + (url.search || ""), { scroll: false });
			},
		});

		driverObj.drive();
	}, [user, markComplete, router]);

	useEffect(() => {
		if (!user) return;

		const forceTour = searchParams.get("tour") === "1";

		if (forceTour || !user.onboarding_completed) {
			// Small delay so the DOM is painted before Driver tries to find elements
			const t = setTimeout(startTour, 600);
			return () => clearTimeout(t);
		}
	}, [user, searchParams, startTour]);

	return null;
}
