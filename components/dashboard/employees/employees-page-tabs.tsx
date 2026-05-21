"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { DeactivatedEmployeesTab } from "./deactivated-employees-tab";

const TABS = [
	{ key: "active",      label: "Active" },
	{ key: "deactivated", label: "Deactivated" },
];

export function EmployeesPageTabs({
	activeTab,
	seatCount,
	activeCount,
	children,
}: {
	activeTab: string;
	seatCount: number;
	activeCount: number;
	children: React.ReactNode;
}) {
	const router   = useRouter();
	const pathname = usePathname();

	return (
		<div className="space-y-4">
			<div className="flex gap-1 border-b border-border/60">
				{TABS.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => router.push(`${pathname}?tab=${tab.key}`)}
						className={cn(
							"px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
							activeTab === tab.key
								? "border-mint text-mint"
								: "border-transparent text-ink-3 hover:text-ink",
						)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{activeTab === "active" && children}

			{activeTab === "deactivated" && (
				<DeactivatedEmployeesTab seatCount={seatCount} activeCount={activeCount} />
			)}
		</div>
	);
}
