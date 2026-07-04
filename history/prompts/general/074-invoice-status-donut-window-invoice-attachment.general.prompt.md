---
id: 074
title: Invoice status fix, donut window, invoice attachment
stage: green
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["invoices", "dashboard", "email", "cod", "safepay"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/app/admin/invoices/[id]/print/page.tsx
 - store/src/components/admin/DashboardCharts.tsx
 - store/src/lib/email.ts
tests:
 - typecheck: npx tsc --noEmit (clean, twice — before and after the base64 fix)
 - build: npm run build (clean, twice)
 - manual: printed invoice for a pending COD order via admin UI — confirmed "PENDING" now shows instead of hardcoded "PAID"
 - manual sandbox webhook test (attempt 1, pre-fix) — inserted isolated test order directly via Supabase REST (no stock/owner-email side effects), POSTed a correctly HMAC-signed payload to /api/webhooks/safepay, confirmed order flipped paid + invoice INV-1043 generated + email delivered to aurex707@gmail.com, but downloaded the actual attachment from Resend's API and found it was 22 bytes of garbled binary — content wasn't base64-encoded before being handed to Resend
 - manual sandbox webhook test (attempt 2, post-fix) — repeated with a second isolated test order (ZD-VERIFY2), attachment INV-1044.html downloaded as 4000 bytes containing the correct full invoice HTML (right invoice number, order, line items, totals, transaction ID)
 - cleanup: deleted both test orders (ZD-VERIFY1, ZD-VERIFY2) and their invoice rows from Supabase after verification
---

## Prompt

> yes fix status bug. for online paid order dont need to manuallychange status, So make it automatic but for cod orders when staus email trigger deliver to usser the exact time auto change the status od cpd orders paid and also invoices.
> Same exact automatic flow works with order staus all status are for manual but the deliver is end so auto change status deliverd when customer recieve deliver email.this works with dashboard donut pie and order page, the pie is showing the dynamic data but for deliver order at which time does delivers order shows in breakdown of pie 1 month or 15 days.
> Dont write a code first make specifications but tell your understanding before

(Clarifying questions asked and answered: COD auto-trigger — user confirmed the existing one-click "Delivered" cascade is fine, and asked whether Leopards Courier's merchant API would provide booking/tracking endpoints once an account is opened — answered via web search, no account yet so out of scope for now. Donut window — user chose "Last 30 days".)

> yes so right now I need to change status manually (when I will not create an account oon leopards or other service but before launching or 5 to 7 days I needto add endpoints)

> also attache an invoice with online payment email confirmation(not for cods)

(Clarifying question: HTML file attachment vs. real PDF requiring a new dependency — user chose HTML file attachment.)

> yes fire sandbox level verification

> on aurex email

> yes and create phr

## Response snapshot

Delivered three changes, all confirmed against the actual running app (not just typecheck):

1. **Invoice print status bug** (`admin/invoices/[id]/print/page.tsx`) — was hardcoding `Status: PAID` regardless of the order's real `payment_status`. Now shows the real status with the same color convention used elsewhere in admin (paid=green, failed=red, else amber). Verified live: a pending COD invoice now prints "PENDING".

2. **Dashboard donut window** (`DashboardCharts.tsx`) — "Order Status Breakdown" previously counted ALL non-archived orders since the store's inception with no time window. Changed to last 30 days (reusing the existing `isWithinDays` helper) per user's choice, with "(Last 30 Days)" added to the heading so the window is no longer ambiguous.

3. **Invoice attached to online-payment confirmation email** (`lib/email.ts`) — added `buildInvoiceDocument()`, a standalone HTML invoice document, attached as `{invoice_number}.html` on `sendCustomerPaymentConfirmed` (the only two callers are the Safepay webhook and the redirect-verify fallback — both online-payment-only paths; COD's delivery email is a separate function untouched by this change, per the user's explicit "not for cods").

Also discussed and deliberately left unchanged, per user confirmation: COD/order-status auto-cascade already exists as a single admin click (no code change needed); Leopards Courier does offer a merchant booking/tracking API (poll-based; webhook support appears to come from third-party tracking aggregators, not confirmed as native to Leopards) but that integration is explicitly out of scope until an account exists closer to launch.

Sandbox verification (user-authorized, scoped to this one action) caught a real bug that code review and typecheck missed: Resend's attachment API expects string `content` to be pre-encoded as base64. The first live test showed a 22-byte garbled attachment; fixed with `Buffer.from(html, 'utf-8').toString('base64')`, rebuilt, and re-verified with a second isolated test order — the attachment now downloads as the correct, complete invoice HTML.

## Outcome

- ✅ Impact: invoice print now reflects real payment status; dashboard order-status donut has a defined, correct 30-day window; online-payment customers now receive their invoice as an actual file attachment, and a real encoding bug in that new path was caught and fixed before shipping.
- 🧪 Tests: typecheck + build clean (twice); live admin UI check for the print fix; two full sandbox webhook round-trips (isolated Supabase test orders, signed HMAC payloads, Resend API attachment inspection) for the email attachment, including catching and re-verifying a real bug.
- 📁 Files: store/src/app/admin/invoices/[id]/print/page.tsx, store/src/components/admin/DashboardCharts.tsx, store/src/lib/email.ts
- 🔁 Next prompts: Leopards Courier integration (booking + tracking, likely a new cron route polling shipment status) once a merchant account exists, 5–7 days before launch per user
- 🧠 Reflection: the sandbox verification the user asked for wasn't redundant with typecheck/build — it caught an encoding bug (raw string vs. base64) that no amount of static analysis would have surfaced, since the TS type for attachment content (`string | Buffer`) is satisfied either way.

## Evaluation notes (flywheel)

- Failure modes observed: Resend attachment `content` silently accepts a non-base64 string and produces garbled output rather than erroring — worth remembering for any future Resend attachment work.
- Graders run and results (PASS/FAIL): sandbox webhook round-trip — FAIL on first attempt (garbled attachment), PASS on second attempt after the base64 fix.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
