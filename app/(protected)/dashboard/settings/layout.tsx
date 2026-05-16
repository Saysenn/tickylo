"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, SlidersHorizontal, Building2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useAppSelector } from "@/store/hooks";
import { ROLES } from "@/configs/rbac.config";

interface NavItem {
	label: string;
	href: string;
	icon: React.ElementType;
}

const accountItems: NavItem[] = [
	{ label: "Profile",      href: "/dashboard/settings/profile",      icon: User },
	{ label: "Preferences",  href: "/dashboard/settings/preferences",  icon: SlidersHorizontal },
];

const orgItems: NavItem[] = [
	{ label: "Organization",  href: "/dashboard/settings/organization",  icon: Building2 },
	{ label: "Subscription",  href: "/dashboard/settings/subscription",  icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const role = useAppSelector((s) => s.auth.user?.role);
	const isAdmin = role === ROLES.ADMIN;

	const NavLink = ({ href, label, icon: Icon }: NavItem) => {
		const active = pathname === href || pathname.startsWith(href + "/");
		return (
			<Link
				href={href}
				className={cn(
					"flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
					active
						? "bg-mint/15 text-ink font-medium border-l-2 border-mint pl-[10px]"
						: "text-ink-3 hover:bg-accent/60 hover:text-ink border-l-2 border-transparent pl-[10px]",
				)}
			>
				<Icon className={cn("w-4 h-4 shrink-0", active ? "text-mint" : "text-ink-3")} strokeWidth={active ? 2.2 : 1.8} />
				{label}
			</Link>
		);
	};

	return (
		<div className="flex gap-8 min-h-full">
			{/* Settings sub-nav */}
			<aside className="w-44 shrink-0">
				<div className="sticky top-6 space-y-5">
					<div>
						<p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-ink-3/60">Account</p>
						<div className="space-y-0.5">
							{accountItems.map((item) => <NavLink key={item.href} {...item} />)}
						</div>
					</div>

					{isAdmin && (
						<div>
							<p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-ink-3/60">Workspace</p>
							<div className="space-y-0.5">
								{orgItems.map((item) => <NavLink key={item.href} {...item} />)}
							</div>
						</div>
					)}
				</div>
			</aside>

			{/* Content */}
			<div className="flex-1 min-w-0">
				{children}
			</div>
		</div>
	);
}
