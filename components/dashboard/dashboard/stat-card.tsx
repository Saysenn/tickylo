"use client";

import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface StatCardProps {
	label: string;
	value: string | number;
	subtext?: string;
	icon?: LucideIcon;
	href: string;
	featured?: boolean; // first card — dark mint gradient
	liveIndicator?: boolean; // animated green dot
}

export function StatCard({
	label,
	value,
	subtext,
	icon: Icon,
	href,
	featured = false,
	liveIndicator = false,
}: StatCardProps) {
	return (
		<Link
			href={href}
			className={cn(
				"relative flex flex-col justify-between rounded-2xl p-5 transition-all cursor-pointer overflow-hidden",
				featured
					? "border border-mint/30 text-white shadow-[0_0_50px_rgba(128,237,153,0.28)] hover:shadow-[0_0_70px_rgba(128,237,153,0.40)] hover:border-mint/50"
					: "glass hover:shadow-[0_8px_32px_rgba(128,237,153,0.18)] hover:border-mint/40",
			)}
			style={
				featured
					? { background: "linear-gradient(135deg, #1c3a1c 0%, #143018 50%, #0d200d 100%)" }
					: undefined
			}
		>
			{/* Featured card — subtle mint shimmer overlay */}
			{featured && (
				<div
					className="absolute inset-0 pointer-events-none"
					style={{
						background:
							"radial-gradient(ellipse at 80% 20%, rgba(128, 237, 153, 0.15) 0%, transparent 60%)",
					}}
				/>
			)}

			<div className="relative flex items-start justify-between">
				<div className="space-y-1">
					<p
						className={cn(
							"text-sm font-medium",
							featured ? "text-white/60" : "text-ink-3",
						)}
					>
						{label}
					</p>
					<p
						className={cn(
							"text-4xl font-bold tracking-tight",
							featured ? "text-white" : "text-ink",
						)}
					>
						{value}
					</p>
				</div>
				<div
					className={cn(
						"flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
						featured
							? "border-white/15 text-white/50 hover:border-mint/60 hover:text-mint"
							: "border-mint/20 text-ink-3 hover:border-mint/50 hover:text-mint",
					)}
				>
					<ArrowUpRight className="w-4 h-4" />
				</div>
			</div>

			{subtext && (
				<div className="relative mt-4 flex items-center gap-1.5">
					{liveIndicator && (
						<span className="relative flex h-2 w-2">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
							<span className="relative inline-flex rounded-full h-2 w-2 bg-mint" />
						</span>
					)}
					{Icon && !liveIndicator && (
						<Icon
							className={cn(
								"w-3.5 h-3.5",
								featured ? "text-mint/70" : "text-ink-3",
							)}
						/>
					)}
					<p
						className={cn("text-xs", featured ? "text-white/50" : "text-ink-3")}
					>
						{subtext}
					</p>
				</div>
			)}
		</Link>
	);
}
