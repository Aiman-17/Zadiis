# BUG-004 — `stock_quantity` can silently drift from `variant_stock`, blocking real purchases and miscategorizing Last Chance

| Field | Value |
|---|---|
| **Title** | Two live products have a stale `stock_quantity` that disagrees with the true stock in `variant_stock` — one is currently unpurchasable at checkout despite appearing in stock everywhere else |
| **Severity** | High |
| **Priority** | P2 |
| **Category** | Data / Functional |
| **Component** | `store/src/app/api/orders/route.ts` (stock validation, line 59), `store/src/lib/products.ts` (`getLastChanceProducts()` and the `'last-chance'` Shop tab filter) — both read raw `stock_quantity` directly instead of the variant-aware effective-stock computation three other places in the codebase already implement independently: `store/src/lib/scoring.ts`'s `getTotalStock()`, `store/src/components/products/ProductCard.tsx`'s `getEffectiveStock()`, and `store/src/app/(store)/shop/[slug]/page.tsx`'s inline `totalStock` |
| **Environment** | Production database (confirmed against the live Supabase instance) |
| **Status** | Open — filed only, per explicit user decision; no code or data changes made |
| **Found by** | Surfaced while explaining the Last Chance section's logic during a code-review conversation on feature 003-merchandising-badges-v2; verified against live data before filing (not assumed) |
| **Date** | 2026-07-04 |

## Preconditions

- A product's `variant_stock` and top-level `stock_quantity` disagree. Confirmed live right now for 2 of the store's 7 active products — both are residue from orders placed **before** the BUG-003 `decrement_stock` fix (applied 2026-07-03) was live; that fix corrects the function going forward but does not retroactively repair rows that already drifted under the old buggy version.

## Steps to Reproduce

1. Query `products` for `name, stock_quantity, variant_stock` — compare `stock_quantity` against the sum of all values inside `variant_stock`.
2. Observe two live mismatches:
   - **"New suit best cotton quality with printed"**: `stock_quantity = 0`, `variant_stock = {"_": {"L": 1, "M": 1}}` → true stock = 2.
   - **"CO-ORDS 2pcs set"**: `stock_quantity = 7`, `variant_stock = {"Red": {"_": 5}, "Pink": {"_": 5}}` → true stock = 10.
3. Attempt to place a real order for "New suit best cotton quality with printed" (any size).

## Expected Result

The product is purchasable — it has 2 real units in `variant_stock`, and `ProductCard.tsx` (via its own `getEffectiveStock()`) already displays it as in-stock with a "Last Chance" hourglass badge (effective stock 2 ≤ 3) wherever its card renders, including the general Shop grid (which applies no stock filter for plain browsing).

## Actual Result

`store/src/app/api/orders/route.ts:59` checks `product.stock_quantity < item.quantity` using the raw top-level field, *before* ever consulting `variant_stock`. Since `stock_quantity = 0`, any order for this product is rejected with `"Sorry, ... is out of stock ... Available: 0."` — even though the product visually appears available with an urgency badge on its own card. Separately, the homepage's dedicated Last Chance section (`getLastChanceProducts()`) and the Shop's `?tab=last-chance` filter both query `.gt('stock_quantity', 0).lte('stock_quantity', 3)` directly, so this product — which should qualify (true stock 2) — is silently excluded from the exact section built to surface it.

## Root Cause

Two compounding issues:

1. **Pre-existing data drift.** Before the BUG-003 fix, `decrement_stock` always decremented `stock_quantity` but silently skipped `variant_stock` for the affected variant shapes (color-only and, per this product's shape, the equivalent size-only/`_`-color-key case). Orders placed during that window left `variant_stock` and `stock_quantity` disagreeing. The fix repairs the function; it does not repair the rows it already corrupted.
2. **No single source of truth for "effective stock."** The codebase already has three independent, mutually-consistent implementations of "prefer the sum of `variant_stock` over the raw `stock_quantity` field when variants are tracked" — `scoring.ts::getTotalStock()`, `ProductCard.tsx::getEffectiveStock()`, and an inline computation in `shop/[slug]/page.tsx`. But the two places that matter most for this symptom — checkout's stock validation and the Last Chance query — were never routed through any of them, so they trust a field that can (and, for these 2 products, currently does) disagree with what the rest of the app already knows to be true. This is the same *shape* of bug the 003-merchandising-badges-v2 feature just fixed for Best Seller/Trending/Just Dropped (multiple independently-duplicated definitions of the same concept, silently disagreeing) — just for "how much stock does this product have" instead of "does this product qualify for badge X."

## Business Impact

"New suit best cotton quality with printed" cannot be purchased via the storefront right now, in any size, despite having real stock. A customer can browse to it, see it marked as in-stock with an "almost gone" urgency badge, add it to cart, and have checkout reject the order as sold out — a broken, confusing purchase path and a direct, ongoing revenue loss for as long as this goes unfixed. "CO-ORDS 2pcs set" is not currently purchase-blocked (its drift doesn't cross the zero threshold) but is running with an inflated stock figure in any code path that trusts `variant_stock`'s sum (e.g. `scoring.ts`'s sell-through calculation), and would develop the same purchase-blocking symptom as soon as real orders bring `stock_quantity` down further.

## Technical Impact

Confirmed via live query: 2 of 7 active products (29%) currently mismatched. No crash, no exception — `orders/route.ts` returns its normal, expected-looking "out of stock" 400 response, indistinguishable from a genuinely sold-out product without directly comparing `stock_quantity` against `variant_stock`. Any other read path that trusts raw `stock_quantity` for a variant-tracked product (this bug's two flagged call sites, and potentially others not yet audited) inherits the same risk.

## Recommended Fix

1. **One-time data reconciliation** — recompute `stock_quantity` from the true sum of `variant_stock` for the 2 currently-affected rows (a targeted `UPDATE`, handed to the user as copy-paste SQL per this project's established pattern — no direct DDL/data-write access available).
2. **Consolidate the effective-stock logic** — extract one shared function (the same computation already duplicated three times) into a shared module, and route `orders/route.ts`'s stock validation and `products.ts`'s Last Chance query/section through it instead of raw `stock_quantity`, so this class of drift can no longer silently block a real purchase or miscategorize Last Chance again.

## Regression Risk

Low for the data reconciliation (idempotent single-row `UPDATE`s, no schema change). Medium for the code consolidation — it touches checkout's stock-validation path, which is sensitive; needs regression coverage confirming order placement still correctly rejects genuinely-sold-out products (both variant-tracked and non-variant) before/after the change, not just that it now accepts the 2 currently-blocked ones. No existing Playwright spec asserts on the relationship between `stock_quantity` and `variant_stock` after an order or admin edit — new coverage would be needed alongside any fix.
