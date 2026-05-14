# Timer & Work Schedule Plan

## Problem
- Employees can leave timers running indefinitely (forgotten clock-out)
- No system awareness of working days, shifts, or what "normal" hours look like
- Admin and employees may be in different timezones — times must display correctly for each

---

## Timezone Strategy

Two separate timezone concepts:

| | Field | Purpose |
|---|---|---|
| **Org timezone** | `WorkSchedule.timezone` | Defines when the shift runs (e.g. `Asia/Manila`). All shift/auto-close calculations use this. Set by admin. |
| **Personal timezone** | `User.timezone` | Display only — each user sees times in their local clock. Admin in Bangkok sees `Asia/Bangkok`, employees in PH see `Asia/Manila`. Same data, different display. |

Admin sets the org timezone when configuring the work schedule.
Each user sets their personal timezone in their profile/settings.
If personal timezone is not set, fall back to org timezone, then UTC.

---

## Phase 1 — Work Schedule Config + Auto-Close (Build First)

Admin sets per-org schedule:

| Setting | Example |
|---|---|
| Org timezone | Asia/Manila |
| Shift start | 09:00 |
| Shift end | 17:00 |
| Working days | Mon–Fri |
| Daily cap | 8 hours |

**Auto-close rule:** Cron runs hourly. Any entry still open past `shift_end` (evaluated in org timezone) gets auto-stopped at `shift_end` and flagged `auto_closed: true` for admin review.

**Anomaly flag:** Any single entry longer than the shift window (e.g. timer ran 15h on a 8h shift day) is flagged `flagged: true`. Admin sees these in Time Manager and can trim or leave them.

**Schema additions:**

```prisma
model WorkSchedule {
  id           String   @id @default(cuid())
  org_id       String   @unique
  timezone     String   @default("UTC")         // IANA tz, e.g. "Asia/Manila"
  shift_start  String   @default("09:00")       // HH:MM in org timezone
  shift_end    String   @default("17:00")
  working_days Int[]    @default([1,2,3,4,5])   // 0=Sun … 6=Sat
  daily_cap_h  Float    @default(8)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
  @@map("work_schedules")
}
```

Add to `User`:
```prisma
timezone  String?   // personal display timezone, e.g. "Asia/Bangkok"
```

Add to `TimeEntry`:
```prisma
auto_closed  Boolean @default(false)
flagged      Boolean @default(false)
```

---

## Phase 2 — Org Calendar (Future)

Admin manages a calendar with day types:

| Day Type | Description |
|---|---|
| Regular | Normal working day |
| Holiday | Day off |
| Paid Holiday | Off but paid |
| Rest Day | Weekend override |

Employees can view the calendar (read-only).

---

## Phase 3 — Per-Employee Timezone Override (Future)

If the org expands to a fully remote team across multiple continents, allow each employee to have their own shift window derived from their personal timezone rather than the org timezone. Low priority — most small teams share one shift timezone.

---

## Build Order

1. `WorkSchedule` model + `User.timezone` field → `npx prisma db push`
2. Admin work schedule settings UI + employee read-only view
3. Personal timezone selector in user profile/settings (both admin + employee)
4. Auto-close cron (hourly) — closes open entries past shift end in org timezone
5. Anomaly flag — entries longer than shift window flagged in Time Manager
6. Org calendar UI (Phase 2)
