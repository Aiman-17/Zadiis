# Sprint 3 Design — Payments, Emails, Safepay, Contact Routing
**Date:** 2026-06-20  
**Project:** ZADIIS Pakistani Women's Fashion Store  
**Stack:** Next.js 16.2.7, Supabase, Resend, Safepay, Cloudflare

---

## 1. Scope

### In Scope
- Safepay payment gateway (card, JazzCash, Easypaisa) — sandbox first, production later
- COD flow unchanged (order placed directly, auto-paid on delivery)
- Admin Payments management page (`/admin/payments`)
- Dashboard revenue based on `payment_status = 'paid'` only
- Email notifications via Resend — 3 to customer, 2 to owner
- Cloudflare Email Routing setup for receiving at info@ and support@
- Resend domain verification for sending from orders@zadiis.com.pk

### Out of Scope
- Safepay production merchant account activation (separate step after testing)
- SMS notifications
- Customer login / account portal
- Refund / chargeback UI

### External Dependencies
| Service | Purpose | Owner |
|---|---|---|
| Safepay | Payment processing (sandbox → production) | User |
| Resend | Transactional email sending | User |
| Cloudflare | DNS + Email Routing for zadiis.com.pk | User |
| Supabase | Database | User |
| Vercel | Hosting + env vars | User |

---

## 2. JazzCash & Easypaisa — How Money Reaches You

JazzCash and Easypaisa are payment **methods** offered inside Safepay's hosted checkout page. When a customer selects JazzCash on your checkout, Safepay's page collects the OTP and processes the payment. The money flow is:

```
Customer → Safepay → Your registered bank account (T+2 settlement)
```

You do **not** need a separate JazzCash or Easypaisa merchant account. Safepay handles both. What you need:
- Safepay merchant account (CNIC + bank account + business details — done at production stage)
- Sandbox: payments are simulated, no real money moves

**Your own JazzCash/Easypaisa number** is only used as a manual backup (see Section 2.3 below). Store these in Admin Settings so they appear in fallback instructions.

---

## 3. Payment Architecture

### Rule: Webhook Is the Source of Truth
**Never mark an order as paid based on a frontend response.** A user can close the browser, cancel, or spoof a success callback. The only authoritative signal is Safepay's signed webhook.

### Online Payment Flow (card / JazzCash / Easypaisa)

```
Customer fills checkout form
  → Clicks "Place Order"
  → POST /api/payments/tracker
      • Validates form fields + stock
      • Inserts order with payment_status = 'pending'
      • Calls Safepay API to create tracker
      • Returns { orderId, trackerToken, checkoutUrl }
  → Frontend redirects to Safepay hosted checkout page
  → Customer completes payment on Safepay's page
  → Safepay redirects back to /order/[id]?payment=pending
  → Safepay fires POST /api/webhooks/safepay (async, within seconds)
      • Verifies HMAC-SHA256 signature using SAFEPAY_SECRET_KEY
      • Updates order: payment_status = 'paid', safepay_transaction_id = ...
      • Sends Customer "Payment Confirmed" email
      • Sends Owner "Payment Received" email
  → /order/[id] page shows live payment status (polls or refreshes)
```

### 3.2 Safepay Downtime — Fallback Flow

When the tracker creation call fails (Safepay is down, timeout, or 5xx error):

```
Customer clicks "Place Order" (card/JazzCash/Easypaisa selected)
  → POST /api/payments/tracker
  → Safepay API call fails (network error or 5xx)
  → Return { error: 'GATEWAY_DOWN' } to frontend
  → Checkout page shows:

    ┌─────────────────────────────────────────────┐
    │ ⚠ Online payment is temporarily unavailable │
    │                                             │
    │ You can:                                    │
    │  [Continue with Cash on Delivery]           │
    │  [Pay manually via JazzCash / Easypaisa]    │
    │  [Try again]                                │
    └─────────────────────────────────────────────┘

Option A — Continue with COD:
  → Re-submits form with payment_method = 'cod'
  → Normal COD order flow

Option B — Pay manually (JazzCash / Easypaisa):
  → Shows owner's registered JazzCash or Easypaisa number (from store settings)
  → "Send PKR {total} to JazzCash: 03XX-XXXXXXX — include your name"
  → "Screenshot your payment and WhatsApp it to us"
  → Order is placed with payment_status = 'pending', payment_method = 'jazzcash'/'easypaisa'
  → Admin manually verifies via WhatsApp → marks paid from Payments page

Option C — Try again:
  → Dismisses error, re-enables submit button
```

**Owner's manual payment numbers stored in:** `store_settings` table
- Key: `jazzcash_number` → owner's JazzCash number (e.g., `03001234567`)
- Key: `easypaisa_number` → owner's Easypaisa number
- Editable from Admin Settings page (add two new fields)

### COD Flow (unchanged)

