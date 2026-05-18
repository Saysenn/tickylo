# Tickworks — Remaining Work & Roadmap

---

## ✅ Completed

### Department Hierarchy
- `departments_enabled` toggle on Organization — hides all dept UI when off, zero data deleted
- `Department` model: `id`, `name`, `org_id`, `manager_id`, `created_at`, `updated_at`
- Named Prisma relations: `DepartmentMembers` (user membership) + `DepartmentManager` (manager)
- Full org isolation via `withOrg()` on every dept query
- Department CRUD API: `GET/POST /v1/department`, `PATCH/DELETE /v1/department/[id]`, `POST /v1/department/bulk`
- `listDepartments` — paginated, includes manager info + member count
- `createDepartment` / `updateDepartment` / `deleteDepartment` (force-delete option)
- `bulkDeleteDepartments`
- Employee table: Department column (hidden when disabled), filter by dept, bulk assign/remove dept
- Employee detail page (admin): Department field in About card with Manager badge indicator
- Employee list (`listEmployees`): resolves dept from both `department` (member) and `managed_departments` (manager)
- Notifications: `department_assigned` on member add, `department_manager` on manager assignment
- Settings > Organization: Departments toggle + full dept management table
- Profile page (employee/admin): view/edit toggle, shows dept read-only in Account Details
- `bio`, `skills`, `notes` fields added to `UserMetaData` schema and wired through service → API → edit forms

---

## 🔜 Next Up

### 1. Plan Gating (Enterprise/Business feature flags)
Gate these features behind billing plan checks:
- Reports page + performance APIs
- CSV/PDF export
- AI ticket assistance
- SMS → Ticket (Twilio inbound)
- Email → Ticket (inbound webhook)

**Design:** Middleware or server-side check on `org.plan` before rendering gated pages/APIs. Scalable approach: central `requirePlan(plan: "business" | "enterprise")` helper used in route handlers — mirrors the existing `requireAdmin()` pattern. Secure because it runs server-side; maintainable because plan logic is in one place.

### 2. Session Enforcement (One active session per account)
Prevent multiple simultaneous browser logins per account.

**Feasibility:** Yes, achievable with Supabase Auth.
**Best approach:**
- On each login, store a `session_token` (UUID) in the `users` table
- On login success (via auth callback), generate a new token and save it
- Middleware reads the token from a cookie and compares to DB — mismatch = force sign out
- Pro: Simple, no external dependency
- Con: Slight DB read on every request (mitigate with edge caching or short-lived JWT claims)
- Alternative: Use Supabase's `auth.sessions` table — revoke all other sessions on new login via `supabase.auth.admin.signOut(userId, "others")`

**Recommended:** The Supabase admin `signOut("others")` approach — zero custom token management, built-in.

### 3. Help Center CTA
Add a persistent "Need help?" widget (headphone-with-mic icon) accessible from the dashboard.

**Copy:**
- Icon: headphone with mic
- Heading: "Need help?"
- Body: "Visit our help center for guides and support."
- Button: "Go to help center"

**Placement:** Bottom-left corner of the dashboard layout (fixed position, above the nav) or as a card in Settings.

### 4. Browser Extension
See `docs/BROWSER-EXTENSION-PLAN.md`

### 5. SMS → Ticket (Enterprise)
Twilio inbound webhook → AI parse raw SMS → structured ticket fields.

### 6. Email → Ticket (Enterprise)
Inbound email webhook → AI parse body → auto-fill ticket.

### 7. AI Ticket Assistance (Business+)
Plain text input → auto-fill title, description, priority, type.

---

## 🐛 Known Issues / Tech Debt

- `Department.org_id` is `String?` (nullable) in schema — should be required. Low risk since API always sets it.
- Employee detail page (`[id]/page.tsx`): `tasks` and `timeEntries` not scoped by `org_id` (pre-existing, low exploitability given `requireAdmin()` gate).
- Departments page: selected dept detail panel disappears when a filter hides the selected dept — state not reset on filter change.
- No warning when deleting an employee who is a department manager.
