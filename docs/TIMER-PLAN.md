# Timer & Work Schedule Plan

## Problem
- Employees can leave timers running indefinitely (forgotten clock-out)
- No way to distinguish regular hours from overtime
- No system awareness of working days, shifts, or holidays

---

## Phase 1 — Work Schedule Config (Build First)

Admin sets per-org schedule:

| Setting | Example |
|---|---|
| Daily cap | 8 hours |
| Shift start | 09:00 |
| Shift end | 17:00 |
| Working days | Mon–Fri |

**Auto-close rule:** If a timer is still running at `shift_end`, the system auto-stops it at that time and flags the entry as `auto_closed: true` for admin review. No infinite timers.

**Where:** New "Work Schedule" settings page under admin Settings.

**Schema addition:**
```prisma
model WorkSchedule {
  id           String  @id @default(cuid())
  org_id       String  @unique
  daily_cap_h  Float   @default(8)
  shift_start  String  @default("09:00")  // HH:MM
  shift_end    String  @default("17:00")  // HH:MM
  working_days Int[]   @default([1,2,3,4,5]) // 0=Sun, 6=Sat
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
}
```

Add `auto_closed Boolean @default(false)` to `TimeEntry`.

**Cron job:** Runs at `shift_end` daily — finds all open entries for the org, closes them at `shift_end`, marks `auto_closed: true`, notifies admin.

---

## Phase 2 — Overtime Classification

After Phase 1, at clock-out compute:

- `regular_ms` = min(actual duration, daily cap)
- `overtime_ms` = max(0, actual duration − daily cap)
- Weekend entries → fully overtime if that day is not a working day

Store both on `TimeEntry`. Surface in time reports.

---

## Phase 3 — Org Calendar

Admin manages a calendar with day types:

| Day Type | Description |
|---|---|
| Regular | Normal working day |
| Holiday | Unpaid off |
| Paid Holiday | Off but paid |
| Double Pay | Holiday with 2× rate |
| Rest Day | Weekend override |

Employees can view the calendar (read-only).
Any time worked on a holiday is fully overtime / flagged by type.

---

## Phase 4 — Anomaly Flagging (Anti-Cheat)

- Flag any single time entry over `daily_cap × 1.5`
- Flag any ticket with total logged time over `estimated_hours × 2`
- Flagged entries appear in a dedicated admin review queue
- Admin can approve, trim, or reject flagged entries

---

## Build Order

1. `WorkSchedule` model + admin settings UI
2. Auto-close cron at shift end
3. `auto_closed` flag + admin review in Time Manager
4. Overtime fields on `TimeEntry` + classification logic
5. Org calendar UI + holiday day types
6. Anomaly flagging queue