```
Customer fills checkout form
  → Clicks "Place Order"
  → POST /api/orders (existing)
      • Validates fields + stock
      • Inserts order with payment_status = 'pending'
      • Sends Customer "Order Placed" email
      • Sends Owner "New Order" email
  → Redirects to /order/[id]
  
Admin marks order_status = 'delivered'
  → payment_status auto-sets to 'paid' (cash collected at door)
  → Sends Customer "Order Delivered" email
  → Sends Owner "Payment Received" email
```

### Safepay API Details (Sandbox)
- Create tracker: `POST https://sandbox.api.getsafepay.com/order/v1/init`
- Auth header: `X-SFPY-MERCHANT-SECRET: {SAFEPAY_API_KEY}`
- Request body: `{ amount: totalInPaisa, currency: "PKR", intent: "CYBERSOURCE" }`
- Response: `{ data: { tracker: { token: "TRK-..." } } }`
- Hosted checkout: `https://sandbox.payments.getsafepay.com/checkout?tracker=TOKEN&source=checkout&environment=sandbox`
- Production URL: `https://api.getsafepay.com` / `https://payments.getsafepay.com`
- Webhook signature: HMAC-SHA256 of request body using SAFEPAY_SECRET_KEY

> **Note:** Verify exact API field names against Safepay's official dashboard/docs before implementation. The tracker creation endpoint and amount format (paise vs rupees) must be confirmed.

---

## 3. Email System

### Resend Setup
- **Sending domain:** `orders@zadiis.com.pk`
- **DNS records to add in Cloudflare** (provided by Resend dashboard after adding domain):
  - SPF TXT record
  - DKIM TXT record  
  - DMARC TXT record (optional but recommended)
- **Env var:** `RESEND_API_KEY` — already in `.env.local`
- **Owner email:** `OWNER_EMAIL=zadiisfashion@gmail.com` — already set

### Email Triggers

| Event | Customer receives | Owner receives |
|---|---|---|
| Any order placed (COD or online) | "Order Placed" | "New Order" |
| Safepay webhook confirms payment | "Payment Confirmed" | "Payment Received" |
| Admin marks `order_status = 'delivered'` | "Order Delivered" | — |
| COD order marked `delivered` | "Order Delivered" | "Payment Received" (cash collected) |

### Email Templates (ZADIIS branding)

All templates use:
- Font: Playfair Display for headings (via Google Fonts link)
- Colors: `#FAF8F5` background, `#1C1C1C` text, `#A68B6E` accent, `#E8DDD4` borders
- Logo: ZADIIS wordmark (text-based if image not available)
- Footer: "ZADIIS — Authentic Pakistani Fashion | zadiis.com.pk"

**Email 1 — Order Placed (to customer)**
Subject: `Your order {order_number} has been placed — ZADIIS`
Body: Order number, items list (name, size, color, qty, price), subtotal, delivery charge, total, payment method, delivery address, "We'll notify you once it ships."

**Email 2 — Payment Confirmed (to customer, online orders only)**
Subject: `Payment confirmed for order {order_number} — ZADIIS`
Body: Confirmation that payment was received, order number, amount paid, "We're now preparing your order."

**Email 3 — Order Delivered (to customer)**
Subject: `Your order {order_number} has been delivered — ZADIIS`
Body: "Your order has arrived!", order summary, "We hope you love it! Share your review at zadiis.com.pk", WhatsApp support link.

**Email 4 — New Order (to owner)**
Subject: `New order {order_number} — {payment_method} — PKR {total}`
Body: All order details (customer name, phone, email, address, city, items, total, payment method, payment status).

**Email 5 — Payment Received (to owner)**
Subject: `Payment received — {order_number} — PKR {total}`
Body: Order number, customer, payment method (Safepay/COD), transaction ID (if Safepay), amount.

---

## 4. Admin Payments Page (`/admin/payments`)

### Layout
- Nav item: "Payments" (between Orders and Settings)
- Filter tabs: **All | Pending | Paid**
- Table columns: Order # | Customer | Amount | Method | Payment Status | Date | Action

### Behavior by payment method
| Method | Pending row shows | Paid row shows |
|---|---|---|
| JazzCash / Easypaisa / Card (Safepay) | "Awaiting Safepay webhook" badge | Transaction ID + "Paid via Safepay" |
| COD | "Cash on Delivery — collect on delivery" | "Paid (COD — delivered)" |
| Manual override (any) | "Mark Paid" button | "Paid (manual)" |

### Manual Override
Admin can mark any pending order as paid manually — for cases where Safepay webhook failed or WhatsApp screenshot verified. Clicking "Mark Paid" updates `payment_status = 'paid'` via existing orders API.

### Dashboard Changes
- "This Month Revenue" card: counts `payment_status = 'paid'` orders only
- Add small sub-label: "Pending: PKR X" for unconfirmed revenue
- Monthly revenue bar chart: uses paid orders only
- Yearly revenue line chart: uses paid orders only

---

