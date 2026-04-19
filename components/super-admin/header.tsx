"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Shield, LogOut } from "lucide-react";

export default function SuperAdminHeader({ email }: { email: string }) {
	const router = useRouter();

	async function handleSignOut() {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.push("/login");
	}

	return (
		<header className="border-b border-border/60 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
			<div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="w-7 h-7 rounded-lg bg-red-500/15 flex items-center justify-center">
						<Shield className="w-4 h-4 text-red-500" />
					</div>
					<span className="text-sm font-semibold text-ink">PerformAI Admin</span>
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
