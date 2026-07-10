---
description: "Task list for Conversion & Admin Enhancements (11 user stories)"
---

# Tasks: Conversion & Admin Enhancements

**Input**: Design documents from `specs/006-conversion-admin-enhancements/` (plan.md, spec.md, research.md, data-model.md, quickstart.md)
**Tests**: Included and REQUIRED — constitution Principle VII (E2E Testing Mandate).

## Format: `[ID] [P?] [Story] Description`

## Setup / Foundational

No shared setup or foundational tasks required — the 11 stories touch disjoint files except where explicitly noted (US3/US4 share the settings-migration pattern but write independent keys; US6 touches 5 surfaces independently; US7/US8/US10 all land in `AnalyticsClient.tsx` but in non-overlapping sections). Each story is self-contained starting from its own first task.

---

## Phase 1: User Story 1 — Swipeable Product Gallery (Priority: P1) 🎯 MVP

**Goal**: Touch-swipe navigation on the product detail page gallery, main view and fullscreen zoom view both.

- [ ] T001 [P] [US1] Playwright E2E test in `store/tests/store/product-gallery.spec.ts` covering: swipe left/right changes the active image on the main gallery view; swipe works independently in the fullscreen zoom view; a single-image product shows no swipe/arrow controls.
- [ ] T002 [US1] Add `onTouchStart/Move/End` handlers + arrow buttons to the main gallery block in `store/src/components/products/ProductImageGallery.tsx` (lines 20-55).
- [ ] T003 [US1] Add the same handlers independently to the fullscreen zoom modal block (lines 58-102) — a separate JSX section, easy to miss.

**Checkpoint**: US1 independently functional.

---

## Phase 2: User Story 2 — Color-to-Image Matching (Priority: P2)

**Goal**: Selecting a color swatch brings the matching tagged image to the front of an otherwise-unchanged, fully browsable gallery.

- [ ] T004 [P] [US2] Playwright E2E test in `store/tests/store/product-gallery.spec.ts` (extend) covering: selecting a color with a tagged image changes the active gallery image; selecting a color with no tagged image is a no-op; all images remain browsable regardless of color selection.
- [ ] T005 [US2] Create `store/supabase/color-image-tagging.sql` — `alter table products add column if not exists image_colors text[]`.
- [ ] T006 [US2] In `store/src/components/admin/ImageUploader.tsx` (line 92 area), add an optional color-tag input per uploaded image, appending to `image_colors` in lockstep with `images`.
- [ ] T007 [US2] Convert `store/src/components/products/AddToCartButton.tsx`'s `selectedColor` (line 172) from internal `useState` to a controlled `selectedColor`/`onColorChange` prop pair. (This is a real state-model change, not just adding a prop — verify `isSizeDisabled`/`isColorDisabled` variant-stock logic still works correctly with the lifted state.)
- [ ] T008 [US2] Create a new client wrapper component (e.g. `ProductGallerySection`) instantiated in `store/src/app/(store)/shop/[slug]/page.tsx` (around lines 177/264) to hold `selectedColor` as the single source of truth for both `ProductImageGallery` and the now-controlled `AddToCartButton`. (Depends on T007.)
- [ ] T009 [US2] Add `imageColors`/`selectedColor` props to `ProductImageGallery.tsx`; on color change, jump the active index to the first image tagged with that color, no-op if none match. (Depends on T005, T008.)
- [ ] T010 [US2] Add the color-tag admin input's saved value to whatever product-fetch queries feed the storefront gallery (ensure `image_colors` is selected alongside `images`). (Depends on T005.)

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 3: User Story 3 — Admin-Toggleable Free Delivery (Priority: P3)

**Goal**: A merchant setting that, when disabled, stops free delivery at checkout and removes its promotional copy everywhere it appears.

