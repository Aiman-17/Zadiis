# API Contract: `/api/admin/notifications`

New route, `store/src/app/api/admin/notifications/route.ts`. Follows the same `supabaseAdmin`, service-role, no-auth-middleware pattern as every existing admin API route in this codebase (e.g. `store/src/app/api/admin/orders/route.ts`, `store/src/app/api/admin/settings/route.ts`).

## `GET /api/admin/notifications`

Returns active (non-archived) notifications, newest first, plus the unread count.

**Query params**: none required. Optional `?includeArchived=true` to also return archived rows (for a future "view archived" affordance — not required by FR-001/FR-002a's acceptance criteria, but cheap to support from day one since it's the same query with one filter removed).

**Response 200**:
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "payment_received",
      "order_id": "uuid",
      "order_number": "string",
      "message": "string",
      "created_at": "ISO timestamp",
      "read_at": "ISO timestamp | null",
      "archived_at": "ISO timestamp | null"
    }
  ],
  "unreadCount": 0
}
```

`order_number` is joined in server-side (not stored redundantly on `admin_notifications`) so the notification list can link to `/admin/orders?search=<order_number>` without a second client-side fetch — mirrors how `store/src/app/api/admin/requests/route.ts` already joins order context for cancellation/return requests.

## `PATCH /api/admin/notifications`

Marks notification(s) as read.

**Body**: `{ "id": "uuid" }` to mark one, or `{ "all": true }` to mark every currently-unread notification as read (used when the merchant opens the bell/notifications page — mirrors the existing `clearNotifications()` UX pattern in `admin/layout.tsx:60-63`, but persisted to the DB instead of just local component state).

**Response 200**: `{ "success": true }`

## `PUT /api/admin/notifications`

Archives a notification (soft, recoverable — sets `archived_at`).

**Body**: `{ "id": "uuid", "action": "archive" }` or `{ "id": "uuid", "action": "restore" }` (clears `archived_at`) — mirrors the existing Archive/Restore pair already used for Products/Orders/Payments.

**Response 200**: `{ "success": true }`

## `DELETE /api/admin/notifications`

Permanently deletes a notification row (hard delete, irreversible).

**Body**: `{ "id": "uuid" }`

**Response 200**: `{ "success": true }`

**Client-side requirement**: the calling UI (`NotificationsClient.tsx`) MUST show a `confirm()` dialog before calling this endpoint, matching the existing irreversible-delete convention used in `store/src/app/admin/invoices/page.tsx` ("Delete this invoice record permanently?") and `store/src/app/admin/payments/page.tsx` ("Permanently DELETE ORDER...? Cannot be undone."). This is a functional requirement (FR-002a), not just a UI nicety — the API route itself performs no confirmation, so the client MUST gate the call.

## Unread-count consumer: `admin/layout.tsx`

The existing polling `check()` function (lines 26-58) is extended to also `GET /api/admin/notifications` (or a lighter `?countOnly=true` variant, decided during `/sp.tasks` based on actual payload size) every 30s, setting a new `notifCount` state from the response's `unreadCount` — a direct read of current DB state, **not** the diff-based pattern the existing `newOrders` badge uses (see `research.md` Decision 3 for why these are deliberately different models).
