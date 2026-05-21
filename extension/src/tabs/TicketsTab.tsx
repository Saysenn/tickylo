import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, ArrowLeftRight, RotateCcw, Play, Square, CheckCheck, PauseCircle, Loader2, ChevronLeft, Clock, UserPlus, CalendarClock, AlertCircle } from "lucide-react";
import {
  getMyTickets, getAvailableTickets, claimTicket,
  updateTicketStatus, startTimer, stopTimer, createTicket,
  requestTransfer, requestReopen, requestDueDateExtension, getTicket,
} from "../lib/api";
import type { Ticket, ActiveTimer } from "../lib/api";
import { Storage } from "../lib/storage";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-50 text-red-600 border-red-200",
  high:     "bg-orange-50 text-orange-600 border-orange-200",
  medium:   "bg-yellow-50 text-yellow-600 border-yellow-200",
  low:      "bg-gray-50 text-gray-500 border-gray-200",
};

const STATUS_STYLES: Record<string, string> = {
  open:        "bg-blue-50 text-blue-600",
  assigned:    "bg-indigo-50 text-indigo-600",
  in_progress: "bg-mint/15 text-ink-2",
  completed:   "bg-green-50 text-green-600",
  on_hold:     "bg-gray-100 text-gray-500",
  stale:       "bg-red-50 text-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  open:        "Open",
  assigned:    "Assigned",
  in_progress: "In Progress",
  completed:   "Done",
  on_hold:     "On Hold",
  stale:       "Stale",
};

// ─── Main tab ─────────────────────────────────────────────────────────────────

type View = "mine" | "available";

