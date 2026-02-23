"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import APIService from "@/lib/infra/api";
import { Pagination } from "@/components/ui/pagination";
import { formatDate, formatTime } from "@/lib/utils/format";
import type { TimeEntry, TimeEntryPage } from "./types";

const PAGE_SIZE = 10;

function formatDuration(start: string, end: string): string {
	const ms = new Date(end).getTime() - new Date(start).getTime();
	const totalSeconds = Math.floor(ms / 1000);
	const h = Math.floor(totalSeconds / 3600);
	const m = Math.floor((totalSeconds % 3600) / 60);
	const s = totalSeconds % 60;
	if (h > 0) return `${h}h ${m}m`;
	if (m > 0) return `${m}m ${s}s`;
	return `${s}s`;
}

export function TimeEntriesTable() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

	const goToPage = (p: number) => router.push(`?page=${p}`);

	const {
		data: result,
		isLoading,
		isError,
	} = useQuery<TimeEntryPage>({
		queryKey: ["time", page],
		queryFn: () => APIService.time.list(page, PAGE_SIZE),
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<div className="w-5 h-5 border-2 border-mint/40 border-t-mint rounded-full animate-spin" />
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center justify-center py-24">
				<p className="text-sm text-ink-3">
					Failed to load entries. Please try again.
				</p>
			</div>
		);
	}

	const list = result?.data ?? [];
	const totalPages = result?.totalPages ?? 1;

	if (list.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center border rounded-lg">
				<div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
					<Clock className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
				</div>
				<h3 className="font-semibold text-ink mb-1">No time entries yet</h3>
				<p className="text-sm text-ink-3 max-w-xs">
					Use the Time In button in the header to start tracking your work.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div key={page} className="animate-fade-in space-y-4">
				<div className="rounded-lg border overflow-x-auto">
					<table className="w-full min-w-[560px] text-sm">
						<thead>
							<tr className="border-b bg-accent/30">
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									Date
								</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									Task
								</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
									Time In
								</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider hidden sm:table-cell">
									Time Out
								</th>
								<th className="text-left px-4 py-2 text-xs font-semibold text-ink-3 uppercase tracking-wider">
									Duration
								</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{list.map((entry: TimeEntry) => (
								<tr
									key={entry.id}
									className="hover:bg-accent/20 transition-colors"
								>
									<td className="px-4 py-2 text-ink-3 whitespace-nowrap">
										{formatDate(entry.start_time)}
									</td>
									<td className="px-4 py-2">
										<p className="font-medium text-ink truncate max-w-[160px]">
											{entry.title ?? (
												<span className="text-ink-3 font-normal italic">
													No title
												</span>
											)}
										</p>
										{entry.description && (
											<p className="text-xs text-ink-3 truncate max-w-[160px]">
												{entry.description}
											</p>
										)}
									</td>
									<td className="px-4 py-2 text-ink-3 hidden sm:table-cell whitespace-nowrap">
										{formatTime(entry.start_time)}
									</td>
									<td className="px-4 py-2 text-ink-3 hidden sm:table-cell whitespace-nowrap">
										{entry.end_time ? formatTime(entry.end_time) : "—"}
									</td>
									<td className="px-4 py-2 font-medium text-ink whitespace-nowrap">
										{entry.end_time
											? formatDuration(entry.start_time, entry.end_time)
											: "—"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<Pagination
					page={page}
					totalPages={totalPages}
					onPrev={() => goToPage(Math.max(1, page - 1))}
					onNext={() => goToPage(Math.min(totalPages, page + 1))}
					onGoTo={goToPage}
				/>
			</div>
		</div>
	);
}
