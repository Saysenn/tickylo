import { Suspense } from "react";
import { TimeEntriesTable } from "@/components/dashboard/time-tracker/time-entries-table";

export const metadata = { title: "Time Tracker" };

export default function TimeTrackerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Time Tracker</h1>
        <p className="text-ink-3 mt-1 text-sm">Your completed work sessions.</p>
      </div>

      <Suspense>
        <TimeEntriesTable />
      </Suspense>
    </div>
  );
}
