"use client";

import { X } from "lucide-react";
import { formatDate, formatTime, formatDurationMs } from "@/lib/utils/format";
import type { TimeEntry } from "./types";

interface Props {
	entry: TimeEntry;
	onClose: () => void;
}

export function SessionDetailModal({ entry, onClose }: Props) {
	const durationMs = entry.end_time
		? new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()
		: null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="bg-background rounded-xl border shadow-xl p-6 w-full max-w-sm space-y-4"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3">
					<p className="text-sm font-semibold text-ink leading-snug">
						{entry.title ?? <span className="italic font-normal text-ink-3">No title</span>}
					</p>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded text-ink-3 hover:bg-accent shrink-0"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="space-y-2 text-xs text-ink-3">
					<div className="flex justify-between">
						<span>Date</span>
						<span className="text-ink font-medium">{formatDate(entry.start_time)}</span>
					</div>
					<div className="flex justify-between">
						<span>Time in</span>
						<span className="text-ink font-medium">{formatTime(entry.start_time)}</span>
					</div>
					<div className="flex justify-between">
						<span>Time out</span>
						<span className="text-ink font-medium">
							{entry.end_time ? formatTime(entry.end_time) : "—"}
						</span>
					</div>
					{durationMs !== null && (
						<div className="flex justify-between">
							<span>Duration</span>
							<span className="text-ink font-semibold">{formatDurationMs(durationMs)}</span>
						</div>
					)}
				</div>

				{entry.description && (
					<div className="border-t pt-3">
						<p className="text-xs font-medium text-ink-3 mb-1">Notes</p>
						<p className="text-xs text-ink whitespace-pre-wrap">{entry.description}</p>
					</div>
				)}
			</div>
		</div>
	);
}
