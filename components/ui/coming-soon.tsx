import { Rocket } from "lucide-react";

export function ComingSoon({ feature }: { feature: string }) {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
			<div className="w-16 h-16 rounded-2xl bg-mint/10 flex items-center justify-center">
				<Rocket className="w-8 h-8 text-mint/60" />
			</div>
			<div>
				<h2 className="text-xl font-semibold text-ink">{feature}</h2>
				<p className="text-sm text-ink-3 mt-1 max-w-xs">
					This feature is coming soon. We&apos;re focused on delivering the best ticket and time tracking experience first.
				</p>
			</div>
			<span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint/10 text-mint text-xs font-medium">
				Coming Soon
			</span>
		</div>
	);
}
