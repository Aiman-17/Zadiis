# Data Model: US1 (Notification Center) + US2 (YoY Analytics)

## New table: `admin_notifications`

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` |
| `type` | `text` | One of: `payment_received`, `cancellation_request`, `return_request`, `exchange_request` (FR-001's four in-scope event types) |
| `order_id` | `uuid` | FK → `orders(id)`, nullable only if an order lookup genuinely fails (should not happen in the normal flow) |
| `message` | `text` | Human-readable summary shown in the notification list (e.g. "Payment received — order #1042") |
| `created_at` | `timestamptz` | `default now()` |
| `read_at` | `timestamptz` | Nullable. `NULL` = unread. Set once the merchant views the notification (FR-002). |
| `archived_at` | `timestamptz` | Nullable. `NULL` = active/visible in the main list. Set on Archive (FR-002a, soft/recoverable). |

**State transitions**: `created (read_at=NULL, archived_at=NULL)` → `read (read_at set)` → optionally `archived (archived_at set)` → optionally hard-deleted (row removed entirely, not a state — no further transitions). Archive and read are independent (an archived notification can be read or unread; archiving does not force `read_at`).

**RLS**: Service-role only (`for all to service_role using (true)`), no anon policy — matches every other admin-only table in this codebase (e.g. `store_settings`). Read exclusively via `supabaseAdmin` from admin API routes, same as `store/src/app/api/admin/orders/route.ts` and siblings.

**SQL file**: `store/supabase/admin-notifications.sql` — flat file at the `store/supabase/` root, matching the naming/placement convention already used for `requests-tables.sql`, `exchange-columns.sql`, `tier3-merchandising.sql` (not the `migrations/` subfolder, which only holds two older, pre-convention files).

## Write call sites (all six, verified this session)

| # | File:Line | Trigger | `admin_notifications.type` |
|---|---|---|---|
| 1 | `store/src/app/api/payments/verify/route.ts:80` | Online payment verified via redirect flow | `payment_received` |
| 2 | `store/src/app/api/webhooks/safepay/route.ts:108` | Online payment verified via webhook | `payment_received` |
| 3 | `store/src/app/api/requests/cancel/route.ts:80` | Cancellation request submitted | `cancellation_request` |
| 4 | `store/src/app/api/requests/return/route.ts:134` | Return request submitted | `return_request` |
| 5 | `store/src/app/api/requests/return/route.ts:129` | Exchange request submitted | `exchange_request` |
| 6 | `store/src/app/api/admin/orders/route.ts:155` | Admin manually marks a COD order "delivered" (implicit payment-received) | `payment_received` |
| 7 | `store/src/app/api/admin/orders/route.ts:174` | Admin manually sets `payment_status = 'paid'` | `payment_received` |

**New finding this session (not in the original draft)**: call sites 6 and 7 were missed in earlier planning — `store/src/app/api/admin/orders/route.ts` independently calls `sendOwnerPaymentReceived` twice, for the admin's own manual order-management actions. Without writing a notification here too, a payment marked received by the admin themselves (as opposed to an automated webhook/verify) would silently never appear in the notification center, while the email still fires — an inconsistent, confusing gap. Both must insert an `admin_notifications` row.

**Required fix at call site 3**: `store/src/app/api/requests/cancel/route.ts:27`'s order select currently omits `id` (`select('order_status, created_at, customer_email, customer_name')`) — must add `id` before this call site can populate `order_id`.

## `YoyWidget` — no new persisted entity

Purely derived, no schema. Computed client-side (in `AnalyticsClient.tsx` / the new `YoyWidget.tsx`) from the `ordersForYoY` prop (a 24-month superset of `orders`, fetched server-side in `admin/analytics/page.tsx`):

- **Current period**: trailing 12 months from today, bucketed by `YYYY-MM`.
- **Prior period**: the 12 months before that.
- **Eligibility**: `earliest order in ordersForYoY <= 24 months ago` → full comparison renders; otherwise the "insufficient history" collapsed state renders (FR-005).
- **Metric**: `revenue` (sum of order totals per bucket) for the Revenue tab widget, `units` (sum of order-item quantities per bucket) for the Performance tab widget — two instances of the same `YoyWidget` component, differing only by metric key and tab placement.
