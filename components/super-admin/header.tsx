"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils/cn";

const NAV = [
	{ label: "Dashboard",    href: "/super-admin/dashboard" },
	{ label: "Applications", href: "/super-admin/applications" },
	{ label: "Organizations", href: "/super-admin/orgs" },
	{ label: "Audit Logs",   href: "/super-admin/audit-logs" },
];

export default function SuperAdminHeader({ email }: { email: string }) {
	const router   = useRouter();
	const pathname = usePathname();

	async function handleSignOut() {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<header className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
			<div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-3">
						<Logo size="sm" />
						<div className="flex items-center gap-1.5 border border-red-500/20 bg-red-500/10 rounded px-2 py-0.5">
							<Shield className="w-3 h-3 text-red-500" />
							<span className="text-[11px] font-medium text-red-600">Super Admin</span>
						</div>
					</div>
					<nav className="flex items-center gap-1">
						{NAV.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									"px-3 py-1.5 rounded text-xs font-medium transition-colors",
									pathname.startsWith(item.href)
										? "bg-accent text-ink"
										: "text-ink-3 hover:text-ink hover:bg-accent/60",
								)}
							>
								{item.label}
							</Link>
						))}
					</nav>
				</div>
				<div className="flex items-center gap-4">
					<span className="text-xs text-ink-3">{email}</span>
					<button
						type="button"
						onClick={handleSignOut}
						className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-red-500 transition-colors"
					>
						<LogOut className="w-3.5 h-3.5" />
						Sign out
					</button>
				</div>
			</div>
		</header>
	);
}
