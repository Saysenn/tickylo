import { Skeleton } from "@/components/ui/skeleton";

export function EmployeeDetailSkeleton() {
	return (
		<div className="w-full space-y-6">
			{/* Back */}
			<div className="flex items-center gap-2">
				<Skeleton className="h-4 w-4 rounded" />
				<Skeleton className="h-4 w-24" />
			</div>

			{/* Profile header */}
			<div className="flex items-center gap-4">
				<Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
				<div className="space-y-2">
					<Skeleton className="h-7 w-44" />
					<div className="flex items-center gap-2">
						<Skeleton className="h-5 w-16 rounded-full" />
						<Skeleton className="h-5 w-24 rounded-full" />
					</div>
				</div>
			</div>

			{/* Stat cards */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-xl border border-[#0D1F14]/[0.08] p-4 space-y-2">
						<Skeleton className="h-3.5 w-20" />
						<Skeleton className="h-7 w-12" />
					</div>
				))}
			</div>

			{/* Two columns */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Details */}
				<div className="lg:col-span-2 space-y-5">
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-4">
						<Skeleton className="h-5 w-24" />
						<div className="grid grid-cols-2 gap-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<div key={i} className="space-y-1.5">
									<Skeleton className="h-3.5 w-20" />
									<Skeleton className="h-5 w-32" />
								</div>
							))}
						</div>
					</div>

					{/* Recent tasks */}
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-3">
						<Skeleton className="h-5 w-28" />
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="flex items-center justify-between py-1 border-b border-[#0D1F14]/[0.05] last:border-0">
								<div className="space-y-1">
									<Skeleton className="h-4 w-48" />
									<Skeleton className="h-3 w-24" />
								</div>
								<Skeleton className="h-6 w-20 rounded-full" />
							</div>
						))}
					</div>
				</div>

				{/* Sidebar */}
				<div className="space-y-4">
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-4 space-y-3">
						<Skeleton className="h-5 w-24" />
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="space-y-1">
								<Skeleton className="h-3.5 w-16" />
								<Skeleton className="h-4 w-28" />
							</div>
						))}
					</div>
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-4 space-y-3">
						<Skeleton className="h-5 w-20" />
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex items-center justify-between">
								<Skeleton className="h-3.5 w-20" />
								<Skeleton className="h-4 w-12" />
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