- [ ] T011 [P] [US3] Playwright E2E test in `store/tests/store/free-delivery-toggle.spec.ts` covering: with the setting enabled, a 5+ item cart gets free delivery (existing behavior); with it disabled, delivery is charged and no promotional copy appears on the homepage or Shipping Info page.
- [ ] T012 [US3] Add `free_delivery_enabled` seed row (default `'true'`) to a new or existing settings migration file, matching `cod_enabled`'s pattern (`sprint1.sql:31-33`).
- [ ] T013 [US3] Add a "Free Delivery" toggle to `store/src/app/admin/settings/page.tsx`, copying the `codEnabled`/`toggleCod` pattern exactly (lines 11, 21-33, 92-100). (Depends on T012.)
- [ ] T014 [P] [US3] Gate `qualifiesForFreeDelivery` in `store/src/app/(store)/checkout/page.tsx` (lines 183-185) behind the new setting, read via the existing `/api/delivery-zones` settings-consumption pattern (matching how `cod_enabled` is already read there). (Depends on T012.)
- [ ] T015 [P] [US3] Convert `store/src/app/(store)/shipping/page.tsx` (line 18) from a synchronous server component to `async`, fetching the setting server-side and conditionally dropping the free-delivery sentence. (Depends on T012.)
- [ ] T016 [P] [US3] Drop the free-delivery line from the homepage Trust Bar in `store/src/app/(store)/page.tsx` (line 111) when the setting is disabled. (Depends on T012.)

**Checkpoint**: US1 + US2 + US3 all independently functional.

---

## Phase 4: User Story 4 — Manual Cancellation Toggle (Priority: P3)

**Goal**: A merchant setting that, when disabled, both hides the cancellation entry point and rejects any cancellation attempt server-side — Returns stays fully unaffected.

- [ ] T017 [P] [US4] Playwright E2E test in `store/tests/store/cancellation-toggle.spec.ts` covering: with the setting enabled, cancellation within 24 hours works (existing behavior); with it disabled, the footer link is gone, direct navigation to `/cancel-order` shows an unavailable message, a direct API submission is rejected with the same message, and Returns is completely unaffected throughout.
- [ ] T018 [US4] Add `cancellations_enabled` seed row (default `'true'`) to the same migration as T012 (or a sibling file), matching the `cod_enabled` pattern.
- [ ] T019 [US4] Add a "Cancellations" toggle to `store/src/app/admin/settings/page.tsx`, same pattern as T013. (Depends on T018.)
- [ ] T020 [US4] Hide the "Cancel an Order" link in `store/src/components/layout/Footer.tsx` (line 26) when the setting is disabled — Footer becomes async or fetches the setting client-side, whichever keeps the smallest diff given Footer's current structure. (Depends on T018.)
- [ ] T021 [US4] In `store/src/app/(store)/cancel-order/page.tsx`, fetch the setting on mount (matching the `codEnabled` client-fetch pattern per `research.md` Decision 4) and render a friendly "cancellations are currently unavailable — reach out on WhatsApp" state instead of the form when disabled. (Depends on T018.)
- [ ] T022 [US4] In `store/src/app/api/requests/cancel/route.ts`, reject with the same unavailable message when the setting is disabled — server-side enforcement independent of the UI (defense in depth per FR-004). (Depends on T018.)

**Checkpoint**: US1-US4 all independently functional.

---

## Phase 5: User Story 5 — Promo Popup Cards (Priority: P4)

**Goal**: Dismissible, session-scoped sale and free-delivery popups on homepage, shop/category, and product-detail pages.