## 5. Cloudflare Email Routing (Receiving)

This is **dashboard configuration only** — no code changes.

### Setup Steps (Cloudflare Dashboard)
1. Go to **Email → Email Routing** for `zadiis.com.pk`
2. Enable Email Routing (adds required MX records automatically)
3. Add destination address: `zadiisfashion@gmail.com` (verify via email)
4. Add routing rule: `info@zadiis.com.pk` → `zadiisfashion@gmail.com`
5. Add routing rule: `support@zadiis.com.pk` → `zadiisfashion@gmail.com`
6. Use **specific address rules** (not catch-all) for reliability

> Previous issue with catch-all: specific rules are processed before catch-all and are more reliable. Do not enable catch-all.

---

## 6. Database Migration (Sprint 3)

```sql
-- sprint3.sql — run in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS safepay_tracker text,
  ADD COLUMN IF NOT EXISTS safepay_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;
```

---

## 7. New Files

| File | Purpose |
|---|---|
| `store/src/app/api/payments/tracker/route.ts` | POST: validate fields, insert pending order, create Safepay tracker, return checkout URL |
| `store/src/app/api/webhooks/safepay/route.ts` | POST: verify HMAC, mark order paid, trigger emails |
| `store/src/app/admin/payments/page.tsx` | Admin payments list with filter tabs |
| `store/src/lib/email.ts` | All Resend send functions (5 email types) |
| `store/supabase/sprint3.sql` | DB migration |

## 8. Modified Files

| File | Change |
|---|---|
| `store/src/app/(store)/checkout/page.tsx` | For online: POST to `/api/payments/tracker`, redirect to Safepay URL. COD: unchanged. |
| `store/src/app/api/orders/route.ts` | After COD order insert: send "Order Placed" + "New Order" emails |
| `store/src/app/api/admin/orders/route.ts` | PUT: when order_status→delivered + COD → set payment_status=paid + send emails |
| `store/src/app/admin/layout.tsx` | Add "Payments" nav item |
| `store/src/app/admin/page.tsx` | Filter allOrders to `payment_status = 'paid'` for revenue stats |
| `store/src/components/admin/DashboardCharts.tsx` | Filter orders prop to paid-only for revenue calculations |
| `store/src/app/admin/orders/page.tsx` | Show payment_status badge on each order row |
| `store/src/types/index.ts` | Add `safepay_tracker?`, `safepay_transaction_id?`, `payment_verified_at?` to Order type |
| `.env.local` + Vercel env | Update `NEXT_PUBLIC_APP_URL` to `https://zadiis.com.pk`, `NEXT_PUBLIC_WHATSAPP_NUMBER` to real number, add `SAFEPAY_WEBHOOK_SECRET` |

---

## 9. Environment Variables

| Variable | Value | Where |
|---|---|---|
| `RESEND_API_KEY` | Already set | `.env.local` + Vercel |
| `OWNER_EMAIL` | `zadiisfashion@gmail.com` | Already set |
| `SAFEPAY_API_KEY` | Already set (sandbox) | `.env.local` + Vercel |
| `SAFEPAY_SECRET_KEY` | Already set | `.env.local` + Vercel |
| `NEXT_PUBLIC_SAFEPAY_ENV` | `sandbox` → `production` when ready | `.env.local` + Vercel |
| `NEXT_PUBLIC_APP_URL` | Change to `https://zadiis.com.pk` | Vercel only |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Real number | Vercel |

---

## 10. Non-Goals & Risks

| Risk | Mitigation |
|---|---|
| Safepay API shape differs from assumed | Verify tracker endpoint + amount format against Safepay docs before coding |
| Webhook arrives before frontend redirect | Order page polls `/api/orders/[id]` for payment_status; shows "confirming payment…" |
| customer_email is optional | All customer emails are no-ops if email is null; never crash |
| Resend domain verification delays | Use `onboarding@resend.dev` as fallback during testing |
| Cloudflare routing not delivering | Use specific rules (not catch-all); test by sending to info@ manually |

---

## 11. Definition of Done

- [ ] Safepay hosted checkout opens when card/JazzCash/Easypaisa selected
- [ ] Order inserted with `payment_status = 'pending'` before Safepay redirects
- [ ] Webhook verifies signature and marks order paid
- [ ] COD order auto-marks paid on delivery
- [ ] When Safepay is down: fallback error shows COD + manual pay + retry options
- [ ] Manual JazzCash/Easypaisa numbers show correct number from store settings
- [ ] Customer receives all 3 emails (placed, confirmed, delivered)
- [ ] Owner receives new order + payment received emails
- [ ] Admin Payments page shows pending/paid orders with filter tabs
- [ ] Dashboard revenue shows paid orders only
- [ ] Admin Settings has JazzCash number + Easypaisa number fields
- [ ] info@ and support@ forwarding verified in Gmail
- [ ] Resend domain DNS records verified (green in Resend dashboard)
