import { Skeleton } from "@/components/ui/skeleton";

interface TablePageSkeletonProps {
	title?: string;
	rows?: number;
	cols?: number;
	hasFilters?: boolean;
	hasActions?: boolean;
}

export function TablePageSkeleton({
	rows = 8,
	cols = 5,
	hasFilters = true,
	hasActions = true,
}: TablePageSkeletonProps) {
	return (
		<div className="w-full space-y-6">
			{/* Page header */}
			<div className="flex items-start justify-between">
				<div className="space-y-2">
					<Skeleton className="h-7 w-40" />
					<Skeleton className="h-4 w-64" />
				</div>
				{hasActions && <Skeleton className="h-9 w-28 rounded-md" />}
			</div>

			{/* Filters / search bar */}
			{hasFilters && (
				<div className="flex gap-2">
					<Skeleton className="h-9 w-56 rounded-md" />
					<Skeleton className="h-9 w-28 rounded-md" />
					<Skeleton className="h-9 w-28 rounded-md" />
					<Skeleton className="h-9 w-28 rounded-md" />
				</div>
			)}

			{/* Table */}
			<div className="overflow-hidden rounded-lg border border-[#0D1F14]/[0.08]">
				{/* Header row */}
				<div className="flex items-center gap-4 border-b border-[#0D1F14]/[0.08] bg-[#0D1F14]/[0.03] px-4 py-3">
					{Array.from({ length: cols }).map((_, i) => (
						<Skeleton
							key={i}
							className="h-3.5"
							style={{ width: i === 1 ? "30%" : `${Math.floor(60 / (cols - 1))}%` }}
						/>
					))}
				</div>

				{/* Data rows */}
				{Array.from({ length: rows }).map((_, r) => (
					<div
						key={r}
						className="flex items-center gap-4 border-b border-[#0D1F14]/[0.05] px-4 py-3.5 last:border-0"
					>
						{Array.from({ length: cols }).map((_, i) => (
							<Skeleton
								key={i}
								className="h-4"
								style={{
									width: i === 1
										? `${30 + ((r * cols + i) % 5) * 4}%`
										: `${Math.floor(60 / (cols - 1))}%`,
									opacity: i === 0 ? 0.5 : 1,
								}}
							/>
						))}
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-4 w-32" />
				<div className="flex gap-2">
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
					<Skeleton className="h-8 w-8 rounded-md" />
				</div>
			</div>
		</div>
	);
}
