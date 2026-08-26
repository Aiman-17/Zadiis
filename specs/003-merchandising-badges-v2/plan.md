# Implementation Plan: Merchandising Badges v2

**Branch**: `003-merchandising-badges-v2` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-merchandising-badges-v2/spec.md`

## Summary

Consolidate four independently-duplicated Best Seller/Trending/Just Dropped
queries (ProductCard badge threshold, homepage section builder, Analytics
chart filter, Shop tab filter) into one shared computation every consuming
page calls. Make Best Seller and Trending category-relative (normalized
within `product_category`, falling back to raw global score when
uncategorized) with a catalog-size-aware minimum sales floor that fixes a
confirmed scoring flaw (a 1-unit sellout outranking a genuine repeat seller).
Switch Just Dropped from `created_at` to real restock events, reusing an
already-defined-but-unused `'restock'` reason in `stock_movements`. Replace
the permanent `is_bestseller`/`is_trending` manual flags with a new
date-bounded "Featured" designation, mirroring the existing New Arrival
pattern.

## Technical Context

**Language/Version**: TypeScript, Next.js 16.2.7 (App Router)
**Primary Dependencies**: none new — reuses existing Supabase client, existing `recalculateScores`/cron infrastructure in `store/src/lib/scoring.ts`
**Storage**: Supabase (PostgreSQL) — 3 new columns on `products` (`is_featured`, `featured_start`, `featured_end`); no new tables; `stock_movements.reason='restock'` gets its first actual writer
**Testing**: Playwright (`@playwright/test`), `store` and `admin` projects, following existing conventions (real server, mocked network boundaries only where destructive/external)
**Target Platform**: Web (mobile-first per constitution)
**Project Type**: Web (single Next.js app, `store/`)
**Performance Goals**: No new page-load-blocking queries — category-relative normalization computed in the same request that already fetches products, not a separate round-trip; restock detection reuses an existing pre-update read (no new query added to the admin save path)
**Constraints**: Must not regress the existing nightly/on-order score recalculation (`src/lib/scoring.ts`); must not break the existing New Arrival feature it's structurally mirroring for Featured
**Scale/Scope**: 7-product catalog today (verified live) — every numeric constant (minimum sales floor, display cap) is deliberately set for this scale per research.md, not a hypothetical future catalog size

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Customer Journey First** — PASS. Fixes a real, confirmed defect (inconsistent badges) that actively undermines trust in the browse experience; no new friction added.
- **II. Mobile-First Development** — GATE ITEM: the new Featured section's card layout must be verified at 375px before merge, same as the checkout send-button was.
- **III. Lean MVP — Scalable by Design** — PASS, directly informed this plan's central discipline: this feature was explicitly scoped down from two more ambitious external proposals (7-layer merchandising engine, per-collection leaderboards) specifically because the current 7-product, 71%-uncategorized catalog can't support them yet. FR-016 encodes the deferral with re-entry conditions rather than silently dropping the ideas.
- **IV. Secure & Local Payments** — N/A, no payment code touched.
- **V. Performance for Conversions** — PASS. See Performance Goals above — no added round-trips.
- **VI. Brand Consistency** — N/A, no new visual identity decisions; Featured section reuses existing `ProductCard`/section-row patterns.
- **VII. End-to-End Testing Mandate** — GATE ITEM. Must add/update Playwright coverage proving: (a) Best Seller/Trending sets are identical across Shop, Homepage, and Analytics in the same test run (the actual SC-001/SC-002 claims), (b) the anti-sellout-gaming fix holds against real seeded data shaped like the audit finding, (c) a restock event surfaces a pre-existing product in Just Dropped, (d) Featured is independent of Best Seller/Trending. No merge without this.

**Result**: PASS. No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/003-merchandising-badges-v2/
├── plan.md              # This file
├── spec.md              # Already complete
├── research.md          # Phase 0 output — 7 concrete decisions
├── data-model.md         # Phase 1 output — schema + entity mapping
├── checklists/
│   └── requirements.md  # Already complete, all items pass
└── tasks.md             # Phase 2 output (/sp.tasks — next command)
```

No `contracts/` — this feature adds no new externally-consumed API surface.
The "one shared computation" from FR-001 is an internal server-side module
(`src/lib/merchandising.ts`, new) called from existing server components and
the existing `/api/admin/products` route — not a new public endpoint other
systems integrate against. The admin product edit form already POSTs/PUTs to
`/api/admin/products`; this feature changes what fields that payload includes
(`is_featured`/`featured_start`/`featured_end` added, `is_bestseller`/
`is_trending` no longer read) but doesn't introduce a new contract shape
worth a separate OpenAPI artifact.

### Source Code (repository root)

```text
store/
├── src/lib/
│   ├── merchandising.ts          # NEW — single source of truth: getBestSellers(), getTrending(), getJustDropped()
│   ├── products.ts               # MODIFIED — getBestsellerProducts/getTrendingProducts/getJustDroppedProducts delegate to merchandising.ts instead of each having their own query logic
│   └── scoring.ts                # MODIFIED — category-relative normalization applied where scores are read/ranked (research.md #1), not where they're computed/stored
├── src/components/products/
│   └── ProductCard.tsx           # MODIFIED — badge display reads the shared merchandising result instead of a hardcoded score>=5 threshold
├── src/components/admin/
│   ├── AnalyticsClient.tsx       # MODIFIED — bestSellerChartData/trendingChartData delegate to merchandising.ts
│   └── DashboardCharts.tsx       # MODIFIED — Trending Now chart delegates to merchandising.ts (currently has its own is_trending||score>0 filter — this is exactly the 4th duplicated definition FR-001 targets)
├── src/app/(store)/page.tsx      # MODIFIED — Best Sellers/Trending/Just Dropped sections call merchandising.ts; badge-forcing prop removed since ProductCard now reads the real shared result
├── src/app/admin/products/new/page.tsx           # MODIFIED — remove is_bestseller/is_trending toggle buttons, add is_featured + optional date range (mirrors is_new_arrival fields already in this file)
├── src/app/admin/products/[id]/edit/EditProductForm.tsx  # MODIFIED — same change as above
├── src/app/api/admin/products/route.ts           # MODIFIED — PUT handler: broaden restock detection from old===0 to new>old, insert stock_movements reason='restock'; POST handler: insert reason='restock' on initial stock>0
└── tests/
    ├── store/merchandising-consistency.spec.ts    # NEW — cross-page consistency (SC-001, SC-002)
    └── admin/merchandising-scoring.spec.ts         # NEW — anti-gaming fix, restock-based Just Dropped, Featured independence
```

**Structure Decision**: One new lib module is the architectural core (FR-001);
everything else is existing files losing their private duplicate logic in
favor of calling it. No new routes, no new pages — Featured reuses the
existing product-card/section-row rendering already proven by every other
merchandising section on the homepage and shop page.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*
