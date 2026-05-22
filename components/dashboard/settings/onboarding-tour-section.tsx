"use client";

import { useRouter } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function OnboardingTourSection() {
	const router = useRouter();

	return (
		<div className="glass rounded-2xl p-5">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-xl bg-mint/15 flex items-center justify-center shrink-0">
						<PlayCircle className="w-4 h-4 text-mint" />
					</div>
					<div>
						<p className="text-sm font-semibold text-ink">Onboarding Tour</p>
						<p className="text-xs text-ink-3 mt-0.5">Replay the guided walkthrough of the dashboard.</p>
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push("/dashboard?tour=1")}
				>
					Start Tour
				</Button>
			</div>
		</div>
	);
}
