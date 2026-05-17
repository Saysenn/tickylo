# Department Hierarchy — Implementation Plan

## Context
Admins need to organise employees into departments as their org grows. Feature is off by default (small orgs don't need it). When enabled: department management appears in Settings, a Department column appears on the employee table with bulk assign, and each employee's detail page gets a department field. Disabling hides all UI — zero data is deleted, everything restores on re-enable.

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
| `deleteDepartment(id, admin, force=false)` | If has users and `!force` → 400. If `force` → `updateMany` users to `department_id: null` first |
| `bulkDeleteDepartments(ids, admin, force)` | Iterate, call `deleteDepartment` per id, return `{ succeeded, failed }` |

**`DepartmentRow` type:**
```typescript
{ id, name, manager_id, manager: { id, name, email } | null, _count: { users: number }, created_at, updated_at }
```

### `services/employees.service.ts` — Extensions

| Function | Change |
|---|---|
| `listEmployees` | Add `department: { select: { id, name } }` to Prisma `select` |
| `getEmployee` | Add parallel `prisma.user.findFirst` for dept; merge `department` into returned object |
| `updateEmployee` | Add `department_id?: string \| null` to `UpdateEmployeeData`; validate with `withOrg` if non-null |
| `bulkEmployeeAction` | Add `"assign_department"` and `"remove_department"` actions; accept `department_id?` param |

---

## API Routes

| File | Change |
|---|---|
| `app/api/v1/department/route.ts` | GET: pass caller to service (fixes global leak). POST schema: add `manager_id` |
| `app/api/v1/department/[id]/route.ts` | PATCH schema: add `manager_id`. DELETE: read `?force=true`, pass to service |
| `app/api/v1/department/bulk/route.ts` (**NEW**) | `{ action: "delete", ids, force? }` → `DepartmentService.bulkDeleteDepartments` |
| `app/api/v1/org/settings/route.ts` | GET: add `departments_enabled` to select + response. PATCH: add `departments_enabled` to schema |
| `app/api/v1/employees/bulk/route.ts` | Add `"assign_department"`, `"remove_department"` to action enum; add `department_id` field |
| `app/api/v1/employees/[id]/route.ts` | Add `department_id` to PATCH schema |

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
Update `employees.bulk()` to accept `"assign_department" | "remove_department"` and `department_id?`.
Update `employees.updateMeta()` to accept `department_id?: string | null`.

---

## Settings UI

### `components/dashboard/settings/departments-admin-section.tsx` — NEW

Self-gating card. Always shows the toggle row. Expands to full management table when `departments_enabled = true`.

- Reads `["org-settings"]` query (already cached by other components — no extra fetch)
- Toggle mutates `APIService.orgSettings.update({ departments_enabled: val })` → invalidates `["org-settings"]`
- Department table: **Name | Manager | Members | Actions (Edit / Delete)**
- Bulk mode: checkbox column + mint bulk bar with "Delete Selected"
- "Add Department" → `DepartmentFormDialog` (create mode)
- Edit pencil → `DepartmentFormDialog` (edit mode)
- Delete trash → confirmation; if API returns 400 "has employees" → force confirm dialog

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

When `departmentsEnabled`:
- Add "Department" `<th>` (hidden mobile: `hidden lg:table-cell`)
- Add `<td>` per row: `employee.department?.name ?? "—"`
- Bulk bar gains: `DepartmentComboboxBulk` (assign) + "Remove Dept" button (unassign)

`DepartmentComboboxBulk` — must be a **named exported component** (not an inline function) so `useQuery` inside it satisfies React rules of hooks. Fetches `["departments"]`, styled `w-[170px] h-7 text-xs`. On select → `bulkAction({ action: "assign_department", department_id })`.

**`colSpan` note:** The empty-state row `colSpan` must be computed dynamically:
```typescript
const colCount = 5 + (bulkMode ? 1 : 0) + (departmentsEnabled ? 1 : 0)
// Use colCount on the empty/no-results <td colSpan={colCount}>
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

Conditionally render `<EmployeeDepartmentSection />` when `org.departments_enabled`.

### `components/dashboard/employees/employee-department-section.tsx` — NEW

```typescript
interface Props { employeeId: string; initialDepartment: { id: string; name: string } | null }
```

Combobox of departments + "None" option. On change → `APIService.employees.updateMeta(employeeId, { department_id })` → `router.refresh()`.

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

---

## Files Summary

**Create (4 new files):**
- `app/api/v1/department/bulk/route.ts`
- `components/dashboard/settings/departments-admin-section.tsx`
- `components/dashboard/settings/department-form-dialog.tsx`
- `components/dashboard/employees/employee-department-section.tsx`

**Modify (15 existing files):**
- `prisma/schema.prisma`
- `configs/rbac.config.ts`
- `services/department.service.ts`
- `services/employees.service.ts`
- `app/api/v1/department/route.ts`
- `app/api/v1/department/[id]/route.ts`
- `app/api/v1/org/settings/route.ts`
- `app/api/v1/employees/bulk/route.ts`
- `app/api/v1/employees/[id]/route.ts`
- `lib/infra/api.ts`
- `lib/utils/format.ts`
- `app/(protected)/dashboard/settings/organization/page.tsx`
- `app/(protected)/dashboard/employees/[id]/page.tsx`
- `components/dashboard/employees/employees-table.tsx`
- `components/dashboard/employees/types.ts`
