import { useState, useEffect } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { getTodaySummary, getWeekSummary, getMyTickets } from "../lib/api";
import type { Me } from "../lib/api";
import { Storage } from "../lib/storage";

const ACTIVE_STATUSES = new Set(["assigned", "in_progress", "on_hold"]);

function formatMs(ms: number) {
  if (!ms || isNaN(ms)) return "0m";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function MeTab({ me, orgName }: { me: Me | null; orgName: string }) {
  const [todayMs, setTodayMs]         = useState<number | null>(null);
  const [weekMs, setWeekMs]           = useState<number | null>(null);
  const [activeTickets, setActiveTickets] = useState<number | null>(null);
  const BASE = import.meta.env.VITE_API_URL ?? "https://tickworks.app";

  useEffect(() => {
    getTodaySummary().then((r) => setTodayMs(r.totalMs)).catch(() => setTodayMs(0));
    getWeekSummary().then((r) => setWeekMs(r.totalMs)).catch(() => setWeekMs(0));
    getMyTickets().then((r) => setActiveTickets(r.data.filter((t) => ACTIVE_STATUSES.has(t.status)).length)).catch(() => setActiveTickets(0));
  }, []);

  const initials = me?.name
    ? me.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {/* Identity */}
      <div className="flex items-center gap-3 pb-1">
        <div className="w-10 h-10 rounded-full bg-mint/20 flex items-center justify-center text-sm font-bold text-ink-2 shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-ink text-xs">{me?.name ?? "Unknown"}</p>
          <p className="text-[10px] text-gray-400 break-all">{me?.email}</p>
          <span className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-mint/15 text-ink-2 capitalize mt-0.5">
            {me?.role}
          </span>
        </div>
      </div>

      {/* Org */}
      <div className="rounded-xl border border-gray-100 px-3 py-2.5">
        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mb-0.5">Organisation</p>
        <p className="text-xs font-bold text-ink leading-snug">{orgName || "—"}</p>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Today" value={todayMs !== null ? formatMs(todayMs) : "—"} />
        <Stat label="This Week" value={weekMs !== null ? formatMs(weekMs) : "—"} />
        <Stat label="Active" value={activeTickets !== null ? `${activeTickets}` : "—"} sub="tickets" />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 mt-1">
        <button
          onClick={() => chrome.tabs.create({ url: `${BASE}/dashboard` })}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-xs font-medium text-ink-2 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink size={12} strokeWidth={2} />
          Open Dashboard
        </button>
        <button
          onClick={async () => {
            await Storage.clearSession();
            chrome.tabs.create({ url: `${BASE}/logout` });
          }}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-100 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut size={12} strokeWidth={2} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 px-2 py-2.5 text-center">
      <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold mb-1">{label}</p>
      <p className="text-sm font-bold text-ink leading-none">{value}</p>
      {sub && <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
