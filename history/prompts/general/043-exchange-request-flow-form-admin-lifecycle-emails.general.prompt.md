---
id: 043
title: Exchange Request Flow Form Admin Lifecycle Emails
stage: green
date: 2026-06-25
surface: agent
model: claude-sonnet-4-6
feature: exchange-request-flow
branch: main
user: Aiman-17
command: implementation
labels: ["exchange","returns","admin-orders","email","lifecycle","form"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/supabase/exchange-columns.sql
  - store/src/lib/email.ts
  - store/src/app/api/admin/requests/route.ts
  - store/src/app/api/requests/return/route.ts
  - store/src/components/store/ReturnRequestForm.tsx
  - store/src/app/admin/orders/page.tsx
tests:
  - Exchange form toggle: Return vs Exchange radio — verified Exchange hides reason radios, shows "What would you like instead?" field
  - Submit exchange request (ZD-1025) — "Exchange Request Received" confirmation shown
  - Admin Returns tab — EXCHANGE REQUEST card (purple) shows with customer name, email, exchange_details, Mark Shipped button
  - Mark Shipped — "Shipped" badge appears on card, button changes to "Mark Delivered", shipped email sent to customer
  - Mark Delivered — card auto-disappears, tab count drops (2→1), delivered email sent, request auto-resolved in DB
---

## Prompt

User asked: what if customer wants to exchange (same product but different color or size) and buy different product.

Then clarified:
- Same product exchange (size/color): goes through the return form with a new Exchange option. Admin ships replacement → customer gets shipped email (2–3 business days processing, 3–4 business days delivery). Status tracked: pending → shipped → delivered. Profit/history untouched.
- Different product: customer uses existing return flow + places new order separately. Nothing new needed.
- No refund option anywhere — customers contact WhatsApp for that.
- Shipped email must mention "2–3 business days processing, receive in 3–4 business days" — professional tone.

## Response snapshot

**6 files changed** (commit `694faca`):

**DB migration** (`store/supabase/exchange-columns.sql`):
Added 3 columns to `return_requests`:
- `request_type` text NOT NULL DEFAULT 'return' CHECK IN ('return','exchange')
- `exchange_details` text
- `exchange_status` text CHECK IN ('pending','shipped','delivered')

**ReturnRequestForm** — new "Request Type" radio toggle at top:
- Return my item → shows existing reason radios
- Exchange for a different size or color (same product) → hides reasons, shows "What would you like instead?" textarea (required)
- Submit button text changes: "Submit Return Request" / "Submit Exchange Request"
- Success message differs per type

**Return API** (`/api/requests/return`):
- Added 'exchange' to VALID_REASONS
- Accepts `request_type` and `exchange_details`
- Exchange path: inserts with request_type='exchange', sends sendOwnerExchangeRequest + sendCustomerExchangeConfirmation
- Return path: unchanged

**Admin requests API** (`/api/admin/requests` PATCH):
- New `action` param: 'shipped' | 'delivered' (default = resolve/dismiss)
- shipped: updates exchange_status='shipped', fires sendCustomerExchangeShipped
- delivered: updates exchange_status='delivered' + status='resolved', fires sendCustomerExchangeDelivered (auto-resolves → disappears from tab)

**4 new email functions** in `email.ts`:
- `sendOwnerExchangeRequest` — owner notified when customer submits exchange
- `sendCustomerExchangeConfirmation` — customer confirmation on submit
- `sendCustomerExchangeShipped` — "2–3 business days processing, 3–4 business days delivery" shipped notification
- `sendCustomerExchangeDelivered` — delivered confirmation

**Admin orders page** — exchange request cards:
- Purple left border + purple EXCHANGE REQUEST badge (vs blue for returns, amber for cancellations)
- Shows `exchange_details` as "Wants: …"
- exchange_status === 'pending': "Mark Shipped" (purple button)
- exchange_status === 'shipped': "Shipped" badge + "Mark Delivered" (green button)
- "Dismiss" always available

## Outcome

- ✅ Impact: Full exchange lifecycle live — customer form → admin card → Mark Shipped (email) → Mark Delivered (email + auto-resolve)
- 🧪 Tests: All 5 steps browser-tested end-to-end; exchange card disappeared after Mark Delivered confirming DB auto-resolve
- 📁 Files: 6 files modified/created, committed `694faca`, pushed to main
- 🔁 Next prompts: Could add stock decrement on Mark Shipped if needed; exchange analytics tracking
- 🧠 Reflection: Keeping exchange in return_requests table (with request_type column) avoided a new table and kept admin UI unified in the Returns tab

## Evaluation notes (flywheel)

- Failure modes observed: None — SQL columns deployed cleanly, all API paths exercised
- Graders run and results (PASS/FAIL): Browser end-to-end test PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Auto-decrement stock for replacement variant when admin clicks Mark Shipped
