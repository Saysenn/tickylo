# Department Hierarchy — Implementation Plan

## Context
Admins need to organise employees into departments as their org grows. Feature is off by default (small orgs don't need it). When enabled: department management appears in Settings, a Department column + filters appear on the employee table with bulk assign, and each employee's detail page gets a department field. Disabling hides all UI — zero data is deleted, everything restores on re-enable.

---

## Schema Changes — `prisma/schema.prisma`

```prisma
model Organization {
  departments_enabled Boolean @default(false)  // ADD
  departments         Department[]             // ADD back-reference
}

model Department {
  id         String    @id @default(cuid())
  org_id     String?
  name       String
  manager_id String?                           // ADD
  created_at DateTime  @default(now())         // ADD
  updated_at DateTime  @updatedAt              // ADD

  org     Organization? @relation(fields: [org_id], references: [id], onDelete: Cascade)
  manager User?         @relation("DepartmentManager", fields: [manager_id], references: [id], onDelete: SetNull)
  users   User[]        @relation("DepartmentMembers")

  @@unique([org_id, name])
  @@index([org_id])
  @@index([manager_id])
  @@map("departments")
}

model User {
  // Fix relation names (required because User has two relations to Department)
  department          Department?  @relation("DepartmentMembers", fields: [department_id], references: [id], onDelete: SetNull)
  managed_departments Department[] @relation("DepartmentManager")
}
```

Run: `npx prisma migrate dev --name add_department_hierarchy`

---

## RBAC — `configs/rbac.config.ts`

Add `MANAGER: "manager"` to the `ROLES` const and `Role` union. No route permission changes in this phase — managers see the same UI as employees for now.

---

## Service Layer

### `services/department.service.ts` — Full rewrite

Fix critical bug: **zero org isolation currently exists**. Every function must use `withOrg(orgId)`.

| Function | Key logic |
|---|---|
| `listDepartments(caller, page, limit)` | `findMany({ where: withOrg(orgId), include: { manager, _count: { users } }, orderBy: { name: "asc" } })` |
| `createDepartment(admin, { name, manager_id? })` | Validate `manager_id` belongs to org via `withOrg`; uniqueness check scoped to org |
| `updateDepartment(id, admin, { name?, manager_id? })` | Ownership check first: `findFirst({ where: withOrg(orgId, { id }) })` → 404 if missing |
| `deleteDepartment(id, admin, force=false)` | If has users and `!force` → return `{ hasEmployees: true, count: N }` (not a throw). If `force` → `updateMany` users to `department_id: null` first |
| `bulkDeleteDepartments(ids, admin, force)` | Iterate, call `deleteDepartment` per id, return `{ succeeded, failed }` |

**`DepartmentRow` type:**
```typescript
{ id, name, manager_id, manager: { id, name, email } | null, _count: { users: number }, created_at, updated_at }
```

### `services/employees.service.ts` — Extensions

| Function | Change |
|---|---|
| `listEmployees` | Add `department: { select: { id, name } }` to Prisma `select`; accept `department_id?` and `manager_id?` filter params |
| `getEmployee` | Add parallel `prisma.user.findFirst` for dept; merge `department` into returned object |
| `updateEmployee` | Add `department_id?: string \| null` to `UpdateEmployeeData`; validate with `withOrg` if non-null |
| `bulkEmployeeAction` | Add `"assign_department"` and `"remove_department"` actions; accept `department_id?` param |

**`listEmployees` filter extension:**
```typescript
async function listEmployees(admin, page=1, limit=10, search?, department_id?, manager_id?)
// department_id filter: where: { ...withOrg(orgId), role: ROLES.EMPLOYEE, department_id, ...searchFilter }
// manager_id filter: where: { ...withOrg(orgId), role: ROLES.EMPLOYEE, department: { manager_id }, ...searchFilter }
```

---

## API Routes

| File | Change |
|---|---|
| `app/api/v1/department/route.ts` | GET: pass caller to service (fixes global leak). POST schema: add `manager_id` |
| `app/api/v1/department/[id]/route.ts` | PATCH schema: add `manager_id`. DELETE: read `?force=true`, pass to service; handle `hasEmployees` response with 409 + count |
| `app/api/v1/department/bulk/route.ts` (**NEW**) | `{ action: "delete", ids, force? }` → `DepartmentService.bulkDeleteDepartments` |
| `app/api/v1/org/settings/route.ts` | GET: add `departments_enabled` to select + response. PATCH: add `departments_enabled` to schema |
| `app/api/v1/employees/bulk/route.ts` | Add `"assign_department"`, `"remove_department"` to action enum; add `department_id` field |
| `app/api/v1/employees/[id]/route.ts` | Add `department_id` to PATCH schema |
| `app/api/v1/employees/route.ts` | GET: accept `department_id` and `manager_id` query params; pass to `listEmployees` |

**Delete route response shape for `hasEmployees`:**
```typescript
// 409 Conflict:
{ error: "has_employees", count: N, message: "Department has N employees." }
// UI catches 409 specifically and shows the force confirm dialog with the count — no generic error shown
```

---

## API Client — `lib/infra/api.ts`

```typescript
public departments = {
  list: (page=1, limit=50) => axiosService.get(`${apiVersion}/department`, { page, limit }),
  create: (data: { name: string; manager_id?: string | null }) => axiosService.post(`${apiVersion}/department`, data),
  update: (id: string, data: { name?: string; manager_id?: string | null }) => axiosService.patch(`${apiVersion}/department/${id}`, data),
  remove: (id: string, force=false) => axiosService.delete(`${apiVersion}/department/${id}${force ? "?force=true" : ""}`),
  bulk: (action: "delete", ids: string[], force=false) => axiosService.post(`${apiVersion}/department/bulk`, { action, ids, force }),
};
```

Update `orgSettings.get()` return type to include `departments_enabled: boolean`.
Update `orgSettings.update()` to accept `departments_enabled?: boolean`.
Update `employees.list()` to accept `department_id?` and `manager_id?` params.
Update `employees.bulk()` to accept `"assign_department" | "remove_department"` and `department_id?`.
Update `employees.updateMeta()` to accept `department_id?: string | null`.

---

## Settings UI

### `components/dashboard/settings/departments-admin-section.tsx` — NEW

Self-gating card. Always shows the toggle row. Expands with a smooth CSS transition (`max-h` + `overflow-hidden` + `transition-all duration-300`) when `departments_enabled = true`.

**Location:** Settings → Organization page (`/dashboard/settings/organization`), rendered as the first card via `<DepartmentsAdminSection />`.

**Toggle row:**
- Icon (Building2) + title "Department Hierarchy" + description "Organise employees into departments and assign managers."
- Toggle switch (same pattern as storage section) on the right
- Clicking the toggle does **not** mutate immediately — it opens a confirmation dialog first

**Confirmation dialog (on every toggle attempt):**

When turning ON:
> **Enable Department Hierarchy?**
> Departments will appear in Settings, and a Department column and filters will be added to the Employees page. You can disable this at any time — no data will be lost.
> [Cancel] [Enable]

When turning OFF:
> **Disable Department Hierarchy?**
> Department management, the Department column, filters, and manager badges will be hidden across the entire system. All assignments are preserved — re-enabling will restore everything exactly as it was.
> [Cancel] [Disable]

Both dialogs use `DialogRoot` from `@/components/ui/dialog`. Confirm → mutates `APIService.orgSettings.update({ departments_enabled: val })` → invalidates `["org-settings"]`.

- "Add Department" button only visible when enabled and bulk mode is off

**Department table (when enabled):**

Columns: **☐ | Name | Manager | Members | Actions**

- Bulk mode: checkbox column appears, mint bulk bar with "Delete Selected" (disabled when 0 selected)
- "Add Department" button hidden during bulk mode (replace with bulk bar)
- Edit pencil → `DepartmentFormDialog` (edit mode)
- Delete trash → **check `_count.users` from already-loaded data first**:
  - If `_count.users === 0` → confirm dialog "Delete [Name]? This cannot be undone."
  - If `_count.users > 0` → skip first attempt, go straight to force confirm: "**[Name]** has **N members** who will be unassigned. Delete anyway?"
  - On confirm → `deleteDept({ id, force: _count.users > 0 })`

**Empty state (when enabled but no departments yet):**
```
[Building2 icon]
No departments yet
Create your first department to start organising your team.
[+ Add Department button]
```

**Settings sidebar nav** (`app/(protected)/dashboard/settings/layout.tsx`):
- Add "Departments" nav item under Organization group, visible to admin only
- Only shown when `departments_enabled` — read from `["org-settings"]` in layout or use a conditional class
- OR: keep it embedded under Organization page and add an anchor link — simpler, no extra nav item needed
- **Recommended:** Add as a separate nav item that only appears when departments are enabled. Prevents "ghost" nav entries for small orgs.

Query: `{ queryKey: ["departments"], queryFn: () => APIService.departments.list(), staleTime: 30_000 }`

All mutations invalidate `["departments"]` on success.

### `components/dashboard/settings/department-form-dialog.tsx` — NEW

Follows `employee-form-dialog.tsx` pattern.

```typescript
interface Props {
  mode: "create" | "edit";
  department?: DepartmentRow;
  trigger: React.ReactNode;
  onSubmit: (data: { name: string; manager_id?: string | null }) => Promise<void>;
  isPending: boolean;
}
```

Fields: `name` (Input, required), `manager_id` (Combobox pulling from `["employees", 1, undefined]` query, "No manager" → null). Only fetches employees when dialog is `open` (`enabled: open`).

### `app/(protected)/dashboard/settings/organization/page.tsx`

Add `<DepartmentsAdminSection />` between `<OrgJoinQrSection />` and `<WorkScheduleAdminSection />`.

---

## Employee Table — `components/dashboard/employees/employees-table.tsx`

Read `departmentsEnabled` from cached `["org-settings"]` — no extra fetch.

### Department column (when enabled)
- Add "Department" `<th>` (hidden mobile: `hidden lg:table-cell`)
- Add `<td>` per row: `employee.department?.name ?? "—"`

### Manager badge (when enabled)
- If `employee.role === "manager"` → show a small `Manager` badge inline next to the employee name (same style as the role badges on the employees page, e.g. `bg-blue-500/15 text-blue-700`)

### Filters row (when enabled)
Add a second filter row below the search bar:
```
[Department ▼]  [Manager ▼]  [Clear Filters]
```
- **Department filter**: Combobox of departments from `["departments"]` query → sets `departmentFilter` state → re-fetches `["employees", page, search, departmentFilter, managerFilter]`
- **Manager filter**: Combobox of employees with role `manager` → sets `managerFilter` state → filters by `manager_id`
- **Clear Filters**: resets both to `undefined`
- Filters only render when `departmentsEnabled`
- Query key must include filters: `["employees", page, search, departmentFilter, managerFilter]`

### Bulk bar additions (when enabled)
- `DepartmentComboboxBulk` — **named exported component** (not inline function, required for hooks). Fetches `["departments"]`, styled `w-[170px] h-7 text-xs`. On select → `bulkAction({ action: "assign_department", department_id })`
- "Remove Dept" button → `bulkAction({ action: "remove_department" })`

### `colSpan` — computed dynamically
```typescript
const colCount = 4                          // base: Member, Role, Joined, Last Seen
  + 1                                       // Actions column
  + (bulkMode ? 1 : 0)                      // Checkbox column
  + (departmentsEnabled ? 1 : 0)            // Department column
// Use colCount on all empty/no-results <td colSpan={colCount}>
```

Extend `Employee` type in `components/dashboard/employees/types.ts`:
```typescript
department: { id: string; name: string } | null
```

---

## Employee Detail Page — `app/(protected)/dashboard/employees/[id]/page.tsx`

Add to parallel fetch:
```typescript
prisma.organization.findUnique({ where: { id: orgId }, select: { departments_enabled: true } })
prisma.user.findFirst({ where: { id }, select: { department: { select: { id, name } } } })
```

Conditionally render `<EmployeeDepartmentSection />` when `org?.departments_enabled`.

### `components/dashboard/employees/employee-department-section.tsx` — NEW

```typescript
interface Props { employeeId: string; initialDepartment: { id: string; name: string } | null }
```

Displayed as a settings card matching `EmployeeMetaEditSection` style.

- View mode: shows current department name (or "—" if unassigned) with an Edit button
- Edit mode: Combobox of departments + "None" option, Save + Cancel buttons
- On save → `APIService.employees.updateMeta(employeeId, { department_id })` → `router.refresh()`
- If employee is manager of a dept, show a read-only "Manager of: [dept name]" note below the assignment

---

## Format Helper — `lib/utils/format.ts`

```typescript
export function formatMemberCount(n: number): string {
  return `${n} ${n === 1 ? "member" : "members"}`;
}
```

---

## Org Isolation Checklist

| Operation | Guard |
|---|---|
| `listDepartments` | `withOrg(orgId)` in `findMany` |
| `createDepartment` | `org_id: orgId` in create data; manager validated with `withOrg(orgId, { id: manager_id })` |
| `updateDepartment` | `findFirst({ where: withOrg(orgId, { id }) })` ownership check before update |
| `deleteDepartment` | `findFirst({ where: withOrg(orgId, { id }) })` before delete |
| `bulkDeleteDepartments` | Per-item ownership check |
| `assign_department` bulk | Dept validated with `withOrg(orgId, { id: department_id })` |
| `updateEmployee` (dept) | Dept validated with `withOrg(orgId, { id: department_id })` if non-null |
| `listEmployees` (filters) | `department_id` and `manager_id` filters always combined with `withOrg` |

---

## Files Summary

**Create (4 new files):**
- `app/api/v1/department/bulk/route.ts`
- `components/dashboard/settings/departments-admin-section.tsx`
- `components/dashboard/settings/department-form-dialog.tsx`
- `components/dashboard/employees/employee-department-section.tsx`

**Modify (16 existing files):**
- `prisma/schema.prisma`
- `configs/rbac.config.ts`
- `services/department.service.ts`
- `services/employees.service.ts`
- `app/api/v1/department/route.ts`
- `app/api/v1/department/[id]/route.ts`
- `app/api/v1/org/settings/route.ts`
- `app/api/v1/employees/route.ts`
- `app/api/v1/employees/bulk/route.ts`
- `app/api/v1/employees/[id]/route.ts`
- `lib/infra/api.ts`
- `lib/utils/format.ts`
- `app/(protected)/dashboard/settings/organization/page.tsx`
- `app/(protected)/dashboard/employees/[id]/page.tsx`
- `components/dashboard/employees/employees-table.tsx`
- `components/dashboard/employees/types.ts`
