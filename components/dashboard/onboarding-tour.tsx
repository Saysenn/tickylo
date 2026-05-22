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
			description: "Your home base. KPI cards, team activity, recent tickets, and weekly time summary.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-tickets",
		popover: {
			title: "Tickets",
			description: "Create and manage work items. Assign to team members, set priority, due dates, and track progress.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-timer",
		popover: {
			title: "Time Tracker",
			description: "Log time against tickets. Every entry is linked so you always know where hours went.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-team-overview",
		popover: {
			title: "Team Overview",
			description: "See who's clocked in right now, how many hours each person logged this week, and spot workload imbalances.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-reports",
		popover: {
			title: "Reports",
			description: "Export billable hours and ticket summaries to Excel. Filter by client, date range, and status.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-employees",
		popover: {
			title: "Employees",
			description: "Manage your team — roles, departments, shifts, and permissions.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-departments",
		popover: {
			title: "Departments",
			description: "Group employees into departments. Assign department managers and bulk-assign tickets.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-clients",
		popover: {
			title: "Clients",
			description: "Manage your client list — set hourly rates, currencies, and discounts. Clients can be linked to tickets for accurate billing.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-requests",
		popover: {
			title: "Requests",
			description: "Approve or reject ticket transfer requests, reopen requests, and due-date extensions from your team.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-time-logs",
		popover: {
			title: "Time Logs",
			description: "Full audit trail of all time entries across the team. Edit or delete entries if needed.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-ticket-logs",
		popover: {
			title: "Ticket Logs",
			description: "See every change made to every ticket — who changed what and when.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-header-timer",
		popover: {
			title: "Quick Timer",
			description: "Start or stop your own timer directly from the header without leaving the current page.",
			side: "bottom" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-header-notifications",
		popover: {
			title: "Notifications",
			description: "Get alerted when tickets are assigned, requests need approval, or deadlines are approaching.",
			side: "bottom" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-header-profile",
		popover: {
			title: "Profile Menu",
			description: "Access your profile, settings, and sign out.",
			side: "bottom" as const,
			align: "start" as const,
		},
	},
];

const EMPLOYEE_STEPS = [
	{
		element: "#tour-nav-dashboard",
		popover: {
			title: "Dashboard",
			description: "Your personal view — active tickets, hours logged this week, and recent activity.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-tickets",
		popover: {
			title: "Tickets",
			description: "View and work on tickets assigned to you. Update status and log your progress.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-timer",
		popover: {
			title: "Time Tracker",
			description: "Start a timer when you begin a ticket. Your hours are logged automatically.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-nav-my-requests",
		popover: {
			title: "My Requests",
			description: "Submit leave requests, transfer requests, and view their approval status.",
			side: "right" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-header-timer",
		popover: {
			title: "Quick Timer",
			description: "Start or stop your timer from anywhere in the app.",
			side: "bottom" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-header-notifications",
		popover: {
			title: "Notifications",
			description: "Stay updated on ticket assignments and request approvals.",
			side: "bottom" as const,
			align: "start" as const,
		},
	},
	{
		element: "#tour-header-profile",
		popover: {
			title: "Profile",
			description: "Update your details, timezone, and security settings.",
			side: "bottom" as const,
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
