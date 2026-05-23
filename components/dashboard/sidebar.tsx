"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Logo } from "@/components/logo";
import {
	LayoutDashboard,
	Users,
	Clock,
	AlarmClock,
	ClipboardList,
	BarChart2,
	FileText,
	Shield,
	Inbox,
	Building2,
	CalendarDays,
	Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/configs/rbac.config";
import APIService from "@/lib/infra/api";
import { usePlan } from "@/providers/org-settings-provider";
import { canAccess, type Feature } from "@/lib/utils/plan-gate";

interface NavItem {
	label: string;
	href: string;
	icon: React.ElementType;
	roles?: Role[];
	hidden?: boolean;
}

interface NavGroup {
	title: string;
	items: NavItem[];
}

interface SidebarProps {
	isOpen?: boolean;
	onClose?: () => void;
	role: Role;
}


export function Sidebar({ isOpen = false, onClose, role }: SidebarProps) {
	const pathname = usePathname();
	const { data: orgSettings } = useQuery({
		queryKey: ["org-settings"],
		queryFn: () => APIService.orgSettings.get(),
		staleTime: 300_000,
	});
	const departmentsEnabled  = orgSettings?.departments_enabled ?? false;
	const performanceEnabled  = orgSettings?.performance_enabled ?? true;
	const invoicesEnabled     = orgSettings?.invoices_enabled ?? true;
	const { plan, is_internal } = usePlan();
	const gate = (feature: Feature) => canAccess(plan, is_internal, feature);

	const navGroups: NavGroup[] = [
		{
			title: "Overview",
			items: [
				{ label: "Dashboard",    href: "/dashboard",             icon: LayoutDashboard },
				{ label: "Team Overview", href: "/dashboard/time-manager", icon: Clock,    roles: ["admin"], hidden: !gate("time_manager") },
				{ label: "Performance",  href: "/dashboard/performance",  icon: BarChart2, roles: ["admin"], hidden: !gate("reports") || !performanceEnabled },
				{ label: "Invoices",     href: "/dashboard/invoices",     icon: FileText,  roles: ["admin"], hidden: !gate("reports") || !invoicesEnabled },
			],
		},
		{
			title: "Management",
			items: [
				{ label: "Employees", href: "/dashboard/employees", icon: Users, roles: ["admin"], hidden: !gate("employees") },
				{ label: "Departments", href: "/dashboard/departments", icon: Building2, roles: ["admin"], hidden: !departmentsEnabled || !gate("departments") },
				{ label: "Clients", href: "/dashboard/clients", icon: Briefcase, roles: ["admin"] },
				{ label: "Requests", href: "/dashboard/ticket-requests", icon: Inbox, roles: ["admin"], hidden: !gate("ticket_requests") },
			],
		},
		{
			title: "Work",
			items: [
				{ label: "Time Tracker", href: "/dashboard/time-tracker", icon: AlarmClock },
				{ label: "Tickets", href: "/dashboard/tickets", icon: ClipboardList },
				{ label: "My Requests", href: "/dashboard/requests", icon: CalendarDays, roles: ["employee", "manager"] },
			],
		},
		{
			title: "Logs",
			items: [
				{ label: "Time Logs", href: "/dashboard/time-logs", icon: Clock, roles: ["admin"], hidden: !gate("audit_logs") },
				{ label: "Ticket Logs", href: "/dashboard/audit-logs", icon: Shield, roles: ["admin"], hidden: !gate("audit_logs") },
			],
		},
	];

	const TOUR_IDS: Record<string, string> = {
		"/dashboard":                  "tour-nav-dashboard",
		"/dashboard/tickets":          "tour-nav-tickets",
		"/dashboard/time-tracker":     "tour-nav-timer",
		"/dashboard/time-manager":     "tour-nav-team-overview",
		"/dashboard/performance":       "tour-nav-reports",
		"/dashboard/employees":        "tour-nav-employees",
		"/dashboard/departments":      "tour-nav-departments",
		"/dashboard/ticket-requests":  "tour-nav-requests",
		"/dashboard/requests":         "tour-nav-my-requests",
		"/dashboard/time-logs":        "tour-nav-time-logs",
		"/dashboard/audit-logs":       "tour-nav-ticket-logs",
		"/dashboard/clients":          "tour-nav-clients",
	};

	const NavLink = ({ label, href, icon: Icon }: NavItem) => {
		const isActive =
			pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
		return (
			<Link
				href={href}
				onClick={onClose}
				id={TOUR_IDS[href]}
				className={cn(
					"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
					isActive
						? "bg-mint/15 text-ink border-l-2 border-mint pl-[10px]"
						: "text-ink-3 hover:bg-mint/8 hover:text-ink-2 border-l-2 border-transparent pl-[10px]",
				)}
			>
				<Icon
					className={cn(
						"w-4 h-4 shrink-0",
						isActive ? "text-ink-2" : "text-ink-3",
					)}
					strokeWidth={isActive ? 2.2 : 1.8}
				/>
				{label}
			</Link>
		);
	};

	const sidebarContent = (
		<>
			{/* Logo */}
			<div className="px-4 py-4 border-b">
				<Logo size="sm" />
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
				{navGroups.map(({ title, items }) => {
					/** get visible items based on user role */
					const visible = items.filter(
						(item: NavItem) => !item.hidden && (!item.roles || item.roles.includes(role)),
					);
					/** if there is no roles defined, means it is visible to all */
					if (visible.length === 0) return null;
					/** If roles are defined, only show items that include the current user's role */
					return (
						<div key={title}>
							<p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-ink-3/60 w-fit">
								{title}
							</p>
							<div className="space-y-0.5">
								{visible.map((item) => (
									<NavLink key={item.href} {...item} />
								))}
							</div>
						</div>
					);
				})}
			</nav>

			{/* Bottom */}
			<div className="px-3 py-3 border-t">
				<div className="px-3 pt-1">
					<p className="text-[11px] text-ink-3/50 font-medium tracking-wide">
						v1.0.0
					</p>
				</div>
			</div>
		</>
	);

	return (
		<>
			{/* Desktop sidebar — always visible */}
			<aside className="w-56 shrink-0 hidden md:flex flex-col glass border-r min-h-screen">
				{sidebarContent}
			</aside>

			{/* Mobile sidebar — slide in overlay */}
			<aside
				className={cn(
					"fixed inset-y-0 left-0 z-50 w-64 flex flex-col glass border-r transition-transform duration-300 ease-in-out md:hidden",
					isOpen ? "translate-x-0" : "-translate-x-full",
				)}
			>
				{sidebarContent}
			</aside>
		</>
	);
}
