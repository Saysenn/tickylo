import { useState, useEffect } from "react";
import { Play, Square, Clock, Check, X } from "lucide-react";
import { startTimer, stopTimer } from "../lib/api";
import type { ActiveTimer } from "../lib/api";
import { Storage } from "../lib/storage";

function formatElapsed(startTime: string) {
  const ms = Date.now() - new Date(startTime).getTime();
  const s  = Math.floor(ms / 1000);
  const h  = Math.floor(s / 3600);
  const m  = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return [h, m, ss].map((n) => String(n).padStart(2, "0")).join(":");
}

export function TimerTab({
  activeTimer,
  setActiveTimer,
}: {
  activeTimer: ActiveTimer | null;
  setActiveTimer: (t: ActiveTimer | null) => void;
}) {
  const [elapsed, setElapsed]     = useState("00:00:00");
  const [title, setTitle]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [stopping, setStopping]   = useState(false);
  const [stopTitle, setStopTitle] = useState("");

  useEffect(() => {
    if (!activeTimer) { setElapsed("00:00:00"); return; }
    const tick = () => setElapsed(formatElapsed(activeTimer.start_time));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTimer]);

  // Pre-fill stop title with current timer title when opening the stop sheet
  function openStopSheet() {
    setStopTitle(activeTimer?.title ?? "");
    setStopping(true);
    setError("");
  }

  async function handleStop() {
    if (!activeTimer) return;
    setLoading(true); setError("");
    try {
      await stopTimer(activeTimer.id, stopTitle.trim() || undefined);
      await Storage.clearSession();
      setActiveTimer(null);
      setStopping(false);
    } catch { setError("Failed to stop. Try again."); }
    finally { setLoading(false); }
  }

  async function handleStart() {
    setLoading(true); setError("");
    try {
      const entry = await startTimer({ title: title.trim() || undefined });
      await Storage.setSession({ entry_id: entry.id, start_time: entry.start_time, title: entry.title });
      setActiveTimer(entry);
      setTitle("");
    } catch { setError("Failed to start. Try again."); }
    finally { setLoading(false); }
  }

  // Stop confirmation sheet
  if (activeTimer && stopping) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col justify-center px-5 gap-4">
          {/* Timer summary */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Elapsed</p>
              <p className="text-xl font-mono font-bold text-ink">{elapsed}</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] text-mint font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
              Recording
            </span>
          </div>

          {/* Title input */}
          <div>
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
              Entry title <span className="normal-case font-normal text-gray-400">(optional)</span>
            </label>
            <input
              autoFocus
              value={stopTitle}
              onChange={(e) => setStopTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStop()}
              placeholder="What did you work on?"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-ink placeholder:text-gray-300 focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint/30"
            />
          </div>

          {error && <p className="text-[10px] text-red-500">{error}</p>}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleStop()}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ink text-white text-xs font-semibold hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              <Check size={13} strokeWidth={2.5} />
              {loading ? "Saving…" : "Save & Stop"}
            </button>
            <button
              onClick={() => setStopping(false)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={12} strokeWidth={2} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active timer view
  if (activeTimer) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 px-6 h-full">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
          </span>
          <span className="text-[10px] font-semibold text-mint uppercase tracking-wider">Recording</span>
        </div>

        <div className="text-center">
          <p className="text-5xl font-mono font-bold text-ink tracking-tight tabular-nums">{elapsed}</p>
          {activeTimer.title && (
            <p className="text-[11px] text-gray-400 mt-2 max-w-[220px] truncate">"{activeTimer.title}"</p>
          )}
        </div>

        <button
          onClick={openStopSheet}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 text-ink text-xs font-semibold hover:bg-gray-50 transition-colors"
        >
          <Square size={12} strokeWidth={0} fill="currentColor" className="text-red-500" />
          Stop Timer
        </button>
      </div>
    );
  }

  // Idle view
  return (
    <div className="flex flex-col gap-3 px-4 py-5 h-full justify-center">
      <div className="text-center mb-1">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
          <Clock size={20} strokeWidth={1.5} className="text-gray-300" />
        </div>
        <p className="text-xs font-semibold text-ink">Timer not running</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Start tracking your work hours</p>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
          What are you working on? <span className="normal-case font-normal">(optional)</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleStart()}
          placeholder="e.g. Fix login bug"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs text-ink placeholder:text-gray-300 focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint/30"
        />
      </div>

      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mint text-ink font-semibold text-xs hover:bg-mint-hover transition-colors disabled:opacity-50"
      >
        <Play size={12} fill="currentColor" strokeWidth={0} />
        {loading ? "Starting…" : "Start Timer"}
      </button>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
