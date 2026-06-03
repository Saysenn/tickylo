import { Skeleton } from "@/components/ui/skeleton";

export function DetailPageSkeleton() {
	return (
		<div className="w-full space-y-6">
			{/* Back link + breadcrumb */}
			<div className="flex items-center gap-2">
				<Skeleton className="h-4 w-4 rounded" />
				<Skeleton className="h-4 w-20" />
			</div>

			{/* Title + badges */}
			<div className="space-y-3">
				<Skeleton className="h-8 w-3/4" />
				<div className="flex items-center gap-2">
					<Skeleton className="h-6 w-20 rounded-full" />
					<Skeleton className="h-6 w-16 rounded-full" />
					<Skeleton className="h-6 w-24 rounded-full" />
				</div>
			</div>

			{/* Two-column layout */}
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Main content column */}
				<div className="lg:col-span-2 space-y-6">
					{/* Description */}
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-3">
						<Skeleton className="h-5 w-28" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-4/6" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
					</div>

					{/* Subtasks */}
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-3">
						<div className="flex items-center justify-between">
							<Skeleton className="h-5 w-24" />
							<Skeleton className="h-8 w-24 rounded-md" />
						</div>
						{Array.from({ length: 3 }).map((_, i) => (
							<div key={i} className="flex items-center gap-3">
								<Skeleton className="h-4 w-4 rounded" />
								<Skeleton className="h-4 flex-1" style={{ width: `${60 + i * 10}%` }} />
							</div>
						))}
					</div>

					{/* Time entries */}
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-3">
						<Skeleton className="h-5 w-28" />
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex items-center justify-between py-1">
								<div className="flex items-center gap-3">
									<Skeleton className="h-7 w-7 rounded-full" />
									<div className="space-y-1">
										<Skeleton className="h-3.5 w-28" />
										<Skeleton className="h-3 w-20" />
									</div>
								</div>
								<Skeleton className="h-4 w-16" />
							</div>
						))}
					</div>
				</div>

				{/* Sidebar */}
				<div className="space-y-4">
					{/* Status card */}
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-4 space-y-3">
						<Skeleton className="h-4 w-16" />
						<Skeleton className="h-8 w-full rounded-md" />
					</div>

					{/* Details card */}
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-4 space-y-4">
						{Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="space-y-1">
								<Skeleton className="h-3.5 w-20" />
								<Skeleton className="h-5 w-32" />
							</div>
						))}
					</div>

					{/* Actions card */}
					<div className="rounded-xl border border-[#0D1F14]/[0.08] p-4 space-y-2">
						<Skeleton className="h-9 w-full rounded-md" />
						<Skeleton className="h-9 w-full rounded-md" />
						<Skeleton className="h-9 w-full rounded-md" />
					</div>
				</div>
			</div>
		</div>
	);
}