export function TicketsTab({
  activeTimer,
  setActiveTimer,
  isAdmin,
  userId,
}: {
  activeTimer: ActiveTimer | null;
  setActiveTimer: (t: ActiveTimer | null) => void;
  isAdmin: boolean;
  userId: string;
}) {
  const [view, setView]             = useState<View>("mine");
  const [mineFilter, setMineFilter] = useState<"active" | "all" | "resolved">("active");
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [loading, setLoading]       = useState(false);
  const [acting, setActing]         = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [selected, setSelected]     = useState<Ticket | null>(null);

  const ACTIVE   = new Set(["assigned", "in_progress", "on_hold", "stale"]);
  const RESOLVED = new Set(["completed", "closed", "rejected"]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = view === "mine" ? await getMyTickets() : await getAvailableTickets(isAdmin);
      if (view === "mine") {
        // Always scope to the current user — backend view=assigned may leak for admins
        const mine = res.data.filter((t) => t.user_id === userId);
        setTickets(
          mineFilter === "active"   ? mine.filter((t) => ACTIVE.has(t.status))   :
          mineFilter === "resolved" ? mine.filter((t) => RESOLVED.has(t.status)) :
          mine
        );
      } else {
        // Available = unassigned only, regardless of what the API returns for admins (view=all)
        setTickets(res.data.filter((t) => t.user_id === null));
      }
    } catch { setTickets([]); }
    finally { setLoading(false); }
  }, [view, mineFilter, isAdmin, userId]);

  useEffect(() => { load(); }, [load]);

  async function handleClaim(id: string) {
    setActing(id);
    try { await claimTicket(id); await load(); } finally { setActing(null); }
  }

  async function handleAction(id: string, action: "start" | "complete" | "hold" | "reopen") {
    setActing(id);
    try { await updateTicketStatus(id, action); await load(); } finally { setActing(null); }
  }

  async function handleStartTimer(ticket: Ticket) {
    setActing(ticket.id);
    try {
      // Stop any currently running timer first (switch behaviour)
      if (activeTimer) await stopTimer(activeTimer.id);
      const entry = await startTimer({ title: ticket.title, ticket_id: ticket.id });
      await Storage.setSession({ entry_id: entry.id, start_time: entry.start_time, title: entry.title });
      setActiveTimer(entry);
    } finally { setActing(null); }
  }

  async function handleTransferRequest(id: string) {
    setActing(id);
    try { await requestTransfer(id); await load(); } finally { setActing(null); }
  }

  async function handleReopenRequest(id: string) {
    setActing(id);
    try { await requestReopen(id); await load(); } finally { setActing(null); }
  }

  async function handleDueDateRequest(id: string, date: string) {
    setActing(id);
    try { await requestDueDateExtension(id, date); await load(); } finally { setActing(null); }
  }

  async function handleStopTimer() {
    if (!activeTimer) return;
    setActing(activeTimer.id);
    try {
      await stopTimer(activeTimer.id);
      await Storage.clearSession();
      setActiveTimer(null);
    } finally { setActing(null); }
  }

  if (creating) return <CreateForm onClose={() => { setCreating(false); load(); }} />;
  if (selected) return (
    <TicketDetail
      ticket={selected}
      activeTimer={activeTimer}
      acting={acting}
      userId={userId}
      isAdmin={isAdmin}
      onBack={() => { setSelected(null); load(); }}
      onClaim={() => handleClaim(selected.id)}
      onAction={(a) => handleAction(selected.id, a)}
      onStartTimer={() => handleStartTimer(selected)}
      onStopTimer={handleStopTimer}
      onTransfer={() => handleTransferRequest(selected.id)}
      onReopen={() => handleReopenRequest(selected.id)}
      onDueDateRequest={(date) => handleDueDateRequest(selected.id, date)}
    />
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-gray-100">
        <div className="flex flex-1 gap-1 bg-gray-100 rounded-lg p-0.5">
          {(["mine", "available"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-1.5 rounded-md text-[10px] font-semibold transition-colors ${
                view === v ? "bg-white text-ink shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {v === "mine" ? "My Tickets" : "Available"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="w-7 h-7 rounded-lg bg-mint flex items-center justify-center hover:bg-mint-hover transition-colors shrink-0"
        >
          <Plus size={14} strokeWidth={2.5} className="text-ink" />
        </button>
      </div>

      {/* Mine filter chips */}
      {view === "mine" && (
        <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-50">
          {(["active", "all", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setMineFilter(f)}
              className={`flex-1 py-1 rounded-lg text-[9px] font-semibold transition-colors ${
                mineFilter === f ? "bg-ink text-white" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {f === "active" ? "Active" : f === "all" ? "All" : "Resolved"}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={18} className="text-gray-300 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center px-4">
            <p className="text-xs text-gray-400">
              {view === "mine" ? "No tickets assigned to you" : "No open tickets available to claim"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => (
              <TicketRow
                key={t.id}
                ticket={t}
                view={view}
                acting={acting}
                activeTimer={activeTimer}
                onSelect={() => setSelected(t)}
                onClaim={() => handleClaim(t.id)}
                onAction={(a) => handleAction(t.id, a)}
                onStartTimer={() => handleStartTimer(t)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ticket row ───────────────────────────────────────────────────────────────

function TicketRow({
  ticket: t, view, acting, activeTimer,
  onSelect, onClaim, onAction, onStartTimer,
}: {
  ticket: Ticket;
  view: View;
  acting: string | null;
  activeTimer: ActiveTimer | null;
  onSelect: () => void;
  onClaim: () => void;
  onAction: (a: "start" | "complete" | "hold" | "reopen") => void;
  onStartTimer: () => void;
}) {
  const busy = acting === t.id;
  const isActive = activeTimer?.id !== undefined;

  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-4 py-3 hover:bg-gray-50/80 transition-colors"
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-ink leading-snug line-clamp-2">{t.title}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[t.status] ?? "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABEL[t.status] ?? t.status}
            </span>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLES[t.priority] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
              {t.priority}
            </span>
            {t.ticket_type && (
              <span className="text-[9px] text-gray-400">{t.ticket_type}</span>
            )}
          </div>
        </div>

        {/* Quick action — stop propagation so row click doesn't fire */}
        <div onClick={(e) => e.stopPropagation()}>
          {view === "available" && t.user_id === null && (
            <Chip label="Claim" busy={busy} onClick={onClaim} />
          )}
          {view === "mine" && t.status === "assigned" && (
            <Chip label="Start" busy={busy} onClick={() => onAction("start")} />
          )}
          {view === "mine" && t.status === "in_progress" && !isActive && (
            <Chip label="▶ Timer" busy={busy} onClick={onStartTimer} accent />
          )}
          {view === "mine" && t.status === "in_progress" && (
            <Chip label="Done" busy={busy} onClick={() => onAction("complete")} />
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Ticket detail ────────────────────────────────────────────────────────────

function useElapsed(startIso: string | null) {
  const [elapsed, setElapsed] = useState("");
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!startIso) { setElapsed(""); return; }
    const tick = () => {
      const ms = Date.now() - new Date(startIso).getTime();
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      const s = Math.floor((ms % 60_000) / 1_000);
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : `${m}:${String(s).padStart(2,"0")}`);
    };
    tick();
    ref.current = setInterval(tick, 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [startIso]);
  return elapsed;
}

function TicketDetail({
  ticket: initial, activeTimer, acting, userId, isAdmin,
  onBack, onClaim, onAction, onStartTimer, onStopTimer, onTransfer, onReopen, onDueDateRequest,
}: {
  ticket: Ticket;
  activeTimer: ActiveTimer | null;
  acting: string | null;
  userId: string;
  isAdmin: boolean;
  onBack: () => void;
  onClaim: () => void;
  onAction: (a: "start" | "complete" | "hold" | "reopen") => void;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onTransfer: () => void;
  onReopen: () => void;
  onDueDateRequest: (date: string) => void;
}) {
  const [t, setT]                       = useState<Ticket>(initial);
  const [dueDateInput, setDueDateInput] = useState("");
  const [showDueForm, setShowDueForm]   = useState(false);

  useEffect(() => {
    getTicket(initial.id).then(setT).catch(() => {});
  }, [initial.id]);

  const isThisTicketTimed = activeTimer?.ticket_id === t.id;
  const elapsed            = useElapsed(isThisTicketTimed ? activeTimer!.start_time : null);

  const busy               = acting === t.id || acting === activeTimer?.id;
  const isAssignee         = t.user_id === userId;
  const isUnassigned       = t.user_id === null;
  const isTimerRunning     = !!activeTimer;
  const hasPendingTransfer = (t.transferRequests?.length ?? 0) > 0;
  const hasPendingReopen   = (t.reopenRequests?.length ?? 0) > 0;
  const isStale            = t.status === "stale";
  const isDone             = ["completed", "closed", "rejected"].includes(t.status);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_STYLES[t.status] ?? "bg-gray-100 text-gray-500"}`}>
            {STATUS_LABEL[t.status] ?? t.status}
          </span>
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full border shrink-0 ${PRIORITY_STYLES[t.priority] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
            {t.priority}
          </span>
          {t.ticket_type && (
            <span className="text-[9px] text-gray-400 shrink-0">{t.ticket_type.replace(/_/g, " ")}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <p className="text-xs font-bold text-ink leading-snug">{t.title}</p>

        {/* Assignee */}
        {t.assignee ? (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-mint/20 flex items-center justify-center text-[9px] font-bold text-ink-2 shrink-0">
              {(t.assignee.name ?? t.assignee.email).charAt(0).toUpperCase()}
            </div>
            <p className="text-[10px] text-gray-500">{t.assignee.name ?? t.assignee.email}</p>
          </div>
        ) : (
          <p className="text-[10px] text-gray-400 italic">Unassigned</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {t.due_date && (
            <p className="text-[10px] text-gray-400">
              Due <span className="font-medium text-ink-2">
                {new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </p>
          )}
          {t.created_at && (
            <p className="text-[10px] text-gray-400">
              Created <span className="font-medium text-ink-2">
                {new Date(t.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </p>
          )}
        </div>

        {/* Description */}
        {t.description && (
          <div className="rounded-xl bg-gray-50 px-3 py-2.5">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</p>
            <p className="text-[11px] text-ink-2 leading-relaxed whitespace-pre-wrap">{t.description}</p>
          </div>
        )}

        {/* Live timer for this ticket */}
        {isThisTicketTimed && (
          <div className="flex items-center justify-between rounded-xl bg-mint/10 border border-mint/20 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse shrink-0" />
              <span className="text-[10px] font-semibold text-ink-2">Tracking</span>
            </div>
            <span className="text-xs font-bold text-ink tabular-nums">{elapsed}</span>
          </div>
        )}

        {/* Pending flags */}
        {(hasPendingTransfer || hasPendingReopen) && (
          <div className="flex flex-wrap gap-1.5">
            {hasPendingTransfer && (
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">Transfer pending</span>
            )}
            {hasPendingReopen && (
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">Review pending</span>
            )}
          </div>
        )}

        {/* Due date request inline form */}
        {showDueForm && (
          <div className="rounded-xl border border-gray-200 p-3 space-y-2">
            <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Request new due date</p>
            <input type="date" value={dueDateInput} onChange={(e) => setDueDateInput(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-mint" />
            <div className="flex gap-1.5">
              <button onClick={() => { if (dueDateInput) { onDueDateRequest(dueDateInput); setShowDueForm(false); } }}
                className="flex-1 py-1.5 rounded-lg bg-mint text-ink text-[10px] font-semibold hover:bg-mint-hover transition-colors">
                Submit
              </button>
              <button onClick={() => setShowDueForm(false)}
                className="flex-1 py-1.5 rounded-lg border border-gray-200 text-[10px] text-gray-500 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {(() => {
        const actions: { icon: React.ReactNode; tip: string; onClick: () => void; primary?: boolean; disabled?: boolean }[] = [];

        if (isUnassigned && !isAdmin)
          actions.push({ icon: <UserPlus size={15} strokeWidth={2} />, tip: "Claim ticket", onClick: onClaim, primary: true });

        if (isAssignee && t.status === "assigned")
          actions.push({ icon: <Play size={15} fill="currentColor" strokeWidth={0} />, tip: "Start working", onClick: () => onAction("start"), primary: true });

        if (isAssignee && t.status === "in_progress" && isThisTicketTimed)
          actions.push({ icon: <Square size={15} strokeWidth={2} fill="currentColor" />, tip: "Stop timer", onClick: onStopTimer });

        if (isAssignee && t.status === "in_progress" && !isThisTicketTimed)
          actions.push({
            icon: <Clock size={15} strokeWidth={2} />,
            tip: isTimerRunning ? "Switch timer to this ticket" : "Start timer",
            onClick: onStartTimer,
            primary: true,
          });

        if (isAssignee && t.status === "in_progress")
          actions.push({ icon: <CheckCheck size={15} strokeWidth={2.5} />, tip: "Mark complete", onClick: () => onAction("complete"), primary: true });

        if (isAssignee && (t.status === "assigned" || t.status === "in_progress"))
          actions.push({ icon: <PauseCircle size={15} strokeWidth={2} />, tip: "Put on hold", onClick: () => onAction("hold") });

        if (isAssignee && t.status === "on_hold")
          actions.push({ icon: <Play size={15} fill="currentColor" strokeWidth={0} />, tip: "Resume work (sets status back to In Progress)", onClick: () => onAction("start"), primary: true });

        if (isAssignee && t.status === "completed")
          actions.push({ icon: <RotateCcw size={15} strokeWidth={2} />, tip: "Reopen ticket", onClick: () => onAction("reopen") });

        if (isAssignee && isStale)
          actions.push(isAdmin
            ? { icon: <RotateCcw size={15} strokeWidth={2} />, tip: "Reopen ticket", onClick: () => onAction("reopen"), primary: true }
            : { icon: <AlertCircle size={15} strokeWidth={2} />, tip: hasPendingReopen ? "Review already requested" : "Request admin review (ticket is stale)", onClick: onReopen, disabled: hasPendingReopen }
          );

        if (!isAdmin && isAssignee && (t.status === "assigned" || t.status === "in_progress"))
          actions.push({ icon: <ArrowLeftRight size={15} strokeWidth={2} />, tip: hasPendingTransfer ? "Transfer already requested" : "Request transfer to another employee", onClick: onTransfer, disabled: hasPendingTransfer });

        if (isAssignee && !isDone && t.due_date && !showDueForm)
          actions.push({ icon: <CalendarClock size={15} strokeWidth={2} />, tip: "Request due date extension", onClick: () => setShowDueForm(true) });

        if (actions.length === 0 && !isAssignee && !isUnassigned && !isAdmin)
          return <div className="border-t border-gray-100 px-4 py-3"><p className="text-[10px] text-center text-gray-400">Not assigned to you</p></div>;

        if (actions.length === 0) return null;

        return (
          <div className="border-t border-gray-100 px-4 py-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {actions.map((a, i) => (
                <button
                  key={i}
                  title={a.tip}
                  onClick={a.onClick}
                  disabled={busy || a.disabled}
                  className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors disabled:opacity-40 ${
                    a.primary
                      ? "bg-mint text-ink hover:bg-mint-hover"
                      : "border border-gray-200 text-ink-2 hover:bg-gray-50"
                  }`}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : a.icon}
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Create form ──────────────────────────────────────────────────────────────

const TICKET_TYPES = [
  { value: "internal_task", label: "Task",     prefix: "TASK" },
  { value: "request",       label: "Request",  prefix: "REQ"  },
  { value: "incident",      label: "Incident", prefix: "INC"  },
  { value: "change",        label: "Change",   prefix: "RFC"  },
];

function CreateForm({ onClose }: { onClose: () => void }) {
  const [title, setTitle]       = useState("");
  const [description, setDesc]  = useState("");
  const [priority, setPriority] = useState("medium");
  const [type, setType]         = useState("internal_task");
  const [dueDate, setDueDate]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const prefix = TICKET_TYPES.find((t) => t.value === type)?.prefix ?? "TASK";

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return; }
    setLoading(true); setError("");
    try {
      await createTicket({
        title: `${prefix}: ${title.trim()}`,
        description: description.trim() || undefined,
        priority,
        ticket_type: type,
        due_date: dueDate || undefined,
      });
      onClose();
    } catch { setError("Failed to create. Try again."); }
    finally { setLoading(false); }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <ChevronLeft size={16} strokeWidth={2} />
        </button>
        <p className="text-xs font-bold text-ink">New Ticket</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Type chips */}
        <div>
          <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Type</label>
          <div className="grid grid-cols-4 gap-1">
            {TICKET_TYPES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setType(value)}
                className={`py-1.5 rounded-lg text-[9px] font-bold border transition-colors ${
                  type === value
                    ? "bg-ink text-white border-ink"
                    : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
            Title * <span className="normal-case font-normal text-gray-300">— will be prefixed with {prefix}:</span>
          </label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short description of the work"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-ink placeholder:text-gray-300 focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint/30"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
            Description <span className="normal-case font-normal text-gray-300">(optional)</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="More details…"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-ink placeholder:text-gray-300 focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint/30 resize-none leading-relaxed"
          />
        </div>

        {/* Priority chips */}
        <div>
          <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Priority</label>
          <div className="grid grid-cols-4 gap-1">
            {(["low", "medium", "high", "critical"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPriority(p)}
                className={`py-1.5 rounded-lg text-[9px] font-bold border transition-colors ${
                  priority === p
                    ? PRIORITY_STYLES[p]
                    : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                }`}
              >
                {p === "critical" ? "Crit" : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Due date */}
        <div>
          <label className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
            Due Date <span className="normal-case font-normal text-gray-300">(optional)</span>
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-ink focus:outline-none focus:border-mint focus:ring-1 focus:ring-mint/30"
          />
        </div>

        {error && <p className="text-[10px] text-red-500">{error}</p>}
      </div>

      <div className="px-4 py-3 border-t border-gray-100">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-mint text-ink font-semibold text-xs hover:bg-mint-hover transition-colors disabled:opacity-50"
        >
          <Plus size={13} strokeWidth={2.5} />
          {loading ? "Creating…" : "Create Ticket"}
        </button>
      </div>
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function Chip({ label, busy, onClick, accent }: { label: string; busy: boolean; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors disabled:opacity-40 whitespace-nowrap ${
        accent
          ? "bg-mint text-ink hover:bg-mint-hover"
          : "bg-gray-100 text-ink-2 hover:bg-gray-200"
      }`}
    >
      {busy ? <Loader2 size={10} className="animate-spin" /> : label}
    </button>
  );
}