- [ ] T023 [P] [US5] Playwright E2E test in `store/tests/store/promo-popups.spec.ts` covering: with an active sale, the sale popup appears once per session across the three page types and doesn't reappear after dismissal in the same session; with free delivery enabled, a visually-distinct free-delivery popup follows the same rule; with no active sale, no sale popup appears; a fresh session allows both to reappear.
- [ ] T024 [US5] Create `store/src/components/store/PromoPopup.tsx`, built on the existing (currently unused) `store/src/components/ui/dialog.tsx` Radix primitive — sale and free-delivery variants, `sessionStorage`-gated, mounted closed and revealed via `useEffect` (hydration-safe, matching this codebase's existing convention).
- [ ] T025 [US5] Sale card styling: reuse the existing urgency palette from the homepage sale banner (`#1C1C1C` background, `#A68B6E` gold label, `#DC2626`/`#EF4444` red accents). (Depends on T024.)
- [ ] T026 [US5] Free-delivery card styling: distinct reward tone — cream/gold background, `#10B981` green accent (existing "success" semantic color), gated behind the US3 setting. (Depends on T024, T012.)
- [ ] T027 [P] [US5] Mount `PromoPopup` from `store/src/app/(store)/page.tsx` (line 120's `activeSale`), the shop/category page(s), and `store/src/app/(store)/shop/[slug]/page.tsx` (line 111's `isSaleActive`), each passing through its already-computed sale-detection data. (Depends on T024.)

**Checkpoint**: US1-US5 all independently functional.

---

## Phase 6: User Story 6 — Mobile Long-Press Row Actions (Priority: P5)

**Goal**: Destructive row-action icons hidden below the mobile breakpoint on 5 admin surfaces, revealed via long-press, same confirmation behavior once revealed.

- [ ] T028 [P] [US6] Playwright E2E test in `store/tests/admin/mobile-long-press.spec.ts` covering: at 375px, action icons are hidden by default on each of the 5 surfaces; a long-press reveals them; a tap on a revealed icon triggers the exact same confirm()/action behavior as before; at desktop width, nothing changed.
- [ ] T029 [US6] Create `store/src/hooks/useLongPress.ts` — a shared timer-based press-and-hold hook (no existing `hooks/` directory; this creates it).
- [ ] T030 [P] [US6] Apply the hook to `AdminProductsClient.tsx`/`ProductActions.tsx`'s Archive/Delete/Restore icons, hidden below `md` by default. (Depends on T029.)
- [ ] T031 [P] [US6] Apply the hook to `admin/orders/page.tsx`'s Archive icon (~line 462). (Depends on T029.)
- [ ] T032 [P] [US6] Apply the hook to `admin/invoices/page.tsx`'s Delete icon (~line 150). (Depends on T029.)
- [ ] T033 [P] [US6] Apply the hook to `admin/payments/page.tsx`'s Archive/Delete/Restore icons (~lines 145/160/174). (Depends on T029.)
- [ ] T034 [P] [US6] Apply the hook to `NotificationsClient.tsx`'s Archive/Delete/Restore icons (~lines 123/133/145). (Depends on T029.)

**Checkpoint**: US1-US6 all independently functional.

---

## Phase 7: User Story 7 — Additional Analytics Visuals (Priority: P6)

**Goal**: A row-level product table in the Inventory tab; Featured/New-Arrival sales charts in the Performance tab — both additive.

- [ ] T035 [P] [US7] Playwright E2E test in `store/tests/admin/analytics.spec.ts` (extend) covering: the Inventory tab shows the new table alongside unchanged existing content; the Performance tab shows the new charts alongside unchanged existing content; switching the range filter leaves every pre-existing chart's output unchanged.
- [ ] T036 [US7] Add a row-level product table (stock, SKU, value, low-stock flag) to `AnalyticsClient.tsx`'s Inventory tab body (1170-1503), reusing `getEffectiveStock`/`getMerchStock` (line 10/58-60), appended near the KPI cards (~1200) or alongside Slow Movers (~1451) — after T044's consolidation lands, to avoid touching Slow Mover code twice.
- [ ] T037 [US7] Add Featured and New-Arrival sales charts to `AnalyticsClient.tsx`'s Performance tab body, appended after the existing Cities section (~913), reusing `productMap` (line 279) the same way Best Seller charts do (line 554), and mirroring the `curatedNewArrivals` filter pattern (531-539) for a new `is_featured`-window filter.

**Checkpoint**: US1-US7 all independently functional.

---

## Phase 8: User Story 8 — Badge Lift/Effectiveness Analytics (Priority: P7)

**Goal**: Before/after sales-velocity comparison for Featured/New-Arrival products, correlation-labeled, insufficient-data-aware.

- [ ] T038 [P] [US8] Playwright E2E test in `store/tests/admin/analytics.spec.ts` (extend) covering: a Featured product with sufficient history shows a before/after comparison with a visible correlation caveat; a product with insufficient history shows an explicit insufficient-data state, not a misleading number.
- [ ] T039 [US8] Add a badge-lift computation (7-day default before/after window per `spec.md`'s Assumptions) to `AnalyticsClient.tsx` or a new helper, deriving velocity from existing `orders`/`order_items` relative to each product's `featured_start`/`new_arrival_start`.
- [ ] T040 [US8] Render the comparison as a ranked table in the Performance tab (near T037's additions), with the required non-negotiable correlation-not-causation caveat text and an explicit insufficient-data state per product. (Depends on T039.)

**Checkpoint**: US1-US8 all independently functional.

---

## Phase 9: User Story 9 — Slow Mover Logic Consolidation (Priority: P8, fixes a confirmed live bug)

**Goal**: A single shared Slow Mover calculation used everywhere it appears — resolving a real, already-existing classification disagreement across 3 admin surfaces, not just preventing a future one.

- [ ] T041 [P] [US9] Playwright/data test in `store/tests/admin/merchandising-scoring.spec.ts` (extend) covering: the same product set is flagged Slow Mover in the product list and both sales-creation screens after consolidation.
- [ ] T042 [US9] **(bug fix, deliberate product decision — see `research.md` Decision 9)** Add `isSlowMover`/`computeStoreAvgSellThrough` to `store/src/lib/merchandising.ts`, alongside `rankBestSellers`/`rankTrending` (70-88). The shared average-sell-through baseline MUST exclude `is_new_arrival` products (adopting `sales/new/page.tsx`'s current behavior as the chosen-correct one, per research.md) — this is not preserving `AdminProductsClient.tsx`'s current behavior verbatim, since that pool currently includes `is_new_arrival` products and is being deliberately changed.
- [ ] T043 [US9] Update `AdminProductsClient.tsx` (lines 42-50) to import and use the shared function. (Depends on T042.)
- [ ] T044 [US9] Update `sales/new/page.tsx` (lines 10-16) to import and use the shared function. (Depends on T042.)
- [ ] T045 [US9] Update `sales/[id]/edit/page.tsx` (lines 11-17) to import and use the shared function — **this call site's classification will change** for some products, since its current pool (including `is_new_arrival`) is the one being corrected; verify this against real product data and confirm the new behavior is the intended one, not just that the refactor compiles. (Depends on T042.)

**Checkpoint**: US1-US9 all independently functional.

---

## Phase 10: User Story 10 — Analytics Tab Renames (Priority: P9)

**Goal**: "Products" → "Merchandising", "Performance" → "Sales Performance", label-only.

- [ ] T046 [P] [US10] Playwright E2E test in `store/tests/admin/analytics.spec.ts` (extend) covering: the tab strip shows "Merchandising" and "Sales Performance" instead of the old labels; clicking into each shows unchanged content/filters/URL behavior.
- [ ] T047 [US10] Update the `TABS` label array in `AnalyticsClient.tsx` (591-597) — labels only, `Tab` type keys (line 44) and all routing/query-param behavior unchanged. Do this task AFTER T036/T037/T039-40 land, since those tasks' descriptions reference the tabs by their current names for clarity during implementation.

**Checkpoint**: US1-US10 all independently functional.

---

## Phase 11: User Story 11 — Admin Dark Mode (Priority: P10)

**Goal**: A full-panel dark theme (including legible charts), toggle in the sidebar, persisted via `localStorage`. Scope narrowed this session — Tailwind's dark-mode infrastructure already exists.

- [ ] T048 [P] [US11] Playwright E2E test in `store/tests/admin/dark-mode.spec.ts` covering: toggling dark mode applies it across multiple admin pages including Analytics; charts remain legible; the preference persists across a reload; toggling off fully reverts.
- [ ] T049 [US11] Add dark-mode counterparts for `--brand-bg`, `--brand-text`, `--brand-accent`, `--brand-border` (currently `globals.css:42-45`) inside the existing `.dark {}` block.
- [ ] T050 [US11] Add a toggle button near the bell icon in `store/src/app/admin/layout.tsx` (line 24 area) that adds/removes the `.dark` class on a root element, persisted via `localStorage` using the exact get/set/remove pattern from `store/src/lib/cart-store.ts` (lines 15/20/44). (Depends on T049.)
- [ ] T051 [US11] **(invoke the `dataviz` skill)** Derive and validate (via `validate_palette.js`) a dark-mode chart color palette for `AnalyticsClient.tsx` from the same brand ramp — not an automatic inversion of the hardcoded light-mode hex values. Apply to all chart color references. (Depends on T049.)

**Checkpoint**: All 11 user stories independently functional.

---

## Phase 12: Polish & Cross-Cutting Concerns

- [ ] T052 [P] Run every step in `quickstart.md` end-to-end for all 11 stories.
- [ ] T053 [P] **(bug-pattern sweep)** Grep every file touched by T001-T051 for un-awaited `supabaseAdmin` calls and any new page/route missing `export const dynamic = 'force-dynamic'` — this project's two documented recurring bug classes.
- [ ] T054 Update `specs/006-conversion-admin-enhancements/checklists/requirements.md` if implementation surfaced anything requiring a spec clarification not already captured.
- [ ] T055 [P] `npm run build && npm run lint` in `store/` — must pass with zero new errors/warnings.
- [ ] T056 [P] Full regression: run the entire `npm run test:e2e` suite (store + admin) — confirm zero pre-existing tests broken by this batch, per FR-006/SC-006's byte-identical requirement for Analytics.

---

## Dependencies & Execution Order

### Phase Dependencies

All 11 story phases are mutually independent except: US7/US8/US10 all land in `AnalyticsClient.tsx` (non-overlapping sections, but T047's rename should land last among the three to avoid renaming tabs mid-description of the other two); US9's consolidation (T042-045) should land before T036 (US7's inventory table) if both touch `AdminProductsClient.tsx`'s stock/merchandising helpers in the same session, to avoid rebasing. US3 and US4 share a settings-migration file (T012/T018) but are otherwise independent. Polish (Phase 12) depends on all 11 stories being complete.

### Parallel Opportunities

- T001, T004 (US1/US2 tests) can be written together; both target the same spec file but different describe blocks.
- T014, T015, T016 (US3's three consumer updates) are parallel-safe — three different files.
- T030-T034 (US6's five surface applications) are parallel-safe once T029 (the hook) exists — five different files.
- T027 (US5's three page mounts) is parallel-safe internally.
- T052, T053, T055, T056 in Polish are parallel-safe with each other; T054 depends on their findings.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (US1): T001-T003.
2. **STOP and VALIDATE**: run `quickstart.md`'s US1 section independently.
3. Deploy/demo if ready.

### Incremental Delivery

Ship story by story in priority order (US1 → US11), validating each against its `quickstart.md` section before moving to the next — every story is independently testable and independently valuable, per spec.md's design. Polish (Phase 12) is the final gate before PR.

---

## Summary

- **Total tasks**: 56 (T001-T056)
- **Per-story counts**: US1: 3, US2: 7, US3: 6, US4: 6, US5: 5, US6: 7, US7: 3, US8: 3, US9: 5, US10: 2, US11: 4, Polish: 5.
- **Suggested MVP scope**: User Story 1 only (T001-T003) — highest-traffic surface, independently shippable.
- **Confirmed live bug being fixed**: T042/T045 (US9) — Slow Mover classification already disagrees across 3 admin surfaces today; this is not a preventive refactor.
- **Scope correction found during planning**: US11 (dark mode) needed less new infrastructure than originally scoped, since Tailwind v4's dark-mode system already exists in this codebase.
