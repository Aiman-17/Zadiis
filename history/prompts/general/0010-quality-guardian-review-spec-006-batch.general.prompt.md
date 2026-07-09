---
id: 0010
title: Quality guardian review spec 006 batch
stage: general
date: 2026-07-09
surface: agent
model: claude-sonnet-5
feature: 006-conversion-admin-enhancements
branch: 006-conversion-admin-enhancements
user: Aiman-17
command: /sp.quality-review
labels: ["quality-review", "net-profit", "e2e", "spec-006"]
links:
  spec: specs/006-conversion-admin-enhancements/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - store/src/components/admin/AnalyticsClient.tsx
 - store/src/components/admin/DashboardCharts.tsx
 - store/src/components/store/PromoPopup.tsx
 - store/src/app/admin/settings/page.tsx
 - store/src/app/admin/analytics/page.tsx
 - store/src/app/admin/products/new/page.tsx
 - store/src/app/admin/products/[id]/edit/EditProductForm.tsx
 - store/tests/admin/store-policy-toggles.spec.ts
tests:
 - npm run test:e2e:store — 61/61 passed after the non-modal popup fix
 - targeted admin re-runs (inventory-stock-decrement, merchandising-scoring, products, store-policy-toggles) — all pass after the column migration + locator/race-condition fixes
 - Net Profit formula hand-verified against 30 real orders + a full order-status distribution query via a throwaway read-only script
---

## Prompt

> Review the batch of work just completed in this session: (1) the full spec 006 implementation... (2) spec 004 US4 (PDF invoices), and (3) the follow-up fixes made after live user feedback today: a non-modal promo popup redesign..., a Net Profit KPI rebuild..., a new payment-gateway-fee Settings field..., inline error messages replacing native alert()..., and moving "Top Colors"... Focus on: does the Net Profit formula actually compute correctly given real order data, does the non-modal popup still function correctly..., and any other correctness issues across this batch.

## Response snapshot

Full 19-stage / 23-section Quality Guardian review delivered inline to the user (not duplicated here in full — see conversation). Verified live against real data rather than by inspection alone:

- **Net Profit formula**: hand-recomputed against real Supabase order data via a throwaway script. Mechanically correct — cost deducted per qualifying order, delivery correctly excluded (no add/subtract), gateway fee correctly zero for COD. Surfaced a genuine, separate data-integrity finding along the way: 2 `card`/`delivered` orders have `payment_status='pending'` — delivered without confirmed payment, an operational item for the merchant, not a code defect.
- **Non-modal popup**: confirmed via the full store E2E suite (61/61 passing) including the dedicated `promo-popups.spec.ts` dismiss/session-persistence tests.
- **Critical finding, fixed live**: E2E test runs earlier in the session left `free_delivery_enabled='false'` on the **live** (non-isolated) Supabase database — a restore step only at the end of a test body was skipped when an earlier assertion threw. Restored to `'true'` immediately, then hardened the test file with `test.afterEach` (always runs) doing a direct API-level restore instead of a UI click at the tail of the test body.
- Two additional test-only bugs found and fixed during verification (not product bugs): a `.last()` locator resolving to the wrong nested `<div>` (no button descendant) causing 30s timeouts, and a strict-mode violation from a `getByText` regex matching 3 elements on the "cancellations unavailable" page.
- `products.spec.ts`'s "is_featured toggle saves" failure traced to a genuinely missing DB migration (`image_colors` column) — not applied until the user ran it mid-session. Confirmed root cause directly via a read-only Supabase query, not assumed.

## Outcome

- ✅ Impact: Net Profit KPI and gateway-fee Settings field shipped and verified against real data; live-database misconfiguration from test runs caught and corrected; E2E suite hardened against repeating the same test-isolation failure mode.
- 🧪 Tests: full store suite 61/61 passing; targeted admin re-runs all passing; live settings confirmed restored post-verification.
- 📁 Files: see list above.
- 🔁 Next prompts: file any findings from this review as bug reports per the user's new standing instruction (see feedback_quality_review_standing_order memory); continue with remaining spec 006 polish if any.
- 🧠 Reflection: the most valuable finding this pass wasn't a code defect — it was that the E2E suite mutates live production data with no isolation, and only the LAST line of several test bodies did cleanup. That's a systemic risk that will keep resurfacing on every future admin settings feature unless addressed suite-wide (currently patched only in the one file that caused today's incident).

## Evaluation notes (flywheel)

- Failure modes observed: test-only locator bugs (2), a missing migration not yet applied (1, user-side, resolved), a live-data side effect from incomplete test cleanup (1, critical, fixed).
- Graders run and results (PASS/FAIL): full store E2E — PASS (61/61); targeted admin E2E — PASS (all re-run files); Net Profit hand-verification — PASS (matches live data).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): audit other admin *.spec.ts files for the same "restore only at end of test body" pattern and migrate them to `afterEach`-based cleanup before the next settings-mutating feature ships.
