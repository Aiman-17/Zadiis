---
id: 079
title: Fix Sale filter, add Home nav link
stage: green
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["shop", "filters", "sale", "navbar", "bug"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/lib/products.ts
 - store/src/app/(store)/shop/page.tsx
 - store/src/components/products/ProductSectionTabs.tsx
 - store/src/components/products/ProductFilters.tsx
 - store/src/components/layout/Header.tsx
 - store/src/app/(store)/sale/page.tsx
tests:
 - typecheck: npx tsc --noEmit (clean)
 - build: npm run build (clean)
 - manual: fetched /shop?tab=sale live and confirmed all 4 real products from the active "Flat Sale" render (elegant-dress, girls-suit, co-ords-2pcs-set, suit-for-women), each with the correct salePrice in the RSC payload (2396, 360, 450, 1797, matching actual sale_products rows); confirmed /shop no longer exposes a broken cat=Sale button; confirmed "Home" link renders in the nav; confirmed only #C62828 (no #1E3A8A) appears anywhere sale-related after the follow-up color revert
---

## Prompt

> the sale btn is not filtering sale prodcut I think there are bugs on store filters section also add home page link on navbar.

> also change nav sale color to red (this is blue now)

> yes

## Response snapshot

Root cause: the "Sale" button in `ProductFilters.tsx` was modeled as a fake `product_category` value (`updateParam('cat', 'Sale')`), and `getProducts()` filters `.eq('product_category', filters.category)` — "Sale" was never a real category, so it always returned zero products. Additionally, even without that mismatch, default browsing explicitly excludes sale products (they have their own dedicated `/sale` page) unless the request goes through the `tab` param, which "Sale" never did.

Fixed by giving Sale a proper home in the existing tab system (matching Trending/New Arrivals/Best Sellers/Last Chance):
- `lib/products.ts`: renamed the private `getActiveSaleExcludeIds` → `getActiveSaleProductIds` (same underlying query, now reused for both excluding and including) and added a `case 'sale'` branch to the tab switch that filters to the active sale's real product ids.
- `ProductSectionTabs.tsx`: added a "Sale" tab (shown only when `hasSale` is true), moved the `hasSale` prop here from `ProductFilters`.
- `ProductFilters.tsx`: removed the broken pseudo-category entirely.
- `shop/page.tsx`: also fixed a related gap — the shop grid never fetched sale prices for any product, so even once sale products were correctly returned, their discount badge wouldn't have shown. Added the same sale-price-map fetch pattern already proven on the product detail page.

Added a "Home" link to both desktop and mobile nav in `Header.tsx`, first item before Shop.

Follow-up: user asked to change the nav "Sale" link color back to red (it had been left blue in [[sale-color-blue-rebrand]] as a "branding, not badge" exception). Given the clear preference, also reverted the `/sale` page hero eyebrow text to red and set the newly-added Sale tab's accent to red from the start, so there is no remaining blue anywhere in sale-related UI.

## Outcome

- ✅ Impact: the Sale filter/tab now actually shows the products in the active sale (previously always empty); those products correctly display their discount badge; navbar has an explicit Home link; all sale-related UI is uniformly red.
- 🧪 Tests: typecheck + build clean; live verification of /shop?tab=sale against real sale data, nav Home link presence, and full removal of blue from sale UI.
- 📁 Files: store/src/lib/products.ts, store/src/app/(store)/shop/page.tsx, store/src/components/products/ProductSectionTabs.tsx, store/src/components/products/ProductFilters.tsx, store/src/components/layout/Header.tsx, store/src/app/(store)/sale/page.tsx
- 🔁 Next prompts: none identified
- 🧠 Reflection: the "Sale" filter bug is a good example of a feature added by extending the wrong mechanism (category list) instead of the one already built for exactly this purpose (the tab system) — worth watching for similar "looks like it fits the existing list" shortcuts elsewhere.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): live /shop?tab=sale product/salePrice verification — PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
