import { useState, useEffect } from "react";
import { Trash2, Pencil, Check, X, Clock } from "lucide-react";
import { getTimeEntries, updateTimeEntry, deleteTimeEntry } from "../lib/api";
import type { TimeEntry, ActiveTimer } from "../lib/api";
import { LogRowSkeleton } from "../components/skeleton";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string | null) {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function LogsTab({ activeTimer, isAdmin }: { activeTimer: ActiveTimer | null; isAdmin: boolean }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      const res = await getTimeEntries();
      setEntries(res.data);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(id: string) {
    try {
      await updateTimeEntry(id, { title: editTitle.trim() || undefined });
      setEditingId(null);
      load();
    } catch {}
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTimeEntry(id);
      load();
    } catch {
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="px-4 pt-3 pb-1">
          <div className="h-2.5 w-24 rounded-md bg-[#0D1F14]/[0.07] animate-pulse" />
        </div>
        <div className="divide-y divide-gray-50">
          {Array.from({ length: 4 }).map((_, i) => <LogRowSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center px-4">
        <Clock size={28} strokeWidth={1.5} className="text-gray-300 mb-2" />
        <p className="text-xs text-gray-400">No time entries today</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-3 pb-1">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Today's Entries</p>
      </div>
      <div className="divide-y divide-gray-50">
        {entries.map((entry) => {
          const isActive = activeTimer?.id === entry.id;
          const isEditing = editingId === entry.id;

          return (
            <div key={entry.id} className="px-4 py-2.5">
              {isEditing ? (
                <div className="flex items-center gap-1.5">
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(entry.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 px-2 py-1 text-xs border border-mint rounded-lg focus:outline-none"
                  />
                  <button onClick={() => handleSave(entry.id)} className="text-mint hover:text-mint-hover">
                    <Check size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse shrink-0" />
                      )}
                      <p className="text-xs font-medium text-ink truncate">
                        {entry.title || <span className="text-gray-400 italic">No title</span>}
                      </p>
                    </div>
                    <p className="text-[10px] text-gray-400">
                      {formatTime(entry.start_time)} – {entry.end_time ? formatTime(entry.end_time) : "now"}
                      <span className="mx-1">·</span>
                      <span className="font-medium text-ink-2">{formatDuration(entry.start_time, entry.end_time)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingId(entry.id); setEditTitle(entry.title ?? ""); }}
                      className="p-1 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deletingId === entry.id || isActive}
                      className="p-1 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
