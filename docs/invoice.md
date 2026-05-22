# Invoice Computation Rules

## Rate Types

Every client has a `rate_type` that determines how each completed ticket is priced.

| rate_type | Computation | Notes |
|-----------|-------------|-------|
| `hourly`  | `subtotal = billable_hours × hourly_rate` | Hours drive the charge |
| `fixed`   | `subtotal = hourly_rate` (flat, per ticket) | Hours are logged for reference only — do not affect the charge |
| `none`    | Ticket is **excluded** from the invoice entirely | Client is untracked for billing purposes |

## Billable Hours Source (per ticket)

1. If `ticket.billable_hours` is manually set by an admin → use it
2. Otherwise → fall back to sum of logged time entries (`end_time - start_time` for all closed entries)

**Implication**: Admins should review and set `billable_hours` on every completed ticket before generating an invoice. Unreviewed tickets will fall back to raw tracked time, which may include idle or non-billable time.

## Discount

Applied after the subtotal, regardless of rate type:

```
discount_amount = subtotal × (discount_percent / 100)
net_total       = subtotal - discount_amount
```

## Per-ticket Line Item Formula

```
billable_hours  = ticket.billable_hours ?? sum(time_entries)
subtotal        = rate_type === "hourly" ? billable_hours × hourly_rate
                : rate_type === "fixed"  ? hourly_rate   (flat)
                : 0                      (excluded)
discount_amount = subtotal × (discount_percent / 100)
net_total       = subtotal - discount_amount
```

## Invoice Types

### Client Invoice (Single Client)
- Filters: `status = completed`, `completed_at` in date range, `client_id = selected`
- Excludes tickets whose client has `rate_type = "none"`
- Groups all line items under one client
- Shows one summary block: subtotal → discount → net total

### Full Tally (All Clients)
- Filters: `status = completed`, `completed_at` in date range, all clients
- Excludes tickets with no `client_id` (unassigned client) and `rate_type = "none"` clients
- Groups line items by client
- Per-client subtotal rows
- Grand totals grouped by currency (never mixed across currencies)

## Billing Cycle (informational)

Stored on the client, shown on the invoice header. Does not affect computation.

| Value | Label |
|-------|-------|
| `per_ticket` | Per Ticket |
| `monthly` | Monthly |
| `per_project` | Per Project |

## Payment Terms (informational)

Shown on the invoice header and footer. Does not affect computation.

| Value | Due Date Logic |
|-------|---------------|
| `due_on_receipt` | Due immediately on invoice date |
| `net_15` | Due 15 days from invoice date |
| `net_30` | Due 30 days from invoice date |
| `net_60` | Due 60 days from invoice date |

## XLSX Export Structure

### Client Invoice
- **Sheet: Invoice** — header block (org, client, period, terms), line items table, totals block

### Full Tally
- **Sheet: Line Items** — all tickets grouped by client with per-client subtotals and currency grand totals
- **Sheet: Summary** — one row per client with aggregated totals
