import { useEffect, useState } from "react";
import { Clock, Ticket, ScrollText, User, type LucideIcon } from "lucide-react";
import { getActiveTimer, getOrgSettings, getMe } from "../lib/api";
import type { ActiveTimer, Me } from "../lib/api";
import { Storage } from "../lib/storage";
import { TimerTab } from "../tabs/TimerTab";
import { TicketsTab } from "../tabs/TicketsTab";
import { LogsTab } from "../tabs/LogsTab";
import { MeTab } from "../tabs/MeTab";

type Screen = "loading" | "not_logged_in" | "billing_locked" | "not_enabled" | "app";

const ACTIVE_PLANS = new Set(["trial", "business", "enterprise"]);
type Tab = "timer" | "tickets" | "logs" | "me";

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: "timer",   label: "Timer",   Icon: Clock },
  { key: "tickets", label: "Tickets", Icon: Ticket },
  { key: "logs",    label: "Logs",    Icon: ScrollText },
  { key: "me",      label: "Me",      Icon: User },
];

export function App() {
  const [screen, setScreen]           = useState<Screen>("loading");
  const [tab, setTab]                 = useState<Tab>("timer");
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [me, setMe]                   = useState<Me | null>(null);
  const [orgName, setOrgName]         = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [timer, settings, user] = await Promise.all([
          getActiveTimer(),
          getOrgSettings(),
          getMe(),
        ]);
        if (!settings.is_internal && !ACTIVE_PLANS.has(settings.plan)) { setScreen("billing_locked"); return; }
        if (!settings.extension_enabled) { setScreen("not_enabled"); return; }
        setActiveTimer(timer);
        setMe(user);
        setOrgName(settings.name);
        if (timer) {
          await Storage.setSession({ entry_id: timer.id, start_time: timer.start_time, title: timer.title });
        } else {
          await Storage.clearSession();
        }
        setScreen("app");
      } catch (err: any) {
        if (err?.status === 401) { setScreen("not_logged_in"); return; }
        setScreen("not_logged_in");
      }
    }
    init();
  }, []);

  if (screen === "loading")        return <LoadingScreen />;
  if (screen === "not_logged_in")  return <NotLoggedIn />;
  if (screen === "billing_locked") return <BillingLocked orgName={orgName} />;
  if (screen === "not_enabled")    return <NotEnabled orgName={orgName} />;

  return (
    <div className="flex flex-col bg-white h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-mint flex items-center justify-center">
            <span className="text-ink font-bold text-[10px]">T</span>
          </div>
          <span className="font-semibold text-xs text-ink tracking-wide">Tickylo</span>
        </div>
        {activeTimer && (
          <span className="flex items-center gap-1 text-[10px] text-mint font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
            Recording
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "timer"   && <TimerTab activeTimer={activeTimer} setActiveTimer={setActiveTimer} userId={me?.id ?? ""} />}
        {tab === "tickets" && <TicketsTab activeTimer={activeTimer} setActiveTimer={setActiveTimer} isAdmin={me?.role === "admin"} userId={me?.id ?? ""} />}
        {tab === "logs"    && <LogsTab activeTimer={activeTimer} isAdmin={me?.role === "admin"} />}
        {tab === "me"      && <MeTab me={me} orgName={orgName} />}
      </div>

      {/* Bottom tabs */}
      <div className="flex border-t border-gray-100">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
              tab === key ? "text-mint" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Icon size={16} strokeWidth={tab === key ? 2.5 : 1.8} />
            <span className="text-[9px] font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center bg-white h-full">
      <div className="w-5 h-5 border-2 border-mint border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function NotLoggedIn() {
  const BASE = import.meta.env.VITE_API_URL ?? "https://tickylo.app";
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 gap-4 bg-white h-full">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        <Clock size={22} strokeWidth={1.5} className="text-gray-400" />
      </div>
      <div>
        <p className="font-bold text-ink text-sm mb-1">You're not logged in</p>
        <p className="text-xs text-gray-400 leading-relaxed">Sign in to your Tickylo dashboard first, then reopen this extension.</p>
      </div>
      <button
        onClick={() => chrome.tabs.create({ url: `${BASE}/login` })}
        className="w-full py-2.5 rounded-xl bg-mint text-ink text-xs font-semibold hover:bg-mint-hover transition-colors"
      >
        Open Tickylo
      </button>
    </div>
  );
}

function NotEnabled({ orgName }: { orgName: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 gap-4 bg-white h-full">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        <User size={22} strokeWidth={1.5} className="text-gray-400" />
      </div>
      <div>
        <p className="font-bold text-ink text-sm mb-1">Extension not enabled</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          {orgName ? `${orgName} hasn't` : "Your admin hasn't"} enabled the browser extension. Contact your admin to turn it on in Organisation Settings.
        </p>
      </div>
    </div>
  );
}

function BillingLocked({ orgName }: { orgName: string }) {
  const BASE = import.meta.env.VITE_API_URL ?? "https://tickylo.app";
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 gap-4 bg-white h-full">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center">
        <Clock size={22} strokeWidth={1.5} className="text-gray-400" />
      </div>
      <div>
        <p className="font-bold text-ink text-sm mb-1">Workspace not active</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          {orgName ? `${orgName}'s` : "Your"} workspace doesn't have an active plan. Ask your admin to complete billing setup.
        </p>
      </div>
      <button
        onClick={() => chrome.tabs.create({ url: `${BASE}/billing` })}
        className="w-full py-2.5 rounded-xl bg-mint text-ink text-xs font-semibold hover:bg-mint-hover transition-colors"
      >
        Go to Billing
      </button>
    </div>
  );
}
