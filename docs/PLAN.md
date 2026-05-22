# Tickworks — Remaining Work

2. **Help Center CTA** — Fixed "Need help?" widget bottom-left of dashboard.
3. **Client Management + Invoice Export** — See full spec below.
4. **SMS → Ticket** — Twilio inbound → AI parse → ticket (Enterprise).
5. **Email → Ticket** — Inbound webhook → AI parse → ticket (Enterprise).
6. **AI Ticket Assistance** — Plain text → auto-fill fields + chatbot (Enterprise).

---

## Feature Spec: Client Management + Invoice Export

### Problem

Admins need to bill clients based on ticket work. Currently there is no client entity, no rate tracking, and no way to export a billable summary without manual tallying.

### Schema Changes

```prisma
model Client {
  id               String    @id @default(cuid())
  org_id           String
  name             String
  email            String?
  hourly_rate      Float     @default(0)   // billing rate in USD
  discount_percent Float     @default(0)   // 0–100
  notes            String?
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt

  org     Organization @relation(fields: [org_id], references: [id], onDelete: Cascade)
  tickets Ticket[]

  @@index([org_id])
  @@map("clients")
}

model Ticket {
  // ADD:
  client_id String?
  client    Client? @relation(fields: [client_id], references: [id], onDelete: SetNull)
}
```

### Pages

**`/dashboard/clients`** (admin only)

- Table: Name | Email | Rate | Discount | Ticket count | Actions
- Create / Edit / Delete client
- Follow the same table + dialog pattern as employees/departments

**Ticket create/edit**

- Add optional "Client" combobox (fetches `["clients"]` query)
- Visible to admin only; employees don't see billing info

**`/dashboard/reports/invoice`** (admin only, Enterprise feature gate)

- Filters: Client (multi-select or single), Date range (from/to), Status (default: completed)
- Preview table before export
- Export button → downloads XLSX with two sheets:

### Export: Sheet 1 — Line Items

| Field              | Source                                                 |
| ------------------ | ------------------------------------------------------ |
| Invoice #          | Auto-generated (ORG-YYYYMM-001, increments per export) |
| Ticket #           | ticket.id (short)                                      |
| Ticket Title       | ticket.title                                           |
| Client Name        | client.name                                            |
| Employee           | assignee.name                                          |
| Status             | ticket.status                                          |
| Date Completed     | ticket.updated_at (when status → completed)            |
| Billable Hours     | sum of time_entries.duration where is_billable = true  |
| Time Spent (total) | sum of all time_entries.duration                       |
| Rate Applied       | client.hourly_rate (snapshot at export time)           |
| Subtotal           | billable_hours × rate                                  |
| Discount %         | client.discount_percent                                |
| Discount Amount    | subtotal × (discount / 100)                            |
| Net Total          | subtotal − discount_amount                             |

### Export: Sheet 2 — Monthly Summary

| Client | Total Tickets | Total Billable Hours | Total Billed | Total Discount | Net Payable |
| ------ | ------------- | -------------------- | ------------ | -------------- | ----------- |

### API Routes

- `GET/POST /api/v1/clients` — list + create
- `GET/PATCH/DELETE /api/v1/clients/[id]` — single client ops
- `GET /api/v1/reports/invoice` — returns filtered line items JSON
- `POST /api/v1/reports/invoice/export` — generates and returns XLSX file

### Library

Use `xlsx` (SheetJS) for Excel generation — already widely used, handles multi-sheet exports.

### Feature Gate

Invoice export is **Enterprise only**. Client management (CRUD) is available on all paid plans so admins can assign clients to tickets on Business too — but the export/invoice page is gated.

### Client as Foundation (Future Features Unlocked)

Once Client exists as an entity, it becomes the foundation for all external-facing features:

| Feature                    | How Client enables it                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| **Public ticket form**     | `/submit/[org-slug]` — client fills a form, ticket auto-created and tagged to their client record |
| **SMS → Ticket**           | Match inbound phone number against client record → auto-tag client + billing rate                 |
| **Email → Ticket**         | Match inbound email against client record → same                                                  |
| **Invoice export**         | Ticket already knows client → billing math is automatic, no manual matching                       |
| **Client portal** (future) | Client logs in to see their own tickets and invoice history                                       |

**Public ticket submission form** (`/submit/[org-slug]`):

- Public page, no login required
- Client enters their email → validated against registered clients for that org
- If matched: ticket created, tagged to client, assigned to org
- If not matched: rejected with "Contact your provider to get access"
- Fields: Name, Email, Subject (ticket title), Description, Priority (optional)
- Org admin sees it in their ticket queue like any other ticket

# one liner flow

Apply → Super admin approves → org created as unpaid → admin sets up billing → trial (14 days, denied if email used a trial before) → trial ends → Stripe charges → business or enterprise → payment fails → unpaid → admin pays again → back to plan.
