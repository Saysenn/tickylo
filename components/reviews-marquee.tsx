"use client";

import { Star } from "lucide-react";

const reviews = [
	{
		name: "Sarah Mitchell",
		role: "Founder",
		company: "Pixel & Co Agency",
		initials: "SM",
		rating: 5,
		text: "We finally know exactly how many billable hours go into each client. Invoicing used to be a guess — now it's a report. Tickylo paid for itself in week one.",
	},
	{
		name: "James Okafor",
		role: "Dev Studio Director",
		company: "NovaBuild",
		initials: "JO",
		rating: 5,
		text: "Deadline tracking across multiple projects used to be chaos. Now I open one dashboard and know exactly who's behind and why. Our delivery rate is up noticeably.",
	},
	{
		name: "Priya Sharma",
		role: "Agency Operations Lead",
		company: "Brightside Creative",
		initials: "PS",
		rating: 5,
		text: "Our freelancers are spread across time zones. Tickylo gives us one view of output and hours without chasing anyone for updates. Huge time saver.",
	},
	{
		name: "Marcus Webb",
		role: "CEO",
		company: "Loopline Studio",
		initials: "MW",
		rating: 5,
		text: "We replaced three separate tools with Tickylo. Billable hours, task tracking, and team reports all in one place. The team adopted it within a day.",
	},
	{
		name: "Amara Nwosu",
		role: "Marketing Agency Owner",
		company: "Velocity Media",
		initials: "AN",
		rating: 5,
		text: "Client reporting used to take hours every Friday. Now I export a clean report in minutes. The AI insights also helped us spot which retainer clients eating too much time.",
	},
	{
		name: "Liam Fernandez",
		role: "Project Manager",
		company: "Craft Digital",
		initials: "LF",
		rating: 5,
		text: "Our team of 12 freelancers is finally running like a machine. Everyone clocks in, logs tasks, and I get a live dashboard. Zero back-and-forth.",
	},
	{
		name: "Yemi Adeyemi",
		role: "Creative Director",
		company: "Studio Flux",
		initials: "YA",
		rating: 5,
		text: "I was skeptical but the setup really does take minutes. The shift tracking alone has saved us from underbilling by a significant margin every month.",
	},
	{
		name: "Rachel Dunn",
		role: "Operations Partner",
		company: "Halcyon Labs",
		initials: "RD",
		rating: 5,
		text: "The audit logs and approval workflows give us exactly the accountability we needed. Our clients now trust our hour reports completely.",
	},
];

function ReviewCard({ r }: { r: typeof reviews[0] }) {
	return (
		<div className="glass rounded-2xl p-5 shadow-[0_2px_20px_rgba(128,237,153,0.06)]">
			<div className="flex items-center gap-0.5 mb-3">
				{Array.from({ length: r.rating }).map((_, i) => (
					<Star key={i} className="w-3 h-3 fill-warning text-warning" />
				))}
			</div>
			<p className="text-xs text-ink-3 leading-relaxed mb-4">"{r.text}"</p>
			<div className="flex items-center gap-2">
				<div className="w-7 h-7 rounded-full bg-mint/20 flex items-center justify-center text-[10px] font-bold text-ink-2 shrink-0">
					{r.initials}
				</div>
				<div>
					<p className="text-xs font-semibold text-ink">{r.name}</p>
					<p className="text-[11px] text-ink-3">{r.role} · {r.company}</p>
				</div>
			</div>
		</div>
	);
}

const col1 = reviews.slice(0, 4);
const col2 = reviews.slice(4);

export default function ReviewsMarquee() {
	return (
		<div className="relative overflow-hidden" style={{ minHeight: 480 }}>
			{/* Left — title */}
			<div className="relative z-10 max-w-xs">
				<div className="flex items-center gap-2 mb-4">
					{Array.from({ length: 5 }).map((_, i) => (
						<Star key={i} className="w-3.5 h-3.5 fill-warning text-warning" />
					))}
					<span className="text-[11px] font-semibold tracking-widest uppercase text-mint ml-1">
						5.0 · Early Reviews
					</span>
				</div>
				<h2 className="text-3xl font-bold text-ink tracking-tight leading-tight">
					What agencies are already saying
				</h2>
				<p className="text-sm text-ink-3 mt-3 leading-relaxed">
					Hundreds of agency teams trust Tickylo to track every hour and hit every deadline.
				</p>
			</div>

			{/* Diagonal scrolling columns — right side */}
			<div
				className="absolute top-[-20%] right-[-2%] pointer-events-none"
				style={{ width: "58%", height: "140%", overflow: "hidden" }}
			>
				{/* Fade masks */}
				<div className="absolute top-0 left-0 right-0 z-10" style={{ height: 120, background: "linear-gradient(to bottom, hsl(var(--background)), transparent)" }} />
				<div className="absolute bottom-0 left-0 right-0 z-10" style={{ height: 120, background: "linear-gradient(to top, hsl(var(--background)), transparent)" }} />
				<div className="absolute top-0 left-0 bottom-0 z-10" style={{ width: 80, background: "linear-gradient(to right, hsl(var(--background)), transparent)" }} />

				<div
					className="flex gap-3 h-full"
					style={{ transform: "rotate(-14deg) translateX(-6%)", transformOrigin: "top center" }}
				>
					{/* Column 1 */}
					<div style={{ flex: "0 0 240px" }}>
						<div className="animate-marquee-up flex flex-col gap-3">
							{[...col1, ...col1].map((r, i) => <ReviewCard key={i} r={r} />)}
						</div>
					</div>
					{/* Column 2 — offset + slower */}
					<div style={{ flex: "0 0 240px", marginTop: 72 }}>
						<div className="animate-marquee-up-slow flex flex-col gap-3">
							{[...col2, ...col2].map((r, i) => <ReviewCard key={i} r={r} />)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
