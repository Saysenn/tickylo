"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

interface Tab {
	key: string;
	label: string;
}

export function SettingsTabNav({ tabs, defaultTab }: { tabs: Tab[]; defaultTab: string }) {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const active = searchParams.get("tab") ?? defaultTab;

	return (
		<div className="flex gap-1 border-b border-border/60 mb-5">
			{tabs.map((tab) => (
				<Link
					key={tab.key}
					href={`${pathname}?tab=${tab.key}`}
					className={cn(
						"px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
						active === tab.key
							? "border-mint text-mint"
							: "border-transparent text-ink-3 hover:text-ink",
					)}
				>
					{tab.label}
				</Link>
			))}
		</div>
	);
}
