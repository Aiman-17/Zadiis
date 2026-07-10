---
id: 076
title: Sale discount tag and analytics window fix
stage: green
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["sale", "product-detail", "analytics", "bug"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/app/(store)/shop/[slug]/page.tsx
 - store/src/components/products/ProductSlider.tsx
 - store/src/app/api/admin/sales/[id]/analytics/route.ts
tests:
 - typecheck: npx tsc --noEmit (clean)
 - build: npm run build (clean)
 - manual: fetched a live product page (suit-for-women, related to Elegant dress/Girls Suit/CO-ORDS 2pcs set — all in the currently active "Flat Sale") and confirmed the server payload now includes a correctly populated salePriceMap (e.g. {"340ac868-...":360,"57250430-...":2396,...}), matching real sale prices — previously this was never fetched at all
 - manual: called /api/admin/sales/{id}/analytics for "Eid SALE" (85a727b7, window 2026-06-24–27) and "Flat Sale" (aa8bd1ae, window 2026-07-04–05), both of which reuse product "Elegant dress" (6c7caf9b). Confirmed a real June 26 order for that product now attributes correctly only to Eid SALE (units_sold:1, has_orders:true) and is excluded from Flat Sale (units_sold:0, has_orders:false) — before the fix it would have leaked into both since the query only checked product-id membership, not order date vs. sale window
---

## Prompt

> there are two minor bugs in sale on a productdetail page when the sale prodcut is shown in this is for you section the percent tag of prodcuts -70 is not showing(and everyting is working correctly on store)
> The second is the sale anlytics also showing a previous sale data on that items only who were added in previos sale. also the kpi is not listing.

> yes

## Response snapshot

Investigated both bugs (research delegated to an Explore subagent, findings verified directly against the code):

**Bug 1** — `shop/[slug]/page.tsx` fetches `relatedProducts` for the "This Is For You" section but never joined `sale_products` for them. `ProductCard`'s `-XX%` badge is computed exclusively from a `salePrice` prop (never from any field on `product` itself — confirmed by comparing against `/sale` and the homepage, which both already pass `salePrice` correctly). `ProductSlider` (the wrapper used only by this section) never had a prop to forward one. Fixed by batching a `sale_products` lookup for all `relatedProducts` ids when an active sale exists, building a `salePriceMap`, and threading it through `ProductSlider` → `ProductCard`.

**Bug 2** — the sale analytics API (`api/admin/sales/[id]/analytics/route.ts`) matched orders to the viewed sale purely by product-ID membership in `sale.sale_products`, with **no date-window check at all**. Since this store's sales have been reusing the same products across several short-lived test sales (confirmed live: product "Elegant dress" appears in 5 different sales), any order placed during one sale's window got misattributed to every other sale that later also included that product — exactly the "previous sale data" symptom. Fixed by scoping `relevantOrders` to the viewed sale's own `starts_at`–`ends_at` window (falling back to `created_at` when `starts_at` is null, matching how sales are actually created — `starts_at` is optional).

Investigated "KPI is not listing" but did not find a separate bug: `has_orders` (which gates the KPI card row) is computed from the same query, and the original *unscoped* logic could only ever over-include orders, never under-include — so it can't explain KPIs failing to show for a sale that has genuine orders. After the fix, a sale with zero real orders in its own window correctly shows "Margin Preview" instead of live KPIs — that's intentional, not a bug. Told the user this and asked them to name a specific sale if they still see missing KPIs where real orders exist, so it can be investigated with actual data.

## Outcome

- ✅ Impact: sale products now show their discount badge in the product detail page's "This Is For You" section; sale analytics no longer commingles revenue/units across sales that reuse the same product.
- 🧪 Tests: typecheck + build clean; live verification of both fixes against real store data (a genuine reused product across 5 test sales, and a real order proving the before/after attribution difference).
- 📁 Files: store/src/app/(store)/shop/[slug]/page.tsx, store/src/components/products/ProductSlider.tsx, store/src/app/api/admin/sales/[id]/analytics/route.ts
- 🔁 Next prompts: if a specific sale still shows no KPIs despite having real orders in its own window, investigate that sale's actual order data directly
- 🧠 Reflection: the store's own test data (one product reused across 5 short-lived sales within the same day) turned out to be a perfect, already-existing reproduction case for the stale-analytics bug — no synthetic test data needed to prove the fix.

## Evaluation notes (flywheel)

- Failure modes observed: initial curl-based check for the discount badge came up empty because ProductSlider/ProductCard are client components — the final rendered `-70%` DOM only exists after browser hydration, not in the server-sent HTML. Had to instead verify the RSC flight payload contained the correctly-populated `salePriceMap`, which is the actual data dependency that was broken.
- Graders run and results (PASS/FAIL): live before/after order-attribution check across two real sales sharing a product — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
