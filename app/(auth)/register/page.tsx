import Link from "next/link";
import { Building2, Users } from "lucide-react";

export const metadata = {
	title: "Get Started",
	description: "Register your company or join your team on Tickworks — the smart platform for task management, time tracking, and employee performance.",
	openGraph: {
		title: "Get Started — Tickworks",
		description: "Register your company or join your team on Tickworks — the smart platform for task management, time tracking, and employee performance.",
	},
	twitter: {
		title: "Get Started — Tickworks",
		description: "Register your company or join your team on Tickworks — the smart platform for task management, time tracking, and employee performance.",
	},
};

export default function RegisterPage() {
	return (
		<main className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden px-4 py-12">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute top-[-12%] right-[-8%] w-[480px] h-[480px] bg-mint/16 rounded-full blur-3xl" />
				<div className="absolute bottom-[-10%] left-[-8%] w-[400px] h-[400px] bg-mint/12 rounded-full blur-3xl" />
			</div>

			<div className="relative z-10 w-full max-w-lg">
				<Link
					href="/login"
					className="inline-flex items-center gap-1.5 mb-8 text-sm text-ink-3 hover:text-ink-2 transition-colors"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to login
				</Link>

				<div className="glass rounded-2xl p-8 space-y-6">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-ink">Get Started</h1>
						<p className="text-ink-3 text-sm mt-1">How are you joining Tickworks?</p>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<Link
							href="/apply"
							className="group relative flex flex-col items-center gap-4 rounded-xl border border-border/60 hover:border-mint/50 bg-accent/30 hover:bg-mint/5 p-6 transition-all text-center"
						>
							<div className="w-12 h-12 rounded-xl bg-mint/15 group-hover:bg-mint/25 flex items-center justify-center transition-colors">
								<Building2 className="w-6 h-6 text-mint" />
							</div>
							<div>
								<p className="font-semibold text-ink text-sm">Register Company</p>
								<p className="text-xs text-ink-3 mt-1 leading-relaxed">
									I&apos;m an admin setting up my team&apos;s workspace
								</p>
							</div>
						</Link>

						<Link
							href="/join"
							className="group relative flex flex-col items-center gap-4 rounded-xl border border-border/60 hover:border-mint/50 bg-accent/30 hover:bg-mint/5 p-6 transition-all text-center"
						>
							<div className="w-12 h-12 rounded-xl bg-info/15 group-hover:bg-info/25 flex items-center justify-center transition-colors">
								<Users className="w-6 h-6 text-info" />
							</div>
							<div>
								<p className="font-semibold text-ink text-sm">Join My Team</p>
								<p className="text-xs text-ink-3 mt-1 leading-relaxed">
									I have a join code from my admin
								</p>
							</div>
						</Link>
					</div>

					<p className="text-center text-xs text-ink-3">
						Already have an account?{" "}
						<Link href="/login" className="text-mint hover:underline font-medium">
							Sign in
						</Link>
					</p>
				</div>
			</div>
		</main>
	);
}
