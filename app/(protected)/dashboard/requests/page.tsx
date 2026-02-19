import { Inbox } from "lucide-react";

export const metadata = { title: "Requests" };

export default function RequestsPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Requests</h1>
        <p className="text-ink-3 mt-1 text-sm">Handle leave requests, approvals, and team submissions.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
          <Inbox className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
        </div>
        <h3 className="font-semibold text-ink mb-1">No requests yet</h3>
        <p className="text-sm text-ink-3 max-w-xs">Leave requests and approvals submitted by your team will appear here.</p>
      </div>
    </div>
  );
}
