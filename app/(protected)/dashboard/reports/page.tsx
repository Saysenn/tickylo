import { BarChart2 } from "lucide-react";

export const metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Reports</h1>
        <p className="text-ink-3 mt-1 text-sm">AI-powered insights and analytics across your organization.</p>
      </div>

      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-2xl bg-mint/15 flex items-center justify-center mb-4">
          <BarChart2 className="w-6 h-6 text-ink-2" strokeWidth={1.8} />
        </div>
        <h3 className="font-semibold text-ink mb-1">No data yet</h3>
        <p className="text-sm text-ink-3 max-w-xs">Reports and analytics will generate once your team data is in place.</p>
      </div>
    </div>
  );
}
