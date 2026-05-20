"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	LayoutDashboard,
	ClipboardList,
	Trash2,
	Building2,
	ScrollText,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils/cn";

const NAV_GROUPS = [
	{
		title: "Overview",
		items: [
			{ label: "Dashboard",         href: "/super-admin/dashboard",         icon: LayoutDashboard },
		],
	},
	{
		title: "Review",
		items: [
			{ label: "Applications",      href: "/super-admin/applications",      icon: ClipboardList },
			{ label: "Deletion Requests", href: "/super-admin/deletion-requests", icon: Trash2 },
		],
	},
	{
		title: "Platform",
		items: [
			{ label: "Organizations",     href: "/super-admin/orgs",              icon: Building2 },
			{ label: "Audit Logs",        href: "/super-admin/audit-logs",        icon: ScrollText },
		],
	},
];

export function SuperAdminSidebar() {
	const pathname = usePathname();

	return (
		<aside className="w-56 shrink-0 flex flex-col glass border-r min-h-screen">
			{/* Logo */}
			<div className="px-4 py-4 border-b">
				<Logo size="sm" />
			</div>

			{/* Navigation */}
			<nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
				{NAV_GROUPS.map(({ title, items }) => (
					<div key={title}>
						<p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-ink-3/60">
							{title}
						</p>
						<div className="space-y-0.5">
							{items.map(({ label, href, icon: Icon }) => {
								const active = pathname.startsWith(href);
								return (
									<Link
										key={href}
										href={href}
										className={cn(
											"flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
											active
												? "bg-mint/15 text-ink border-l-2 border-mint pl-[10px]"
												: "text-ink-3 hover:bg-mint/8 hover:text-ink-2 border-l-2 border-transparent pl-[10px]",
										)}
									>
										<Icon
											className={cn("w-4 h-4 shrink-0", active ? "text-ink-2" : "text-ink-3")}
											strokeWidth={active ? 2.2 : 1.8}
										/>
										{label}
									</Link>
								);
							})}
						</div>
					</div>
				))}
			</nav>

			{/* Version */}
			<div className="px-3 py-3 border-t">
				<p className="px-3 pt-1 text-[11px] text-ink-3/50 font-medium tracking-wide">v1.0.0</p>
			</div>
		</aside>
	);
}
