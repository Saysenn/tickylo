"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatInitials, formatDuration } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import { UserRound, TicketCheck, Timer } from "lucide-react";

interface ClockedInUser {
	id: string;
	name: string | null;
	email: string;
	start_time: string;
	active_task_title: string | null;
	entry_title: string | null;
}

interface TeamActivityWidgetProps {
	users: ClockedInUser[];
}

function ElapsedTimer({ startTime }: { startTime: string }) {
	const [elapsed, setElapsed] = useState("00:00:00");

	useEffect(() => {
		const tick = () => {
			const ms = Date.now() - new Date(startTime).getTime();
			setElapsed(formatDuration(ms));
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [startTime]);

	return (
		<span className="text-xs font-mono tabular-nums text-mint">{elapsed}</span>
	);
}

export function TeamActivityWidget({ users }: TeamActivityWidgetProps) {
	return (
		<div className="glass rounded-2xl p-5 flex flex-col h-full hover:shadow-[0_8px_32px_rgba(128,237,153,0.15)] transition-shadow">
			<div className="flex items-center justify-between mb-4">
				<p className="text-xs font-semibold text-ink-3 uppercase tracking-wider">
					Team Activity
				</p>
				<span className="text-xs text-ink-3 bg-mint/10 border border-mint/20 px-2 py-0.5 rounded-full">
					{users.length} clocked in
				</span>
			</div>

			{users.length === 0 ? (
				<div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
					<UserRound className="w-8 h-8 text-ink-3/40 mb-2" strokeWidth={1.5} />
					<p className="text-sm text-ink-3">No one is clocked in right now.</p>
				</div>
			) : (
				<ul className="space-y-3">
					{users.map((u) => {
						const initials = formatInitials(u.name, u.email);
						const displayName = u.name ?? u.email;
						const colors = [
							"bg-mint",
							"bg-green-600",
							"bg-green-700",
							"bg-green-800",
							"bg-emerald-600",
						];
						const colorIdx = u.id.charCodeAt(0) % colors.length;

						return (
							<li key={u.id} className="flex items-center gap-3">
								{/* Avatar with ring glow */}
								<div
									className={cn(
										"w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ring-2 ring-mint/25 ring-offset-1 ring-offset-transparent",
										colors[colorIdx],
									)}
								>
									{initials}
								</div>

								{/* Info */}
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-ink truncate">
										{displayName}
									</p>
									{u.active_task_title ? (
										<p className="text-xs text-ink-3 truncate flex items-center gap-1">
											<TicketCheck className="w-3 h-3 shrink-0 text-mint" />
											<span className="font-medium text-ink-2 truncate">{u.active_task_title}</span>
										</p>
									) : u.entry_title ? (
										<p className="text-xs text-ink-3 truncate flex items-center gap-1">
											<Timer className="w-3 h-3 shrink-0 text-ink-3" />
											<span className="truncate">{u.entry_title}</span>
										</p>
									) : (
										<p className="text-xs text-ink-3 flex items-center gap-1">
											<Timer className="w-3 h-3 shrink-0 text-ink-3" />
											General timer
										</p>
									)}
								</div>

								{/* Live timer */}
								<div className="flex items-center gap-1.5 shrink-0">
									<span className="relative flex h-1.5 w-1.5">
										<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
										<span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-mint" />
									</span>
									<ElapsedTimer startTime={u.start_time} />
								</div>
							</li>
						);
					})}
				</ul>
			)}

			<Link
				href="/dashboard/employees"
				className="mt-4 text-xs text-ink-3 hover:text-mint transition-colors text-center"
			>
				View all employees →
			</Link>
		</div>
	);
}
