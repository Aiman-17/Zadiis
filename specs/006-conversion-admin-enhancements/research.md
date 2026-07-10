# Research: Conversion & Admin Enhancements

No `NEEDS CLARIFICATION` markers remain. All decisions below were verified this session against the current repo state via 4 parallel Explore agents re-checking every file:line reference — several had shifted since the source design notes were written (spec 004's US1/US2/US4 landed in between), and two real discrepancies were found (noted in Decisions 4 and 9).

## Decision 1: Swipe via native touch handlers, no carousel library

Matches the existing fully-custom, no-framer-motion pattern already in `ProductImageGallery.tsx`. The fullscreen zoom modal (lines 58-102) is a separate JSX block from the main gallery view (20-55) — confirmed this session still true — so handlers must be added to both independently, or the modal will silently lack swipe support.

## Decision 2: `image_colors text[]`, index-aligned with `images`, not a schema restructure

A parallel array column (not `jsonb[]`) is the lower-risk choice — no type change needed in `ImageUploader.tsx`'s upload flow (still just appends a URL, now also appends a color/null in lockstep). Confirmed no such column exists anywhere in the schema or any of the 14 migration files this session (`image_colors|color_image|colorImage|imageColors` — zero matches).

**State wiring correction**: `ProductImageGallery` and `AddToCartButton` are rendered as independent siblings from `shop/[slug]/page.tsx` (lines 177/264 respectively, confirmed fresh this session) — `AddToCartButton` already owns its own `selectedColor` state (line 172) used for variant-stock lookups. Lifting color selection to a shared parent means converting it from uncontrolled to controlled (accept `selectedColor`/`onColorChange` props), a real refactor of that component's state model, not just prop-threading.

## Decision 3: Two new `store_settings` keys, exact `cod_enabled` pattern

`store_settings` (key/value, `sprint1.sql:13`) and the generic `/api/admin/settings` route need zero changes — adding a key is purely a new seed row + new admin toggle UI, following `codEnabled`'s exact fetch/toggle pattern (`admin/settings/page.tsx:11,21-33,92-100`, confirmed unchanged this session).

## Decision 4: Cancellation gating needs new scaffolding — `/cancel-order` has no server layer

**Discrepancy found this session**: `cancel-order/page.tsx` is a single 168-line client component with its own form and submit logic — no server component wrapper, no existing setting-read scaffolding. Two options: (a) fetch the setting client-side on mount, matching the `codEnabled` pattern exactly for consistency, or (b) add a thin server parent that reads `store_settings` and conditionally renders. **Decision: (a)**, client-side fetch — keeps the change localized to the existing file, matches the one settings-consumption pattern already established elsewhere in the storefront (`checkout/page.tsx`'s `cod_enabled` read via `/api/delivery-zones`), and avoids introducing a second consumption pattern for the same kind of setting.

The API route (`api/requests/cancel/route.ts`) must independently reject when disabled — the UI hiding the form is not sufficient enforcement (FR-004's explicit "both, not just the link" requirement, driven by the merchant's stated friction-lever rationale).

## Decision 5: Free-delivery copy removal — two consumers, not one

Confirmed this session: the homepage Trust Bar (`page.tsx:111`) and the Shipping Info page (`shipping/page.tsx:18`) both carry free-delivery copy that must be conditionally removed. `shipping/page.tsx` is currently a synchronous server component with zero data fetching (confirmed — no `'use client'`, no hooks, no async) — converting it to read the setting means making it `async` and fetching `store_settings` server-side, not just editing a string.

## Decision 6: Popup built on an existing, unused Dialog primitive

**Discrepancy found this session**: `store/src/components/ui/dialog.tsx` (a Radix-based, shadcn-generated Dialog primitive) already exists in the codebase but has zero current importers anywhere in `store/src` — the earlier design notes' claim that "no popup/modal/dialog component exists" was one level too broad. It exists, unused. Building `PromoPopup.tsx` on top of this primitive (rather than a bespoke overlay) is less code and matches whatever accessibility/focus-trap behavior the shadcn generator already wired in.

Sale detection is already computed server-side on both target pages (`page.tsx:120`'s `activeSale`, `shop/[slug]/page.tsx:111`'s `isSaleActive`) — the popup consumes these as props, no new query.

## Decision 7: `useLongPress` as a new shared hook, not duplicated 5×

No `store/src/hooks` directory currently exists (confirmed). A single `useLongPress(onLongPress, { threshold })` hook, mounted per-row on the 5 affected surfaces, keeps the timer logic in one place. Each surface still owns its own confirm()/action logic — the hook only controls *visibility* of the action icons, per FR-006's explicit "same confirmation behavior, only how it's reached changes."

## Decision 8: Analytics additions land after existing content, not interleaved

Confirmed fresh line numbers this session (shifted since spec 004's YoyWidget insertions): Performance tab body now runs 739-916 with the YoyWidget already at line 788; new Featured/New-Arrival charts append after the existing Cities section (~913), not before or between existing sections — preserves the "existing charts unchanged" guarantee (FR-007) by construction, since nothing existing is touched, only appended to.

## Decision 9: Slow Mover consolidation resolves a confirmed live bug, not just a future risk

**Discrepancy found this session — upgraded from "risk" to "confirmed bug"**: the three `isSlowMover` copies are not just independently-maintained (a drift *risk*) — they already disagree *today*. `sales/new/page.tsx`'s average-sell-through baseline pool excludes `is_new_arrival` products (line 36), while `AdminProductsClient.tsx` and `sales/[id]/edit/page.tsx`'s pools include them. Since the Slow Mover threshold is "sell-through < 50% of the average," a different average produces a different classification for the same product depending on which of the three surfaces the merchant is looking at.

**Decision**: the consolidated function excludes `is_new_arrival` products from the average baseline (adopting `sales/new/page.tsx`'s behavior as correct) — a just-launched product's necessarily-low sell-through shouldn't drag down the bar every other product is judged against. This is a genuine product decision, not a mechanical refactor, and is called out as its own task requiring verification against real product data before being considered done (FR-009/SC-007 require the *consolidated* behavior to be verified consistent, not the *original*, already-inconsistent behavior to be preserved).

## Decision 10: Dark mode infrastructure already exists — scope is smaller than originally planned

**Discrepancy found this session**: Tailwind v4's class-based dark mode is already fully configured in `globals.css` — `@custom-variant dark (&:is(.dark *))` (line 6) plus a complete `.dark {}` shadcn-token block. The only gap is that this store's own brand variables (`--brand-bg`, `--brand-text`, `--brand-accent`, `--brand-border`, lines 42-45) have no dark-mode counterparts registered inside that block yet. This means US11 needs: (a) brand-var dark values, (b) a toggle button + `localStorage` persistence (following `cart-store.ts`'s exact get/set/remove pattern, lines 15/20/44, for consistency), and (c) a dark-mode-aware chart palette for `AnalyticsClient.tsx` (colors confirmed still hardcoded hex, not theme-variable-driven) — not a dark-mode system built from scratch.

**Chart palette approach**: invoke the `dataviz` skill during implementation to derive and validate (via `validate_palette.js`) a dark-mode chart palette from the same brand ramp, exactly as done for spec 004's YoY widget — dark mode is a *selected*, separately-validated palette per the skill's explicit rule, not an automatic inversion of the light-mode colors.

**Follow-up found post-launch (2026-07-09)**: user-reported dark mode looked "ugly," with text hidden and colors "too saturated for a dashboard theme." Two distinct root causes, both fixed:
1. A code-level audit found ~20 leftover `text-gray-*`/`bg-gray-*` Tailwind utilities across `VariantStockGrid.tsx`, `ImageUploader.tsx`, `AdminProductsClient.tsx`, `AnalyticsClient.tsx`, and 7 other admin files — never converted to the `--admin-*` CSS-variable system this decision established. All converted; zero-tolerance grep sweep confirmed clean.
2. The deeper issue: five semantic status colors (success/critical/warning/info/violet) were hardcoded identically in light and dark mode — Tailwind-500 swatches that read as neon/saturated against the `#171717`/`#232323` dark surface (the same hex reads louder on a dark neutral than a light one — simultaneous contrast). Desaturated dark-mode substitutes were computed and validated via `validate_palette.js` against surface `#232323` (2 failed iterations before all four checks — lightness band, chroma floor, CVD separation, contrast — passed): `success #30A46C`, `critical #E5484D`, `warning #B8770F`, `info #1798D6`, `violet #A855F7`. Centralized in a new `store/src/lib/adminColors.ts` (`getAdminStatusColors(isDark)`) and wired into all 17 admin files that used the light-only hex literals — the same consolidation pattern as `merchandising.ts`.

**Known gap, not yet fixed**: `app/admin/sales/page.tsx` and `app/admin/cod/page.tsx` are React Server Components; `useAdminDarkMode()` is a client-only hook, so each page's one remaining KPI-color literal needs either a client-component conversion or an extracted client subcomponent before it can pick up the validated palette. Flagged for a follow-up pass, not silently left inconsistent with the rest.
