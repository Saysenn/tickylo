import { Skeleton } from "@/components/ui/skeleton";

export function SettingsPageSkeleton() {
	return (
		<div className="w-full space-y-6">
			{/* Page label */}
			<Skeleton className="h-3 w-16" />

			{/* Tab nav */}
			<div className="flex gap-1 border-b border-[#0D1F14]/[0.08] pb-0">
				{Array.from({ length: 3 }).map((_, i) => (
					<Skeleton key={i} className="h-9 w-24 rounded-t-md rounded-b-none" />
				))}
			</div>

			{/* Form sections */}
			<div className="space-y-8 max-w-2xl">
				{Array.from({ length: 3 }).map((_, section) => (
					<div key={section} className="space-y-4">
						<div className="space-y-1">
							<Skeleton className="h-5 w-36" />
							<Skeleton className="h-3.5 w-64" />
						</div>
						<div className="rounded-xl border border-[#0D1F14]/[0.08] p-5 space-y-5">
							{Array.from({ length: 3 }).map((_, field) => (
								<div key={field} className="space-y-1.5">
									<Skeleton className="h-3.5 w-24" />
									<Skeleton className="h-10 w-full rounded-md" />
								</div>
							))}
						</div>
					</div>
				))}

				{/* Save button */}
				<Skeleton className="h-10 w-28 rounded-md" />
			</div>
		</div>
	);
}
