# Tickworks System Plan

## Core Identity
Tickworks is a hybrid of:
- Ticketing system (like Jira)
- Time tracking system (like Clockify)
- Lightweight operations tool (like ClickUp-lite)
- Audit & accountability system (admin review layer)

**Core rule:** Time tracking is a byproduct of work, not the center of it.
**Pipeline:** SMS / Email → tickets → work → auditable time → admin review

---

## Feature Checklist

### Ticket Layer
- [x] Dashboard ticket creation (manual)
- [x] Ticket types (dynamic, configurable per org)
- [x] Ticket statuses, priorities, due dates
- [x] Assignee + transfer requests
- [x] Due date extension requests
- [x] Reopen requests
- [x] Subtasks
- [x] Ticket thread (comments + reactions)
- [x] Rich text editor (TipTap) in threads
- [x] File/image attachments in threads
- [x] Ticket watchers
- [x] Related tickets
- [ ] SMS → ticket via Twilio (inbound)
- [ ] Email → ticket via inbound webhook

### Time System
- [x] Per-ticket timer (start/stop)
- [x] Auto-close forgotten timers (work schedule cron)
- [x] Time entry history (editable)
- [x] Flagged/anomalous sessions
- [x] Daily cap enforcement
- [x] Time manager (admin view — team summary by date range)
- [x] Time logs (admin — all entries, flag/close controls)
- [x] Personal time tracker (employee view)

### Admin Dashboard
- [x] Org-wide reports (ticket counts, completion rate, time totals)
- [x] Team workload chart
- [x] Performance table (per-employee, date range)
- [x] Employee reports (per-employee breakdown)
- [x] Audit log viewer (all actions)

### Employees & Org
- [x] Multi-tenant (org isolation)
- [x] RBAC (admin / employee)
- [x] Employee management (create, update, delete)
- [x] Department management
- [x] Join via org join code
- [x] Join request approval flow
- [x] Leave requests (sick, vacation, emergency)
- [x] Leave approval workflow
- [x] Employee metadata (salary, DOB, address, phone)
- [ ] QR code org joining

### Settings
- [x] Work schedule (shift hours, working days, timezone, daily cap)
- [x] Org storage configuration (S3 / Supabase Storage)
- [x] Thread attachments toggle (admin on/off)
- [x] Profile settings (name, phone, timezone)
- [x] Two-factor authentication
- [x] Personal timezone preference

### Notifications
- [x] In-app notification bell
- [x] Email notifications (ticket assigned, comments, approvals)
- [x] Notification types: assignment, transfer, completion, comments, requests

### Compliance (GDPR / UK DPA)
- [x] Privacy Policy, Terms of Service, Cookie Policy pages
- [x] Consent checkboxes at registration (privacy + terms)
- [x] Consent timestamps saved to DB (version-stamped)
- [x] Data export endpoint (Art. 20 — right to portability)
- [x] Account deletion request with 30-day grace period (Art. 17)
- [x] Audit logging on employee data access (READ, UPDATE, DELETE, EXPORT)
- [x] Retention cleanup task (3yr time entries, 7yr leave records)
- [x] Legal footer links on landing page + auth pages

### Performance & Infrastructure
- [x] Composite DB indexes (tickets, time entries, comments)
- [x] PgBouncer connection pooling
- [x] React Query staleTime tuning across all heavy queries
- [x] SQL aggregate for ticket time totals (replaced JS reduce)
- [x] Redis caching scaffold (activates when REDIS_URL is set)

### Payments
- [ ] Stripe subscription + billing

### Execution Layer
- [ ] Browser extension (plan: `docs/BROWSER-EXTENSION-PLAN.md`)

---

## Remaining Work (Priority Order)

1. **Stripe** — subscription plans, billing portal, org plan gating
2. **SMS → ticket** — Twilio inbound webhook, parse message → create ticket, notify admin
3. **Email → ticket** — inbound email webhook (Resend or SendGrid), parse → ticket
4. **QR org joining** — generate QR from org join code, scannable on mobile
5. **Browser extension** — see `docs/BROWSER-EXTENSION-PLAN.md`
6. **Department hierarchy** — see below

---

## Department Hierarchy (Next Update)

### Why
Currently all employees are flat under the org. For larger teams, admins need to delegate — department managers should own their team's tickets and reports without having full org-wide admin access.

### Target structure
```
Organization
└── Admin (org-wide, full control)
    ├── Department A
    │   ├── Department Manager (manages dept tickets + members, no org-wide access)
    │   └── Team Members
    ├── Department B
    │   ├── Department Manager
    │   └── Team Members
    └── (employees with no department)
```

### What already exists
- `Department` model in schema ✅
- `department_id` on `User` ✅
- Department CRUD API routes ✅
- Department management page (basic) ✅

### What needs to be built

**Schema changes:**
- Add `departments_enabled Boolean @default(false)` to `Organization`
- Add `manager_id String?` to `Department` (the department manager user)
- Add `"manager"` as a valid role string (between admin and employee)

**Settings:**
- "Enable Departments" toggle in org settings (admin only)
- When off — department UI is hidden everywhere, all employees appear flat
- When on — department assignment visible on employee profiles, department manager role available

**New role — Department Manager:**
- Can see all tickets assigned to members of their department
- Can assign tickets within their department
- Can view department-level time reports and workload
- Cannot see other departments or org-wide settings
- Cannot create/delete employees

**UI:**
- Department management page: create dept, assign manager, assign members
- Department filter on ticket list (admin sees all depts, manager sees own dept)
- Department column on employee table
- Department breakdown in reports (time by dept, tickets by dept)
- Department header on dashboard for managers (their dept summary)

**RBAC update (`configs/rbac.config.ts`):**
- Add `ROLES.MANAGER = "manager"` 
- Manager permission set: view own dept tickets, assign within dept, view dept reports

### Enable departments toggle
Recommended: off by default. Small orgs don't need it. Admin turns it on when their team grows large enough to need delegation. This keeps the UI clean for smaller customers on the Business plan.
