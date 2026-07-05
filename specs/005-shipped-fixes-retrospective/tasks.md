# Tasks: Shipped Fixes Retrospective (Order/Sale/Admin Reliability)

**Input**: Design documents from `specs/005-shipped-fixes-retrospective/`
**Prerequisites**: plan.md, spec.md

**Status**: All tasks below are already complete (retroactive record). Each
task cites the PHR that documents its live verification evidence, under
`history/prompts/general/`.

## Format: `[x] [ID] [Story] Description — PHR`

---

## Phase 1: Foundational — recurring bug patterns (blocks correctness of US1–US3)

**Purpose**: Two bug *patterns* recurred across multiple files; fixing the
pattern (not just one instance) was a prerequisite for trusting any of the
downstream fixes that depended on the same write/render mechanism.

- [x] T001 Diagnose and fix unawaited Supabase query builder writes (`void query.update()` never sends the request) in `store/src/app/api/admin/orders/route.ts` (cancelled_at/returned_at/delivered_at stamps) — PHR 080
- [x] T002 [P] Apply the same await fix in `store/src/app/api/admin/orders/return/route.ts` — PHR 083
- [x] T003 [P] Apply the same await fix in `store/src/app/admin/page.tsx` (dashboard lazy sale deactivation) — PHR 083
- [x] T004 [P] Apply the same await fix in `store/src/app/admin/sales/page.tsx` (sales-list lazy deactivation) — PHR 083
- [x] T005 Diagnose and fix missing `export const dynamic = 'force-dynamic'` (build-time static cache) in `store/src/app/admin/sales/page.tsx` — PHR 083
- [x] T006 [P] Apply the same `force-dynamic` fix in `store/src/app/admin/products/[id]/edit/page.tsx`, found via a full codebase audit for the same pattern — PHR 084
- [x] T007 Audit remaining server-rendered pages for both patterns and confirm no further instances (`(store)/layout.tsx` already forces the whole storefront subtree dynamic) — PHR 084

---

## Phase 2: User Story 1 — Payment and invoice state, notification identity (Priority: P1)

**Goal**: Invoice/email surfaces always show real payment state and full order/customer identity.

- [x] T008 [US1] Fix invoice print page hardcoded "PAID" → real `payment_status` in `store/src/app/admin/invoices/[id]/print/page.tsx` — PHR 072/074
- [x] T009 [US1] [P] Scope dashboard "Order Status Breakdown" donut to last 30 days in `store/src/components/admin/DashboardCharts.tsx` — PHR 074
- [x] T010 [US1] Attach invoice as file to online-payment confirmation email in `store/src/lib/email.ts` (`sendCustomerPaymentConfirmed`) — PHR 074
- [x] T011 [US1] Fix base64-encoding bug found during live sandbox verification of T010 (Resend requires attachment content pre-encoded) — PHR 074
- [x] T012 [US1] Add order number/SKU/customer name/email to `sendOwnerReturnRequest`, `sendOwnerExchangeRequest`, `sendOwnerPaymentReceived` in `store/src/lib/email.ts`, wired through `api/requests/return/route.ts`, `api/admin/orders/route.ts`, `api/webhooks/safepay/route.ts`, `api/payments/verify/route.ts` — PHR 082
- [x] T013 [US1] Move HTML-template construction inside the try/catch in all three functions from T012 so a template error is logged, not silently dropped — PHR 082
- [x] T014 [US1] Live-verify all of the above against isolated test orders (return, exchange, payment-received, full webhook chain including invoice attachment, `/api/payments/verify` guard paths) — PHR 082

---

## Phase 3: User Story 2 — Sale correctness across expiry and cross-sale contamination (Priority: P1)

**Goal**: No sale ever displays active past its `ends_at`; no sale's analytics ever includes another sale's orders; every sale's analytics is reachable.

- [x] T015 [US2] Fix missing discount badge on related products in "This Is For You" — join `sale_products` for related products in `store/src/app/(store)/shop/[slug]/page.tsx`, thread `salePriceMap` through `ProductSlider.tsx` — PHR 076
- [x] T016 [US2] Fix cross-sale revenue/order misattribution in `store/src/app/api/admin/sales/[id]/analytics/route.ts` — scope matched orders to the sale's own `starts_at`/`ends_at` window instead of product-ID membership alone — PHR 076
- [x] T017 [US2] (Phase 1 T001–T007 covers the expired-sale-still-active fix — see above)
- [x] T018 [US2] Re-derive `is_active` from `ends_at` in the analytics route response instead of trusting the raw column — PHR 083
- [x] T019 [US2] [P] Add missing `ends_at` filter to `store/src/app/api/sale/route.ts` (previously trusted `is_active` alone) — PHR 083
- [x] T020 [US2] Rewrite `getSaleRevenue` in `store/src/app/admin/sales/page.tsx` from a global "last sale wins" product→sale map to per-sale date-window scoping — PHR 083
- [x] T021 [US2] Remove the `orders > 0` gate hiding the sales-list "Analytics" link, since the detail page already handles the zero-order margin-preview state gracefully — PHR 084
- [x] T022 [US2] Live-verify against real production sale data: confirmed an actual expired sale ("Flash Sale") stuck `is_active=true`, fixed, and confirmed the DB row itself corrected — PHR 083; confirmed a real product shared between two sales attributes correctly after the fix — PHR 083/084

