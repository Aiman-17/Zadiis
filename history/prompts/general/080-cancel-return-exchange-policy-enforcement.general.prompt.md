---
id: 080
title: Cancel/return/exchange policy enforcement
stage: green
date: 2026-07-05
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["cancel", "return", "exchange", "policy", "orders"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - supabase/migrations/2026-07-04-add-delivered-at.sql
 - store/src/types/index.ts
 - store/src/app/api/admin/orders/route.ts
 - store/src/app/api/requests/cancel/route.ts
 - store/src/app/api/requests/return/route.ts
 - store/src/app/(store)/cancel-order/page.tsx
 - store/src/components/store/ReturnRequestForm.tsx
 - store/src/app/(store)/returns/page.tsx
tests:
 - typecheck: npx tsc --noEmit (clean, twice — before and after the await fix)
 - build: npm run build (clean, twice)
 - manual: inserted 8 isolated test orders (ZD-POLICY-C1..C3, R1..R5) covering every policy branch directly via Supabase REST (no real customer data touched), then hit /api/requests/cancel and /api/requests/return live for each — verified all 11 outcomes (cancel success/expired/already-delivered/identity-mismatch/not-found; return success/expired/not-delivered/legacy-grandfather-success/legacy-grandfather-expired/identity-mismatch) matched exactly
 - manual: created a fresh isolated test order, PUT its order_status to 'delivered' via the admin API, confirmed delivered_at was null (pre-existing bug — bare `void query.update()` on a Supabase query builder never sends the request), fixed by awaiting, rebuilt, retested — delivered_at now stamps correctly
 - cleanup: deleted all test orders and their cancellation_requests/return_requests rows after verification
---

## Prompt

> for now the return and exchange and cancel form I want to change ploicy if they want cancel after order the policy is only within 24 hours(1day) check database if order with that product number is present with same name an demail and only within 24 hours so accept that request otherwise politely rject withpolicy details , same with return and exchange order only 3 days after order deliver not placed the database check in deliver history with matching also specific email(for both) validated then accept request otherwise politely reject.

(clarifying question and answer, mid-implementation:) > Orders already marked "delivered" before this migration ships have no recorded delivery timestamp... = "Fall back to old 7-day-from-order-date rule"

(migration application, mid-implementation:) > okay go ahead i was misunderstood ... yes run

> yes

## Response snapshot

Investigated the existing cancel/return/exchange flow first (delegated to an Explore subagent): the cancel API had **no order lookup at all** — no identity check, no time window, always accepted. The return API looked up the order but only checked email loosely and enforced a 7-day-from-**order-placement** window — never delivery, since **no delivery timestamp existed anywhere in the schema** (only an `order_status='delivered'` flag with no time attached).

Implemented:
1. **Migration** (user applied manually, since I have no direct DB/DDL access this session): `ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz`.
2. **`api/admin/orders/route.ts`**: now stamps `delivered_at` whenever `order_status` is set to `'delivered'`, mirroring the existing `cancelled_at`/`returned_at` pattern.
3. **`api/requests/cancel/route.ts`**: full rewrite — looks up the order, requires exact name+email match, rejects if already cancelled/delivered, rejects if more than 24h since `created_at`. Distinct error codes (`NOT_FOUND`, `IDENTITY_MISMATCH`, `ALREADY_CANCELLED`, `ALREADY_DELIVERED`, `EXPIRED`) each with a polite customer-facing message.
4. **`api/requests/return/route.ts`**: rewrite — same identity check, requires the order to actually be `delivered`, enforces 3 days from `delivered_at`. For orders delivered before this migration (`delivered_at` is null), falls back to the previous 7-day-from-`created_at` rule as a grandfather clause, per the user's explicit choice.
5. Updated both customer forms (`cancel-order/page.tsx`, `ReturnRequestForm.tsx`) to make the name field required, and updated the `/returns` policy page copy from "7-Day Return Policy... within 7 days of your order date" to "3-Day Return Policy... within 3 days of your order being delivered."

**Bug found during live verification**: marked a real isolated test order "delivered" via the admin API and found `delivered_at` stayed null. Root cause: the pre-existing `cancelled_at`/`returned_at` stamping code (and my new `delivered_at` code, copied from the same pattern) used `void supabaseAdmin.from('orders').update(...)` — Supabase-js query builders are thenable and only actually send the HTTP request when awaited; a bare unawaited `void query` never fires at all. This means `cancelled_at`/`returned_at` have likely never been populated in production. Fixed by awaiting both blocks. Re-verified live — all three timestamps now stamp correctly.

## Outcome

- ✅ Impact: cancel/return/exchange requests are now actually policy-enforced (previously cancel had zero validation and return only checked a loose 7-day order-date window); fixed a real, previously-silent bug where delivery/cancellation/return timestamps were never being written to the database at all.
- 🧪 Tests: typecheck + build clean (twice); 11 live policy-branch verifications against isolated test data; live confirmation of the delivered_at stamping fix.
- 📁 Files: supabase/migrations/2026-07-04-add-delivered-at.sql, store/src/types/index.ts, store/src/app/api/admin/orders/route.ts, store/src/app/api/requests/cancel/route.ts, store/src/app/api/requests/return/route.ts, store/src/app/(store)/cancel-order/page.tsx, store/src/components/store/ReturnRequestForm.tsx, store/src/app/(store)/returns/page.tsx
- 🔁 Next prompts: consider auditing other `void asyncCall()` fire-and-forget patterns in this codebase for the same never-executes bug (not fixed here — out of scope for this task, but the same root cause could be lurking elsewhere)
- 🧠 Reflection: this is the second time in this session that "sandbox/live verification" (as opposed to just typecheck+build) caught a real bug that static analysis had no way to see — TypeScript happily compiles `void query.update()` since it's valid syntax; only actually running it against a real database revealed the row never changed.

## Evaluation notes (flywheel)

- Failure modes observed: `void asyncQueryBuilder` doesn't just "fire and forget" — for Supabase's thenable query builders specifically, it never fires at all. Worth remembering as a project-wide pattern to watch for.
- Graders run and results (PASS/FAIL): 11-scenario live policy verification — PASS; delivered_at stamping fix re-verification — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): grep the codebase for other `void supabaseAdmin` / `void supabase` patterns and check each is actually awaited or otherwise guaranteed to execute.
