# Research: E2E Test Suite — 001-e2e-test-suite

**Date**: 2026-07-01  
**Branch**: `001-e2e-test-suite`

---

## 1. Actual Store Routes (from filesystem)

| Route | File | Notes |
|---|---|---|
| `/` | `(store)/page.tsx` | Homepage — already tested |
| `/shop` | `(store)/shop/page.tsx` | Shop — already tested |
| `/shop/[slug]` | `(store)/shop/[slug]/page.tsx` | Product detail — already tested |
| `/cart` | `(store)/cart/page.tsx` | Cart — already tested |
| `/checkout` | `(store)/checkout/page.tsx` | Checkout — already tested (COD) |
| `/order/[id]` | `(store)/order/[id]/page.tsx` | Order confirmation page (NOT `/order-confirmation`) |
| `/cancel-order` | `(store)/cancel-order/page.tsx` | Customer cancellation page |
| `/returns` | `(store)/returns/page.tsx` | Customer returns page |
| `/sale` | `(store)/sale/page.tsx` | Sale page |

**Finding:** Order confirmation URL is `/order/[id]` (UUID), NOT `/order-confirmation`. Tests must navigate to this URL after order placement. No separate order-tracking page exists — tracking is via `/order/[id]`.

---

## 2. Actual Admin Routes (from filesystem)

| Route | Status | Notes |
|---|---|---|
| `/admin` | ✅ exists | Dashboard — already tested |
| `/admin/login` | ✅ exists | Auth — already tested |
| `/admin/analytics` | ✅ exists | Analytics — NOT tested |
| `/admin/cod` | ✅ exists | COD management — already tested |
| `/admin/invoices` | ✅ exists | Invoices — NOT tested |
| `/admin/orders` | ✅ exists | Orders — already tested |
| `/admin/payments` | ✅ exists | Payments — shallow test only |
| `/admin/products` | ✅ exists | Products — already tested |
| `/admin/sales` | ✅ exists | Sales/discounts — NOT tested |
| `/admin/settings` | ✅ exists | Settings — NOT tested |

**NOT implemented (no directory exists):**
- `/admin/categories` — no directory
- `/admin/customers` — no directory  
- `/admin/inventory` — no directory (inventory managed per product in `/admin/products/[id]/edit`)
- `/admin/returns` — no directory (returns managed within `/admin/orders`)
- `/admin/shipping` — no directory (delivery zones in `/admin/settings`)

**Scope adjustment:** Stories 8–10, 12 must be re-scoped to the actual pages:
- Inventory → test within `/admin/products/[id]/edit`
- Returns → test within `/admin/orders`
- Shipping/delivery zones → test within `/admin/settings`
- Categories → **not implemented**, skip
- Customers → **not implemented**, skip

---

## 3. OTP Flow (from `api/otp/send/route.ts` + `api/otp/verify/route.ts`)

- **Table**: `email_otps` (email, otp, expires_at)
- **Code**: 6-digit numeric string
- **Expiry**: 10 minutes (`expires_at = now + 10 * 60_000`)
- **Rate limit**: 1 OTP per 60 seconds per email
- **Resend**: deletes existing OTPs for email, creates new one
- **Test approach**: 
  - Use `page.route('/api/otp/send', ...)` to intercept and capture the OTP from DB
  - OR use Supabase MCP to read `email_otps` table after send
  - Correct approach: `page.route()` to mock OTP send response, set a fixed OTP via Supabase directly for deterministic testing

---

## 4. Safepay Payment Flow (from `api/webhooks/safepay/route.ts`, `api/payments/tracker/route.ts`)

- **Redirect**: checkout form submits → `POST /api/payments/tracker` → creates pending order → returns Safepay redirect URL
- **Safepay hosted page**: customer pays → Safepay fires `POST /api/webhooks/safepay`
- **Webhook signature**: `sfpy-signature` header, HMAC-SHA256 with `SAFEPAY_SECRET_KEY`
- **Idempotency**: webhook checks for existing paid order before updating
- **Test approach**:
  - Safepay redirect: fill checkout form, intercept network, verify redirect to Safepay URL pattern
  - Webhook: call `/api/webhooks/safepay` directly with a crafted payload (using `page.request.post`)
  - Cannot test full round-trip without real Safepay sandbox — skip if `SAFEPAY_SECRET_KEY` absent
  - Mock approach: `page.route('/api/payments/tracker', ...)` for unit-style E2E

---

## 5. Order Confirmation Page (from `order/[id]/page.tsx`)

- **Route**: `/order/[id]` where `id` is the Supabase UUID of the order
- **Data**: fetches from `orders` table by `id`
- **Shows**: customer name, order number (ZD-XXXX), items, payment method, status
- **PaymentVerifier component**: polls for Safepay payment status on load
- **Test approach**: After COD order placement, capture redirect URL → assert `/order/[id]` pattern → verify order number visible

---

## 6. Returns & Cancellations (from `cancel-order/page.tsx`, `returns/page.tsx`)

- **Cancel order**: `/cancel-order` — customer enters order number, selects reason
- **Returns**: `/returns` — customer enters order number, selects reason, uploads (optional)
- **APIs**: `POST /api/requests/cancel`, `POST /api/requests/return`
- **Test approach**: navigate to page, fill form with valid ZD-XXXX number, submit, verify success state

---

## 7. Analytics Page (from `admin/analytics/page.tsx`)

- **Route**: `/admin/analytics`
- **Tabs**: multiple analytics views (revenue, orders, products, customers)
- **Test approach**: navigate to page as authenticated admin, check tabs render, check charts visible, no console errors

---

## 8. Playwright Approach for OTP Testing (Decision)

**Decision**: Use `page.route()` to intercept `/api/otp/send` and return a fixed mock OTP code. Then use that known code to fill the OTP modal.

**Rationale**: We cannot read from real Supabase in tests without service role key. Mocking only the email send (not the DB write) means the OTP modal interaction is still real — we're testing the UI flow, not the email delivery.

**Alternative rejected**: Full real OTP with Supabase MCP — too fragile, timing-dependent.

---

## 9. Admin Invoices Page

- Exists at `/admin/invoices` — NOT in original test coverage list but discovered in codebase
- Add basic smoke test to `admin/orders.spec.ts` or new `admin/invoices.spec.ts`

---

## 10. Revised Spec Scope (after research)

| Story | Original | Revised |
|---|---|---|
| 1 Safepay | `/checkout` → Safepay redirect | Same — use `page.route()` mock for full flow |
| 2 OTP | OTP modal + verification | Same — mock `/api/otp/send`, use known code |
| 3 Order Tracking | `/order-tracking` | Revised: `/order/[id]` is the confirmation/tracking page |
| 4 Returns | `/returns` + `/cancel-order` | Same — both pages exist |
| 5 Analytics | `/admin/analytics` | Same |
| 6 Payments deep | `/admin/payments` | Same |
| 7 Admin Returns | `/admin/returns` | Revised: returns managed in `/admin/orders` |
| 8 Inventory | `/admin/inventory` | Revised: test in product edit page |
| 9 Categories | `/admin/categories` | **Removed** — page not implemented |
| 10 Customers | `/admin/customers` | **Removed** — page not implemented |
| 11 Discounts | `/admin/sales` | Same — page exists |
| 12 Shipping | `/admin/shipping` | Revised: test in `/admin/settings` |
| 13 Settings | `/admin/settings` | Same |
| + Invoices | Not in spec | Add basic smoke test |

**Net spec files to create: 10** (down from 13 after removing categories + customers, merging returns into orders)
