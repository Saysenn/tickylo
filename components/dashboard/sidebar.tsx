"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import {
	LayoutDashboard,
	Users,
	Clock,
	AlarmClock,
	ClipboardList,
	BarChart2,
	Shield,
	Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Role } from "@/configs/rbac.config";

interface NavItem {
	label: string;
	href: string;
	icon: React.ElementType;
	roles?: Role[]; // if set, only these roles see this item
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

const navGroups: NavGroup[] = [
	{
		title: "Overview",
		items: [
			{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
			{
				label: "Team Overview",
				href: "/dashboard/time-manager",
				icon: Clock,
				roles: ["admin"],
			},
			{
				label: "Reports",
				href: "/dashboard/performance",
				icon: BarChart2,
				roles: ["admin"],
			},
		],
	},
	{
		title: "Management",
		items: [
			{
				label: "Employees",
				href: "/dashboard/employees",
				icon: Users,
				roles: ["admin"],
			},
			{
				label: "Requests",
				href: "/dashboard/ticket-requests",
				icon: Inbox,
				roles: ["admin"],
			},
		],
	},
	{
		title: "Work",
		items: [
			{
				label: "Time Tracker",
				href: "/dashboard/time-tracker",
				icon: AlarmClock,
			},
			{ label: "Tickets", href: "/dashboard/tickets", icon: ClipboardList },
		],
	},
	{
		title: "Logs",
		items: [
			{
				label: "Time Logs",
				href: "/dashboard/time-logs",
				icon: Clock,
				roles: ["admin"],
			},
			{
				label: "Ticket Logs",
				href: "/dashboard/audit-logs",
				icon: Shield,
				roles: ["admin"],
			},
		],
	},
];

export function Sidebar({ isOpen = false, onClose, role }: SidebarProps) {
	const pathname = usePathname();

	const NavLink = ({ label, href, icon: Icon }: NavItem) => {
		const isActive =
			pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
		return (
			<Link
				href={href}
				onClick={onClose}
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
						(item: NavItem) => !item.roles || item.roles.includes(role),
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
