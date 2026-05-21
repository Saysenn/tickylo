"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, LogOut } from "lucide-react";

export function SuperAdminTopbar({ email }: { email: string }) {
	const router = useRouter();

	async function handleSignOut() {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<header className="h-12 border-b border-border/60 bg-background/95 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
			<div className="flex items-center gap-2 border border-destructive/20 bg-destructive/8 rounded-lg px-2.5 py-1">
				<Shield className="w-3 h-3 text-destructive" />
				<span className="text-[11px] font-semibold text-destructive tracking-wide">Super Admin</span>
			</div>

			<div className="flex items-center gap-4">
				<span className="text-xs text-ink-3">{email}</span>
				<button
					type="button"
					onClick={handleSignOut}
					className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-destructive transition-colors"
				>
					<LogOut className="w-3.5 h-3.5" />
					Sign out
				</button>
			</div>
		</header>
	);
}
