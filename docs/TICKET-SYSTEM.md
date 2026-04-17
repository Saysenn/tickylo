# Ticket System — Architecture & Migration Plan

> **Status:** Planned — not yet implemented.  
> Current codebase uses "task" terminology. This doc defines the migration to a full ticket-based system aligned with ITIL-style workflows while keeping the current version simple and extensible.

---

## Core Philosophy

- Replace "task" with "ticket" as the primary unit of work everywhere (DB, API, UI)
- Tickets are more expressive than tasks: they carry type, client context, time tracking, and an implementation plan
- Keep it **simple now**, designed to extend later (no SLA engines, no approval chains yet)
- Full ITIL alignment is a future phase — today we just add `ticket_type` and structured fields

---

## Phase 1 — Schema Migration (Rename + New Fields)

### Rename

| Old | New |
|---|---|
| `Task` model | `Ticket` model |
| `TaskComment` | `TicketComment` |
| `TaskWatcher` | `TicketWatcher` |
| `TaskSubtask` | `TicketSubtask` |
| `task_id` FK everywhere | `ticket_id` |
| `/api/v1/task` routes | `/api/v1/ticket` routes |
| `/dashboard/tasks` pages | `/dashboard/tickets` pages |

### New Fields on `Ticket`

```prisma
model Ticket {
  // --- existing fields kept ---
  id           String    @id @default(cuid())
  title        String
  description  String?
  priority     String?   // low | medium | high | critical  ← add "critical"
  status       String    @default("open")  // open | in_progress | resolved | closed
  due_date     DateTime?
  created_by   String
  user_id      String?   // assignee
  created_at   DateTime  @default(now())
  updated_at   DateTime  @updatedAt

  // --- new fields ---
  ticket_type         String  @default("internal_task")
  // Values: internal_task | request | incident | change

  client_id           String?   // future: link to Client model
  client_name         String?   // denormalized for now (no Client model yet)

  estimated_hours     Float?
  billable_hours      Float?    // customizable per ticket

  implementation_plan String?   // markdown text
  rollback_plan       String?   // markdown text (for Change type)

  // computed from TimeEntry (not stored — derived via query)
  // actual_time_spent is summed from linked TimeEntry records

  @@map("tickets")
}
```

### Status Vocabulary Change

| Old status | New status |
|---|---|
| pending | open |
| assigned | open (with assignee) |
| in_progress | in_progress |
| completed | resolved |
| — | closed (admin-closed, no further action) |

> `open` replaces both `pending` and `assigned`. Whether a ticket is assigned is determined by `user_id`, not status.

---

## Phase 2 — API Routes

All routes move from `/api/v1/task` → `/api/v1/ticket`.

New fields handled in `createTicketSchema` and `updateTicketSchema`:
- `ticket_type: z.enum(["internal_task", "request", "incident", "change"])`
- `client_name: z.string().max(200).optional()`
- `estimated_hours: z.number().positive().optional()`
- `billable_hours: z.number().nonnegative().optional()`
- `implementation_plan: z.string().max(5000).optional()`
- `rollback_plan: z.string().max(5000).optional()`

`actual_time_spent` is NOT stored — it's computed at read time:
```typescript
const timeSpent = await prisma.timeEntry.aggregate({
  where: { ticket_id: id, end_time: { not: null } },
  _sum: { duration_ms: true },
});
```
(Requires linking `TimeEntry` to `Ticket` via optional `ticket_id` FK)

---

## Phase 3 — Frontend Changes

### Navigation
- Sidebar: "Tasks" → "Tickets"
- Routes: `/dashboard/tasks` → `/dashboard/tickets`

### Ticket Form Dialog
New fields to add:
- **Ticket Type** — `SelectRoot` with options: Internal Task / Request / Incident / Change
- **Client** — free text input for now (future: Select from Client list)
- **Estimated Hours** — number input
- **Billable Hours** — number input (defaults to estimated)
- **Implementation Plan** — textarea (markdown, rendered with `react-markdown`)
- **Rollback Plan** — textarea (only shown when type = "change")

### Ticket Detail Page (`/dashboard/tickets/[id]`)
Add sections:
1. **Header badge** — shows ticket type with color (e.g. Incident = red, Change = orange, Request = blue, Internal = gray)
2. **Time tracking block** — shows Estimated vs Actual vs Billable hours
3. **Implementation Plan** — rendered markdown (collapsible if empty)
4. **Rollback Plan** — only shown for Change tickets

### Tickets Table
- Add "Type" column (badge)
- "Priority" column gains "Critical" value with a distinct dark-red style
- Status labels update to match new vocabulary

---

## Phase 4 — ITIL Extensions (Future, Not Now)

These are **not implemented** in the current phase. Tracked here for design awareness:

| Feature | When |
|---|---|
| SLA timers per ticket type | Phase 4 |
| Auto-assignment rules | Phase 4 |
| Approval workflows (Change must be approved) | Phase 4 |
| Multi-step status for Incident (triage → investigating → resolved) | Phase 4 |
| Client portal (clients can submit tickets) | Phase 4 |
| Full Client model with billing | Phase 4 |

---

## Phase 5 — Notification Filtering by Type (UX)

> **Item #7 from planning notes**

The notifications page currently shows all notifications with All/Unread tabs. Add type-based filtering:

**Filter categories:**
- All
- Unread
- Tasks / Tickets (task_assigned, task_completed, task_claimed, etc.)
- Comments & Mentions (comment_added, comment_mention)
- Time Tracking (time_clock_in, time_clock_out, due_date_reminder)
- Transfers & Escalations (transfer_requested, priority_escalated)

**Implementation:** Add a `?type=` query param to `GET /api/v1/notifications`, add a filter tab bar on the notifications page (reuse the existing `Tabs` component).

---

## Migration Order

1. **Schema** — add new fields to existing `Task` model first (no rename yet), run `prisma db push`
2. **API** — extend existing routes with new fields; add `/api/v1/ticket` aliases that proxy to existing logic
3. **Frontend** — update form dialogs, detail pages, tables
4. **Rename** — atomic rename of `Task` → `Ticket` in schema + routes + UI (final step, minimizes conflicts)
5. **Status vocabulary** — update all status strings and filters

> Rename last to minimize merge conflicts. New fields can ship independently on the existing task system first.
