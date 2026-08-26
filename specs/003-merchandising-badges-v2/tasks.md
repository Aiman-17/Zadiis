# Tasks: Merchandising Badges v2

**Input**: Design documents from `specs/003-merchandising-badges-v2/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Included — constitution Principle VII (E2E Testing Mandate) requires
Playwright coverage for every critical journey before merge, and this feature's
plan.md Constitution Check names the exact coverage required as a gate item.

**Organization**: Tasks are grouped by user story (US1–US6) per spec.md priorities.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps to spec.md's US1–US6

## Phase 1: Setup

- [X] T001 Confirm `store/` production build is current and server is running per `.claude/skills/e2e-run` (`npm run build && npm start`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the single seam every consumer will be redirected
through. Initially a pass-through (no behavior change) so User Story 1 can
prove *consistency* before User Stories 2–4 change the underlying algorithm.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Create `store/src/lib/merchandising.ts` exporting `getBestSellers()`, `getTrending()`, `getJustDropped()` — each initially delegates to the existing logic already in `store/src/lib/products.ts` (pass-through, zero behavior change yet)

**Checkpoint**: The seam exists but nothing consumes it yet — no visible change to the app.

---

## Phase 3: User Story 1 - Every page shows the same merchandising badges (Priority: P1) 🎯 MVP

**Goal**: Shop, Homepage, and Admin Analytics show identical Best
Seller/Trending/Just Dropped sets — the actual defect the audit found.

**Independent Test**: Load all three pages at once; the set of badged products matches exactly, for all three merchandising concepts.

### Tests for User Story 1

- [X] T003 [P] [US1] Create `store/tests/store/merchandising-consistency.spec.ts` — assert the Best Seller product set is identical across Shop page, Homepage, and Admin Analytics Products view
- [X] T004 [P] [US1] Same file — assert the Trending product set is identical across every page that displays it
- [X] T005 [P] [US1] Same file — assert the Just Dropped product set is identical across Shop and Homepage

### Implementation for User Story 1

- [X] T006 [US1] Redirect `getBestsellerProducts`/`getTrendingProducts`/`getJustDroppedProducts` in `store/src/lib/products.ts` to call `merchandising.ts` instead of running their own independent queries
- [X] T007 [US1] Redirect `store/src/components/products/ProductCard.tsx`'s `showBestseller`/`showFire` logic to read the shared `merchandising.ts` result instead of the hardcoded `best_seller_score >= 5` / `is_trending` checks
- [X] T008 [US1] Redirect `store/src/components/admin/AnalyticsClient.tsx`'s `bestSellerChartData`/`trendingChartData` to `merchandising.ts` instead of its own `is_bestseller || best_seller_score > 0` filter
- [X] T009 [US1] Redirect `store/src/components/admin/DashboardCharts.tsx`'s Trending Now chart to `merchandising.ts` instead of its own `is_trending || trending_score > 0` filter — this is the 4th independently-duplicated definition FR-001 targets
- [X] T010 [US1] Remove the badge-forcing `badge='BESTSELLER'`/`badge='TRENDING'` prop pattern in `store/src/app/(store)/page.tsx` — `ProductCard` now shows a badge only when the shared result says the product genuinely qualifies
- [X] T011 [US1] Run `npx playwright test merchandising-consistency.spec.ts --project=store` and confirm T003–T005 pass — 4/4 pass (2026-07-04)

**Checkpoint**: MVP shippable — the actual reported bug is fixed, using the existing (not-yet-improved) scoring formula.

---

## Phase 4: User Story 2 - Best Seller reflects genuine demand, fairly across categories (Priority: P2)

**Goal**: Fix the confirmed scoring flaw (1-unit sellout outranking a genuine repeat seller) and the category-crowding bias.

**Independent Test**: Against real order history, the manually-recognized best seller outranks a small-batch sellout; a low-volume category's top product can still qualify.

### Tests for User Story 2

- [X] T012 [P] [US2] Create `store/tests/admin/merchandising-scoring.spec.ts` — verify a product that sold 1 unit of an original stock of 1 does not outrank a product that sold 3 units of an original stock of 30 (Scenario 1)
- [X] T013 [P] [US2] Same file — an uncategorized product remains eligible, compared against the full catalog rather than excluded (Scenario 2)
- [X] T014 [P] [US2] Same file — a categorized product's ranking reflects its category peers, not the whole catalog (Scenario 3)
- [X] T015 [P] [US2] Same file — displayed count is `min(cap, qualifying)`, never padded with non-qualifying products (Scenario 5)

### Implementation for User Story 2

- [X] T016 [US2] In `store/src/lib/merchandising.ts`, add a minimum-sales-evidence gate (`total_sold >= 2`, per research.md #2) a product must clear before Best Seller eligibility is even considered
- [X] T017 [US2] In `store/src/lib/merchandising.ts`, implement category-relative normalization for Best Seller: `relative_score = raw_score / max(raw_score among same product_category)`; uncategorized products use their raw score directly (research.md #1)
- [X] T018 [US2] In `store/src/lib/merchandising.ts`, set the Best Seller display cap to 4 and select `min(cap, qualifying products)` ranked by relative score
- [X] T019 [US2] Run `npx playwright test merchandising-scoring.spec.ts --project=admin` and confirm T012–T015 pass — 15/15 pass, 1 skip (empty-state edge case), 2026-07-04

**Checkpoint**: Best Seller ranking is now trustworthy against the audit's exact failure case.

---

## Phase 5: User Story 3 - Trending reflects real, current momentum (Priority: P2)

**Goal**: Trending becomes fully automatic and category-relative; the permanent manual flag stops driving the Shop tab.

**Independent Test**: The Trending set is derived entirely from recent sales momentum and can change without any admin action.

### Tests for User Story 3

- [X] T020 [P] [US3] Same `merchandising-scoring.spec.ts` — a product with genuine recent momentum appears in Trending (Scenario 1)
- [X] T021 [P] [US3] Same file — momentum fading removes a product from Trending automatically on next computation, no admin action (Scenario 2)
- [X] T022 [P] [US3] Same file — Trending is empty when nothing has genuine momentum, never forced by a manual flag (Scenario 4)

### Implementation for User Story 3

- [X] T023 [US3] In `store/src/lib/merchandising.ts`, apply the same category-relative normalization (research.md #1) to `trending_score`
- [X] T024 [US3] In `store/src/lib/merchandising.ts`, stop reading `is_trending` for Trending qualification entirely
- [X] T025 [US3] Update the Shop page's `'trending'` tab filter in `store/src/lib/products.ts` (currently the one place using `is_trending` exclusively per an existing code comment) to call `merchandising.ts`'s `getTrending()` instead
- [X] T026 [US3] Run `npx playwright test merchandising-scoring.spec.ts --project=admin` and confirm T020–T022 pass — same full-suite run as T019/T033/T048

**Checkpoint**: Trending is fully automatic everywhere, including the Shop tab that previously bypassed the score entirely.

---

## Phase 6: User Story 4 - Just Dropped reflects fresh inventory (Priority: P2)

**Goal**: Just Dropped is based on restock events, not `created_at` — a restocked old product now surfaces correctly.

**Independent Test**: Restocking an existing, previously-listed product makes it appear in Just Dropped; a product with no recent restock does not appear regardless of its listing age.

### Tests for User Story 4

- [X] T027 [P] [US4] Same `merchandising-scoring.spec.ts` — restocking an old existing product (adding stock via the admin edit form) surfaces it in Just Dropped (Scenario 1)
- [X] T028 [P] [US4] Same file — a brand-new product with initial stock also appears in Just Dropped (Scenario 2)
- [X] T029 [P] [US4] Same file — a product with no restock inside the freshness window does not appear, regardless of `created_at` (Scenario 3)

### Implementation for User Story 4

- [X] T030 [US4] In `store/src/app/api/admin/products/route.ts` PUT handler (lines ~43–64), broaden the existing pre-update stock read from "old was exactly 0" to "new stock_quantity > old stock_quantity", and insert a `stock_movements` row with `reason: 'restock'` on that condition (research.md #4) — the existing 0→positive back-in-stock email trigger stays unchanged. **Real bug found**: `stock_movements` RLS restricts reads to `service_role` — the shared module's read side needed `supabaseAdmin`, not the public client (see Notes)
- [X] T031 [US4] In `store/src/app/api/admin/products/route.ts` POST handler, insert a `stock_movements` row with `reason: 'restock'` when a newly created product's initial `stock_quantity > 0` (FR-010)
- [X] T032 [US4] Implement `getJustDropped()` to query the most recent `stock_movements` row with `reason='restock'` per product within the existing 72-hour window, replacing `products.ts`'s `created_at`-based query. **Deviation from plan**: moved into a new `store/src/lib/merchandising-server.ts` rather than `merchandising.ts` itself — `merchandising.ts` is imported by 'use client' components (AdminProductsClient, AnalyticsClient, DashboardCharts) for the pure ranking functions, and `supabaseAdmin` throws at module-eval time when its key is undefined in the browser, which crashed every admin page that touched the module. Splitting into a client-safe core + a server-only file (never imported by a client component) fixed it.
- [X] T033 [US4] Run `npx playwright test merchandising-scoring.spec.ts --project=admin` and confirm T027–T029 pass — same full-suite run as T019/T026/T048, 15/15 pass

**Checkpoint**: Just Dropped matches the store's real restocking workflow.

---

## Phase 7: User Story 5 - Merchants get a dedicated way to manually promote a product (Priority: P3)

**Goal**: A new Featured section gives merchants a promotion outlet independent of Best Seller/Trending — prerequisite for User Story 6.

**Independent Test**: Marking a product Featured shows it in a distinct Featured section without affecting Best Seller or Trending computation.

### Tests for User Story 5

- [X] T034 [P] [US5] `store/tests/store/merchandising-consistency.spec.ts` — a Featured product appears in a distinct Featured section on the storefront (Scenario 1)
- [X] T035 [P] [US5] Same file — Featured status has zero effect on Best Seller or Trending qualification for that product (Scenario 2)
- [X] T036 [P] [US5] `store/tests/admin/merchandising-scoring.spec.ts` — a Featured product outside its optional date window does not appear (Scenario 3)

### Implementation for User Story 5

- [X] T037 [US5] Write and apply a migration adding `is_featured boolean DEFAULT false`, `featured_start timestamptz`, `featured_end timestamptz` to `products` (data-model.md) — saved as `supabase/migrations/2026-07-03-add-featured.sql`; applied by the user via Supabase SQL Editor (no direct DDL access), confirmed live 2026-07-04
- [X] T038 [US5] [P] Add Featured toggle + optional date range fields to `store/src/app/admin/products/new/page.tsx`, mirroring the existing `is_new_arrival`/`new_arrival_start`/`new_arrival_end` fields already in this file
- [X] T039 [US5] [P] Add the same fields to `store/src/app/admin/products/[id]/edit/EditProductForm.tsx`
- [X] T040 [US5] Add `getFeaturedProducts()` to `store/src/lib/products.ts`, mirroring `getNewArrivalProducts()`'s date-window query logic
- [X] T041 [US5] Add a Featured section to `store/src/app/(store)/page.tsx`, following the existing section-row pattern used by Trending/Best Sellers/etc.
- [X] T042 [US5] Run `npx playwright test --project=store --project=admin -g Featured` and confirm T034–T036 pass. **Real bug found**: `GET /api/admin/products` had an explicit column select list that never included `is_featured`/`featured_start`/`featured_end`/`trending_score` — every admin-side read of these fields silently returned `undefined`. Fixed by adding them to the select (and dropping the now-unused `is_bestseller`/`is_trending` columns from that same select, per US6)

**Checkpoint**: Merchants have a working promotion tool before the old flags are removed.

---

## Phase 8: User Story 6 - Old permanent manual flags are retired (Priority: P3)

**Goal**: Remove the ability to permanently mark a product Best Seller/Trending — both labels only ever reflect genuine automatic qualification.

**Independent Test**: The admin product form no longer offers Best Seller/Trending toggles; a previously-flagged product only shows a badge if it also genuinely qualifies.

### Tests for User Story 6

- [X] T043 [P] [US6] `store/tests/admin/merchandising-scoring.spec.ts` — the product edit form no longer renders Best Seller/Trending toggle buttons (Scenario 1)
- [X] T044 [P] [US6] Same file — a product with a legacy `is_bestseller=true`/`is_trending=true` value but no qualifying score shows no badge anywhere (Scenario 2)

### Implementation for User Story 6

- [X] T045 [US6] Remove the `is_bestseller`/`is_trending` badge toggle buttons from `store/src/app/admin/products/new/page.tsx` (leave the underlying database columns in place per research.md #6 — no migration to drop them)
- [X] T046 [US6] Remove the same toggle buttons from `store/src/app/admin/products/[id]/edit/EditProductForm.tsx`
- [X] T047 [US6] Verify (no code change expected) that `store/src/lib/merchandising.ts` never reads `is_bestseller`/`is_trending` after T016–T025 — this is a confirmation task, not new logic
- [X] T048 [US6] Run `npx playwright test merchandising-scoring.spec.ts --project=admin` and confirm T043–T044 pass — same full-suite run as T019/T026/T033

**Checkpoint**: All 6 user stories complete and independently verified.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T049 Mobile-viewport check (375px, per constitution Principle II) of the new Featured section on the homepage — confirmed no layout overflow, screenshot taken 2026-07-04
- [X] T050 Run the full `store` and `admin` Playwright projects (`npx playwright test --project=store --project=admin`) and confirm no regressions beyond the two new spec files — 157 tests, 144 passed, 11 skipped, 2 failed on first pass; both failures were a pre-existing `products.spec.ts` asserting the now-intentionally-removed Trending toggle button (US6) — updated to assert the Featured toggle instead (its replacement), rerun 11/11 pass
- [X] T051 Update `specs/003-merchandising-badges-v2/checklists/requirements.md` notes if any acceptance criteria shifted during implementation — no acceptance criteria changed; see Notes below for implementation-time bugs found and fixed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (the shared seam must exist before anything can be redirected through it)
- **User Story 1 (Phase 3)**: Depends on Foundational — this is the MVP (consistency fix using the existing formula)
- **User Story 2 (Phase 4)**: Depends on User Story 1 (redirects must exist before the algorithm behind them can change)
- **User Story 3 (Phase 5)**: Depends on User Story 1; independent of User Story 2 (different scoring field, same normalization technique)
- **User Story 4 (Phase 6)**: Depends on User Story 1; independent of User Stories 2 and 3 (different data source — stock_movements, not scores)
- **User Story 5 (Phase 7)**: Independent of User Stories 2–4; only depends on Foundational
- **User Story 6 (Phase 8)**: Depends on User Story 5 (Featured must exist as the replacement promotion outlet before the old flags are removed) AND User Stories 1–3 (so removing the flags doesn't regress badges that should still show via genuine qualification)
- **Polish (Phase 9)**: Depends on all six user stories being complete

### Parallel Opportunities

- User Stories 2, 3, and 4 can be implemented in parallel once User Story 1 is done — each touches a different concern within `merchandising.ts` (Best Seller gate/normalization, Trending normalization, Just Dropped data source) and different call sites
- User Story 5 can be implemented in parallel with User Stories 2–4 — it doesn't touch `merchandising.ts` at all
- Within each story, test-writing tasks marked [P] are parallel (same file, but independent assertions — coordinate to avoid merge conflicts if split across people)
- T038/T039 (admin form changes for Featured) are parallel — different files (new-product form vs. edit form)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational)
2. Complete Phase 3 (User Story 1)
3. **STOP and VALIDATE**: run `merchandising-consistency.spec.ts`, confirm the actual reported bug (different badges on different pages) is fixed
4. This alone is shippable — even using the pre-existing scoring formula, consistency across pages is real, immediate value

### Incremental Delivery

1. Setup + Foundational → Phase 3 (US1, MVP) → validate → ship
2. Phase 4 (US2) + Phase 5 (US3) + Phase 6 (US4) → can proceed in parallel → validate each independently → ship
3. Phase 7 (US5) → validate → ship (gives merchants their promotion tool back)
4. Phase 8 (US6) → validate → ship (only after US5 is live)
5. Phase 9 (Polish)

---

## Notes

- `merchandising.ts` is the single most-touched file across this feature — Phases 4–6 all modify it for different concerns; sequence carefully if working on more than one of those phases at once to avoid merge conflicts, even though they're conceptually independent.
- Commit after each phase checkpoint.
- The Foundational phase (T002) is deliberately a no-op pass-through — this means Phase 3 (US1) is what actually delivers the fix, not Phase 2. Do not consider the feature "started" until Phase 3 ships.

## Bugs found and fixed during implementation (2026-07-04)

None of these were pre-existing defects the audit flagged — all four were introduced or exposed by this feature's own implementation, caught by running the real test suite against the real app rather than trusting `tsc`/build success alone:

1. **`stock_movements` RLS blocked Just Dropped reads.** The table's only RLS policy restricts all access to `service_role`; `getJustDroppedIds()` was written against the public anon client and silently got zero rows back (no error — RLS just filters). Fixed by reading via `supabaseAdmin`.
2. **That fix broke every admin page.** `merchandising.ts` is imported by several `'use client'` components for its pure ranking functions. Adding a `supabaseAdmin` import to the same file made `createClient()` throw at module-evaluation time in the browser bundle (no service-role key client-side), crashing `/admin/products` and any other page importing the module — "This page couldn't load," no server-side error logged. Fixed by splitting into `merchandising.ts` (client-safe, public client only) and a new `merchandising-server.ts` (Just Dropped only, server-only, imported exclusively from `products.ts`).
3. **`GET /api/admin/products` had a stale explicit column list.** It never included `is_featured`/`featured_start`/`featured_end`/`trending_score`, so every test and admin-side read of those fields got `undefined` — looked exactly like a missing-migration symptom (which was *also* real and required separately, see T037) and took a screenshot to distinguish from the RLS/bundle bugs above, since the homepage itself was rendering all sections correctly the whole time.
4. **Test locator bug (not a product bug):** `h2:has-text(...).locator('xpath=following-sibling::*[1]')` assumed the product grid was a sibling of the `<h2>`; the actual homepage markup nests both the heading and "View All" link inside a header row `div`, with the grid as a sibling of *that row*, not of the `h2`. Fixed both spec files to use `heading.locator('xpath=ancestor::div[2]')` instead, and switched from `h2:has-text()` (a CSS-class-adjacent pattern) to `getByRole('heading', ...)` per this repo's locator-priority convention.
