export function Sk({ className = "" }: { className?: string }) {
	return (
		<div className={`animate-pulse rounded-md bg-[#0D1F14]/[0.07] ${className}`} />
	);
}

export function TicketRowSkeleton() {
	return (
		<div className="px-4 py-3 border-b border-gray-100 last:border-0 space-y-2">
			<div className="flex items-center justify-between">
				<Sk className="h-3.5 w-2/3" />
				<Sk className="h-5 w-14 rounded-full" />
			</div>
			<div className="flex items-center gap-2">
				<Sk className="h-3 w-16 rounded-full" />
				<Sk className="h-3 w-20" />
			</div>
		</div>
	);
}

export function LogRowSkeleton() {
	return (
		<div className="px-4 py-3 border-b border-gray-100 last:border-0 space-y-1.5">
			<div className="flex items-center justify-between">
				<Sk className="h-3.5 w-1/2" />
				<div className="flex gap-1.5">
					<Sk className="h-5 w-5 rounded-md" />
					<Sk className="h-5 w-5 rounded-md" />
				</div>
			</div>
			<Sk className="h-3 w-1/3" />
		</div>
	);
}

export function StatCardSkeleton() {
	return (
		<div className="rounded-xl border border-gray-100 px-3 py-2.5 space-y-1.5">
			<Sk className="h-2.5 w-10 mx-auto" />
			<Sk className="h-5 w-12 mx-auto" />
			<Sk className="h-2.5 w-8 mx-auto" />
		</div>
	);
}
