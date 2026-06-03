import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
	return (
		<div className="w-full space-y-6">
			{/* Greeting */}
			<div className="space-y-2">
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-4 w-80" />
			</div>

			{/* Stat cards row */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-xl border border-[#0D1F14]/[0.08] p-4 space-y-3">
						<div className="flex items-center justify-between">
							<Skeleton className="h-3.5 w-20" />
							<Skeleton className="h-7 w-7 rounded-full" />
						</div>
						<Skeleton className="h-8 w-16" />
						<Skeleton className="h-3 w-24" />
					</div>
				))}
			</div>

			{/* Main content: chart + sidebar */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				{/* Chart area */}
				<div className="lg:col-span-2 rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-4">
					<div className="flex items-center justify-between">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-8 w-24 rounded-md" />
					</div>
					<Skeleton className="h-48 w-full rounded-lg" />
				</div>

				{/* Activity / quick panel */}
				<div className="rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-4">
					<Skeleton className="h-5 w-28" />
					<div className="space-y-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
								<div className="flex-1 space-y-1.5">
									<Skeleton className="h-3.5 w-full" />
									<Skeleton className="h-3 w-2/3" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Second row: two panels */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{Array.from({ length: 2 }).map((_, i) => (
					<div key={i} className="rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-4">
						<Skeleton className="h-5 w-32" />
						<div className="space-y-3">
							{Array.from({ length: 4 }).map((_, j) => (
								<div key={j} className="flex items-center justify-between">
									<Skeleton className="h-4 w-1/2" />
									<Skeleton className="h-4 w-16" />
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
