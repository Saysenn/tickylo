import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function Header() {
	const supabase = await createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<nav className="glass-header sticky top-0 z-50 backdrop-blur-sm">
			<div className="max-w-5xl mx-auto px-4 py-3.5 flex justify-between items-center">
				<div className="flex items-center gap-2.5">
					<div className="w-8 h-8 bg-mint rounded-xl flex items-center justify-center shadow-[0_2px_10px_rgba(128,237,153,0.30)]">
						<TrendingUp className="w-4 h-4 text-ink" strokeWidth={2.5} />
					</div>
					<span className="font-semibold text-ink text-sm tracking-tight">
						PerformAI
					</span>
				</div>

				<div className="flex items-center gap-2">
					{user ? (
						<Button
							asChild
							className="bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_2px_12px_rgba(128,237,153,0.30)]"
						>
							<Link href="/dashboard">Dashboard</Link>
						</Button>
					) : (
						<>
							<Button
								asChild
								variant="ghost"
								className="text-ink-2 hover:bg-mint/10 hover:text-ink"
							>
								<Link href="/login">Sign in</Link>
							</Button>
							<Button
								asChild
								className="bg-mint hover:bg-mint-hover text-ink font-semibold shadow-[0_2px_12px_rgba(128,237,153,0.30)]"
							>
								<Link href="/register">Get Started</Link>
							</Button>
						</>
					)}
				</div>
			</div>
		</nav>
	);
}