---

## Phase 4: User Story 3 — Cancel/return/exchange policy enforcement (Priority: P1)

**Goal**: Cancellation only within 24h of placement; return/exchange only within 3 days of delivery; both identity-verified.

- [x] T023 [US3] Add `orders.delivered_at` column via `supabase/migrations/2026-07-04-add-delivered-at.sql`
- [x] T024 [US3] Stamp `delivered_at` in the admin order-status cascade (`store/src/app/api/admin/orders/route.ts`) when `order_status` becomes `delivered`
- [x] T025 [US3] Rewrite `store/src/app/api/requests/cancel/route.ts`: identity check (name+email match), 24-hour window off `created_at`, distinct rejection codes (NOT_FOUND/IDENTITY_MISMATCH/ALREADY_CANCELLED/ALREADY_DELIVERED/EXPIRED)
- [x] T026 [US3] [P] Rewrite `store/src/app/api/requests/return/route.ts`: identity check, 3-day window off `delivered_at`, requires order actually delivered, 7-day-from-`created_at` legacy fallback when `delivered_at` is null
- [x] T027 [US3] [P] Make "Your Name" required on `store/src/app/(store)/cancel-order/page.tsx` and `store/src/components/store/ReturnRequestForm.tsx`; update policy copy on `store/src/app/(store)/returns/page.tsx` (7-day → 3-day-from-delivery)
- [x] T028 [US3] Live-verify all 11 policy branches (cancel: success/expired/identity-mismatch/not-found/already-delivered; return: success/expired/not-delivered/legacy-grandfather-success/legacy-grandfather-expired/identity-mismatch) against isolated test orders — PHR 080

---

## Phase 5: User Story 4 — Merchandising/dashboard accuracy, sale filter, no duplication (Priority: P2)

**Goal**: COD KPI visibility respects settings; analytics sections aren't duplicated or mislabeled; sale filter actually returns sale products.

- [x] T029 [US4] Gate COD dashboard KPIs (Success Rate, Cash Collected MTD, COD In Transit) behind `store_settings.cod_enabled` in `store/src/components/admin/DashboardCharts.tsx` and `store/src/app/admin/page.tsx` — PHR 072/073
- [x] T030 [US4] [P] Split curated "New Arrivals" (real `is_new_arrival` flag) from age-based "Recently Added to Inventory" in `store/src/components/admin/AnalyticsClient.tsx`; remove duplicate "Price Range Performance" block from the Products tab — PHR 075
- [x] T031 [US4] Fix the "Sale" shop filter: move from a fake `product_category` value to the existing tab system, with a real `case 'sale'` query in `store/src/lib/products.ts`; remove the broken pseudo-category from `ProductFilters.tsx` — PHR 079
- [x] T032 [US4] [P] Add "Home" link to `store/src/components/layout/Header.tsx` navbar — PHR 079
- [x] T033 [US4] Settle sale/discount UI color on red across card badges, product-detail page, and sale-page hero, after a blue experiment was tried and reverted per user preference — PHR 077/078

---

## Phase 6: User Story 5 — Product detail page display correctness (Priority: P3)

**Goal**: No duplicated stock line; correct heading alignment.

- [x] T034 [US5] Fix duplicate "Only X left in stock" line in `store/src/components/products/AddToCartButton.tsx` — gate the per-variant line on a full color/size selection instead of falling back to overall stock — PHR 081
- [x] T035 [US5] [P] Center "This Is For You" heading in `store/src/app/(store)/shop/[slug]/page.tsx` — PHR 081
- [x] T036 [US5] Live-verify T034 across three variant-tracking shapes (color-only, size-only, size+color) via a scratch Playwright test, deleted after use — PHR 081

---

## Phase 7: Regression verification

- [x] T037 Full Playwright E2E suite run (store + admin, 157 tests): 134 passed / 5 failed (stale test assertions from T025–T027's policy changes, not regressions) / 18 pre-existing env-gated skips — PHR 081
- [x] T038 Fix the 5 stale test assertions in `store/tests/store/returns.spec.ts` (required-name-field fills, "7-Day" → "3-Day" copy) — PHR 081
- [x] T039 Re-run full E2E suite after Phase 1–6 fixes: 139 passed / 0 failed / 18 skipped — PHR (this session, post-083/084)
- [x] T040 Targeted re-run of `sales.spec.ts` + `products.spec.ts` after T021/T005/T006: 15 passed / 0 failed / 1 pre-existing skip — PHR 084

## Dependencies & Execution Order

- **Phase 1 (T001–T007)** blocks Phase 3 (US2) and parts of Phase 4 (US3), since both depend on writes/reads that Phase 1 made trustworthy.
- **US1, US2, US3** (Phases 2–4) are independent of each other and were delivered in parallel across the session — no sequencing dependency between them.
- **US4, US5** (Phases 5–6) are independent of US1–US3 and of each other.
- **Phase 7** (regression verification) runs after all preceding phases.

## Parallel Example

Tasks marked `[P]` touch different files with no shared dependency and were
verified independently — e.g., T009 (dashboard donut window) and T010
(invoice attachment) both belong to US1 but touch unrelated files
(`DashboardCharts.tsx` vs `email.ts`) and could have been done in either order.
