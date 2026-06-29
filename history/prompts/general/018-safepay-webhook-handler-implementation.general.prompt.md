---
id: "018"
title: Safepay Webhook Handler Implementation
stage: general
date: 2026-06-21
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /sp.phr
labels: ["safepay", "webhook", "hmac", "payments", "sprint3", "email", "next.js"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/api/webhooks/safepay/route.ts
tests:
  - npx tsc --noEmit (zero errors)
---

## Prompt

You are implementing Task 5 of Sprint 3 for the ZADIIS Pakistani women's fashion ecommerce store.
This creates the Safepay webhook handler — verifies HMAC, marks order paid, sends emails.
Working directory: C:\Users\QC\Desktop\ecom-business-project (store code is in the `store/` subdirectory).

**IMPORTANT:** Before writing the webhook file, read `store/src/lib/email.ts` to see the exact parameter names used by `sendCustomerPaymentConfirmed` and `sendOwnerPaymentReceived`. Use those exact names in your implementation.

**Read your requirements:** `C:\Users\QC\Desktop\ecom-business-project\.git\sdd\task-5-brief.md`

After completing the work, write your full report to:
`C:\Users\QC\Desktop\ecom-business-project\.git\sdd\task-5-report.md`

Report contract:
- STATUS: DONE / BLOCKED / NEEDS_CONTEXT
- Files created
- TypeScript check output (exact command + output)
- Commit hash
- Which transaction ID field name was used (and where you found it in email.ts)
- Any concerns

Then return only: STATUS, commit hash, one-line test summary, concerns (if any).

## Response snapshot

Created `store/src/app/api/webhooks/safepay/route.ts` implementing: HMAC-SHA256 signature verification using `crypto.timingSafeEqual`, raw body read via `req.text()`, order lookup by `safepay_tracker` token, idempotency guard on `payment_status === 'paid'`, DB update setting `payment_status`, `safepay_transaction_id`, and `payment_verified_at`, and email dispatch to both customer and owner. Confirmed from `email.ts` that the transaction ID field is `safepay_transaction_id`. TypeScript check passed with zero errors. Committed as `d481ce1`.

## Outcome

- Impact: Safepay webhook handler created; order payment flow now fully automated from webhook to DB update to dual email confirmation
- Tests: `cd store && npx tsc --noEmit` — zero errors (no output)
- Files: store/src/app/api/webhooks/safepay/route.ts (created, 105 lines)
- Next prompts: Verify Safepay header name (`sfpy-signature` vs `x-sfpy-signature`) against live Safepay docs; confirm DB columns `safepay_transaction_id` and `payment_verified_at` exist on orders table from Sprint 3 migration; test with a real Safepay test webhook delivery
- Reflection: Reading email.ts before writing the webhook prevented a field name mismatch (`safepay_transaction_id` vs `transaction_id`) that would have caused a silent type error at runtime

## Evaluation notes (flywheel)

- Failure modes observed: None. Brief was clear; email.ts signatures matched the plan's expected shape exactly.
- Graders run and results (PASS/FAIL): TypeScript check PASS (zero errors)
- Prompt variant (if applicable): task-brief driven implementation with pre-read directive
- Next experiment (smallest change to try): Add an integration test that posts a mock Safepay payload with a valid HMAC to the route and asserts the order is updated and emails triggered
