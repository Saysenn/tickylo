import { Clock } from "lucide-react";

export const metadata = { title: "Time Manager" };

export default function TimeManagerPage() {
	return (
		<div className="max-w-5xl space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-ink">Time Manager</h1>
				<p className="text-ink-3 mt-1 text-sm">
					Manage and track time entries for your team.
				</p>
			</div>

			<div className="flex flex-col items-center justify-center py-24 text-center">
				<div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
					<Clock className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
				</div>
				<h3 className="font-semibold text-ink mb-1">No time entries yet</h3>
				<p className="text-sm text-ink-3 max-w-xs">
					Tasks assigned to you or your team will show up here.
				</p>
			</div>
		</div>
	);
}
