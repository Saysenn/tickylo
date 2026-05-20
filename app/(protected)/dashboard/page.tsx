"use client";

import { Suspense } from "react";
import { useAppSelector } from "@/store/hooks";
import { AdminDashboard } from "@/components/dashboard/dashboard/admin-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/dashboard/employee-dashboard";
import { LoginNotices } from "@/components/dashboard/login-notices";
import { UpgradeModal } from "@/components/dashboard/upgrade-modal";

export default function DashboardPage() {
	const user = useAppSelector((s) => s.auth.user);
	const isAdmin = user?.role === "admin";

	return (
		<div className="relative w-full space-y-2">
			{/* Mint mesh gradient — makes glassmorphism cards pop */}
			<div
				className="fixed inset-0 -z-10 pointer-events-none"
				style={{
					background: `
						radial-gradient(ellipse at 12% 8%, rgba(128, 237, 153, 0.22) 0%, transparent 42%),
						radial-gradient(ellipse at 88% 85%, rgba(128, 237, 153, 0.16) 0%, transparent 42%),
						radial-gradient(ellipse at 55% 45%, rgba(196, 245, 210, 0.08) 0%, transparent 55%)
					`,
				}}
			/>

			<div className="mb-6">
				<h1 className="text-2xl font-bold text-ink">Dashboard</h1>
				<p className="text-ink-3 mt-1 text-sm">
					{isAdmin
						? "Team overview, activity, and performance at a glance."
						: "Your tasks, time, and activity at a glance."}
				</p>
			</div>

			<Suspense><UpgradeModal /></Suspense>
			<LoginNotices />

			{isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}
		</div>
	);
}
