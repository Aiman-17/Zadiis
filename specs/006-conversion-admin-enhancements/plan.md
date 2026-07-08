# Implementation Plan: Conversion & Admin Enhancements

**Branch**: `006-conversion-admin-enhancements` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/006-conversion-admin-enhancements/spec.md` — 11 buildable-now user stories plus US12 (deferred, no plan needed).

## Summary

Eleven independent, mostly-additive improvements across the storefront and admin panel. All file:line references below were re-verified this session against the current repo state (not carried over from the earlier design notes unchanged) — several had shifted due to spec 004's US1/US2/US4 work landing since those notes were written, and two real discrepancies were found and are called out explicitly: (1) an unused Radix Dialog primitive already exists as a build-on point for US5's popups, and (2) US9's "Slow Mover" consolidation is not just closing a future-drift risk — the three existing copies **already classify the same product differently** today, a live, present bug being fixed by this work, not merely prevented.

## Technical Context

**Language/Version**: TypeScript, Next.js 16.2.7 (App Router)
**Primary Dependencies**: No new dependencies for most stories — reuses `recharts`, `lucide-react`, `@radix-ui/react-dialog` (via the existing unused `store/src/components/ui/dialog.tsx`), and Tailwind v4's already-configured class-based dark mode (`@custom-variant dark`, `globals.css`).
**Storage**: Supabase (PostgreSQL) — two new `store_settings` keys (`free_delivery_enabled`, `cancellations_enabled`, same pattern as `cod_enabled`), one new `image_colors text[]` column on `products`. No other schema changes.
**Testing**: Playwright (`store/tests/admin/**`, `store/tests/store/**`), per constitution Principle VII.
**Target Platform**: Web (Vercel) — both storefront and admin surfaces touched.
**Project Type**: Web (single Next.js app under `store/`).
**Performance Goals**: No regression to constitution Principle V; the color-matching and swipe gallery work must not add perceptible interaction latency (client-side only, no new fetches).
**Constraints**: Per spec FR-006/SC-006, every Analytics addition (US7, US8, US10) must leave existing charts/filters byte-identical. Per FR-009/SC-007, Slow Mover consolidation must be verified byte-identical against the *intended correct* behavior — which, per this session's verification, is NOT simply "whatever `AdminProductsClient.tsx` currently does," since the three copies already disagree (see Item 9 below for the resolution).
**Scale/Scope**: 11 stories, ~25 files touched across storefront + admin, 1 new schema column, 2 new settings keys, 1 new shared hook (`useLongPress`), 1 new shared merchandising function (`isSlowMover`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Customer Journey First | PASS — US1/US2/US3/US4/US5 all directly serve or protect the browse→cart→checkout journey; none complicate it (all are additive or gated behind settings defaulting to today's behavior). |
| II. Mobile-First Development | GATE — US1 (swipe gallery) and US6 (long-press) are inherently mobile-first stories; both MUST be designed/tested at 375px first per constitution, not retrofitted from desktop. |
| III. Lean MVP | PASS — every story reuses existing infrastructure (settings pattern, badge visual pattern, recharts, an existing-but-unused Dialog primitive) rather than introducing new subsystems. |
| IV. Secure & Local Payments | PASS — no payment integration changes. |
| V. Performance for Conversions | PASS — US1/US2 are client-side-only interaction changes; US5's popups must not block or delay page paint (mount closed, reveal after hydration, per the existing hydration-guard convention already used in this codebase). |
| VI. Brand Consistency | GATE — US11's dark mode MUST derive its palette from the existing brand ramp (gold/black/cream), validated via the `dataviz` skill for chart legibility, not an arbitrary dark theme; US9's Slow Mover fix must not silently change *which* products are flagged as a side effect of unrelated cleanup — the correct, single, chosen definition must be a deliberate decision (see Item 9). |
| VII. E2E Testing Mandate | GATE — every story needs Playwright coverage under `store/tests/store/**` or `store/tests/admin/**` before being considered shippable; `tasks.md` must include this per story, not as an afterthought. |

**No violations requiring Complexity Tracking.** All additive or settings-gated; the one "fix a live bug" story (US9) is scoped to a single, well-understood function.

## Project Structure

### Documentation (this feature)

```text
specs/006-conversion-admin-enhancements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output (settings API — reused pattern, documented not re-designed)
└── tasks.md              # Phase 2 output (/sp.tasks)
```

### Source Code — by story

**US1 — Swipeable gallery**
- `store/src/components/products/ProductImageGallery.tsx` (MODIFIED) — main block (lines 20-55) and fullscreen zoom block (58-102) both need independent `onTouchStart/Move/End` handlers + arrow buttons. No new dependency.

**US2 — Color-to-image matching**
- `store/supabase/color-image-tagging.sql` (NEW) — `alter table products add column if not exists image_colors text[]`, index-aligned with `images text[]` (schema.sql:18/20).
- `store/src/components/admin/ImageUploader.tsx` (MODIFIED, line 92 area) — append color tag alongside URL.
- `store/src/app/(store)/shop/[slug]/page.tsx` (MODIFIED) — new client wrapper component to lift `selectedColor` state between `ProductImageGallery` (line 177) and `AddToCartButton` (line 264), currently unrelated siblings.
- `store/src/components/products/AddToCartButton.tsx` (MODIFIED, line 172 area) — convert `selectedColor` from internal `useState` to a controlled prop.
- `store/src/components/products/ProductImageGallery.tsx` (MODIFIED further) — accept `selectedColor`/`imageColors` props, jump active index on match.

**US3 — Free delivery toggle** / **US4 — Cancellation toggle** (shared settings pattern)
- `store/supabase/` (NEW migration) — two new `store_settings` rows, same pattern as `sprint1.sql:31-33`'s `cod_enabled` seed.
- `store/src/app/admin/settings/page.tsx` (MODIFIED) — two new toggle UIs, copying the `codEnabled`/`toggleCod` pattern (lines 11, 21-33, 92-100) exactly.
- `store/src/app/(store)/checkout/page.tsx` (MODIFIED, line 183-185 area) — gate `qualifiesForFreeDelivery` behind the new setting.
- `store/src/app/(store)/shipping/page.tsx` (MODIFIED, line 18) — convert from a static sync component to reading the setting server-side; drop the free-delivery sentence when disabled.
- `store/src/app/(store)/page.tsx` (MODIFIED, line 111) — drop the Trust Bar free-delivery line when disabled.
- `store/src/components/layout/Footer.tsx` (MODIFIED, line 26) — hide "Cancel an Order" link when the cancellation setting is disabled.
- `store/src/app/(store)/cancel-order/page.tsx` (MODIFIED) — currently a single client component with no server layer (confirmed this session); needs to fetch the setting on mount (client-side, matching the `codEnabled` fetch pattern) and render an "unavailable" state + WhatsApp contact instead of the form when disabled.
- `store/src/app/api/requests/cancel/route.ts` (MODIFIED) — reject with the same unavailable message when the setting is disabled, so the API enforces this independently of the UI (defense in depth, per FR-004).

**US5 — Promo popup cards**
- `store/src/components/ui/dialog.tsx` (REUSED, not new) — an existing, currently-unused Radix Dialog primitive found this session; base the new popup component on it rather than building a dismissible-overlay pattern from scratch.
- `store/src/components/store/PromoPopup.tsx` (NEW) — sale-card and free-delivery-card variants, session-scoped via `sessionStorage`, mounted closed + revealed post-hydration (existing convention).
- Mounted from `store/src/app/(store)/page.tsx`, `store/src/app/(store)/shop/page.tsx` (or category-level layout), and `store/src/app/(store)/shop/[slug]/page.tsx` — reusing each page's existing sale-detection query (homepage: `page.tsx` line 120's `activeSale`; product page: `shop/[slug]/page.tsx` line 111's `isSaleActive`).

**US6 — Mobile long-press row actions**
- `store/src/hooks/useLongPress.ts` (NEW) — shared timer-based press-and-hold hook; no such hook or `hooks/` directory currently exists (confirmed this session).
- 5 surfaces modified: `AdminProductsClient.tsx`/`ProductActions.tsx` (Archive/Delete/Restore icons), `admin/orders/page.tsx` (Archive, ~line 462), `admin/invoices/page.tsx` (Delete, ~line 150), `admin/payments/page.tsx` (Archive/Delete/Restore, ~lines 145/160/174), `NotificationsClient.tsx` (Archive/Delete/Restore, ~lines 123/133/145) — each wraps its icon row in the `md:` breakpoint pattern already used throughout `admin/layout.tsx` (lines 128/135/156).

**US7 — Additional analytics visuals** / **US8 — Badge lift analytics** / **US10 — Tab renames**
- `store/src/components/admin/AnalyticsClient.tsx` (MODIFIED) — `Tab`/`TABS` at lines 44/591-597 (renames here); new row-level table appended in the Inventory tab body (1170-1503, near the KPI cards at 1173-1200 or alongside Slow Movers at 1404-1451); new Featured/New-Arrival charts appended in the Performance tab body (739-916, after Cities at ~913, note the YoyWidget from spec 004 already occupies line 788 — new content goes after existing Performance content, not interleaved); badge-lift comparison table added to the same tab, reusing `productMap` (line 279) the same way Best Seller charts do (line 554).
- No schema change for US7/US8 — fully derived from existing `orders`/`order_items`/`featured_start`/`new_arrival_start` data, same as spec 004's YoY widgets.

**US9 — Slow Mover consolidation (fixes a confirmed live bug)**
- `store/src/lib/merchandising.ts` (MODIFIED) — add a new `isSlowMover`/`computeStoreAvgSellThrough` pair, alongside the existing `rankBestSellers`/`rankTrending` (lines 70-88).
- **Bug found and must be resolved as part of this story, not silently**: `sales/new/page.tsx`'s average-sell-through pool excludes `is_new_arrival` products (line 36), while `AdminProductsClient.tsx` and `sales/[id]/edit/page.tsx` include them — meaning the same product can already be classified Slow Mover in one place and not another *today*. The consolidated function must pick ONE pool definition; recommend **excluding `is_new_arrival` products from the average baseline** (matching `sales/new/page.tsx`'s behavior) since a just-arrived product's low sell-through is expected and shouldn't drag down the average that everything else is judged against — but this is a real behavior decision, not a mechanical refactor, and must be called out explicitly in `tasks.md` and verified against real data, not assumed.
- Three call sites (`AdminProductsClient.tsx:42-50`, `sales/new/page.tsx:10-16`, `sales/[id]/edit/page.tsx:11-17`) updated to import the shared function.

**US11 — Admin dark mode**
- **Simpler than originally scoped** — Tailwind v4's class-based dark mode is already configured (`globals.css:6`'s `@custom-variant dark (&:is(.dark *))`, and a full `.dark {}` shadcn-token block already exists). No new dark-mode infrastructure needed.
- `store/src/app/globals.css` (MODIFIED) — add dark-mode counterparts for the brand vars (`--brand-bg`, `--brand-text`, `--brand-accent`, `--brand-border` — currently lines 42-45, with no dark equivalents) inside the existing `.dark {}` block.
- `store/src/app/admin/layout.tsx` (MODIFIED) — toggle button (near the existing bell icon, line 24 area) that adds/removes the `.dark` class on a root element and persists via `localStorage`, following the exact get/set/remove pattern already in `store/src/lib/cart-store.ts` (lines 15/20/44) for consistency.
- `store/src/components/admin/AnalyticsClient.tsx` (MODIFIED) — chart colors are hardcoded hex throughout (confirmed, not theme-variable-driven); needs a dark-mode-aware color set, derived and validated via the `dataviz` skill (same process used for spec 004's YoY widget), not an automatic inversion.

**Structure Decision**: Single existing Next.js application. New files are limited to one hook (`useLongPress`), one component (`PromoPopup`), one SQL migration, and doc artifacts — everything else extends existing files following patterns already established in this codebase.

## Complexity Tracking

*No entries — Constitution Check passed with no violations. The one non-mechanical decision (US9's average-pool definition) is a product/data decision, not an architectural complexity.*
