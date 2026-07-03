# BUG-003 — Color-only variant stock never decrements on order (size defaults to `_`)

| Field | Value |
|---|---|
| **Title** | Inventory — `variant_stock[color]` is frozen forever for products that track color but not size |
| **Severity** | High |
| **Priority** | P2 |
| **Category** | Data / Functional |
| **Component** | `decrement_stock` Postgres RPC (`supabase/migrations/sprint4_combined.sql`), called from `store/src/app/api/orders/route.ts` and `store/src/app/api/payments/tracker/route.ts` |
| **Environment** | Production database (confirmed against the live Supabase instance, not a local/mocked copy) |
| **Status** | Fixed 2026-07-03 — user applied `supabase/migrations/2026-07-03-fix-decrement-stock-color-only.sql` directly to production; regression test `store/tests/admin/inventory-stock-decrement.spec.ts` un-fixme'd and run live: both `stock_quantity` and `variant_stock[color]["_"]` correctly decremented by 1 on a real order (2/2 passed) |
| **Found by** | User report: "the bug is color stock number are not decreasing" |
| **Date** | 2026-07-03 |

## Preconditions

- A product has `variant_stock` set with colors but no size options (e.g. `{"Pista peach": {"_": 7}}` — this store uses the literal string `_` as the size key whenever a product doesn't track sizes; confirmed live on product "Best pakistani dress", id `74dc2fbf-17af-417c-ab92-76711ba388fc`).
- A customer places any order (COD or online payment) for that color.

## Steps to Reproduce

1. Note a color-only product's `variant_stock[color]["_"]` value in the database (e.g. "Pista peach": 7).
2. Place a real order for that product/color (any payment method).
3. Re-query the product's `variant_stock` after the order completes.

## Expected Result

`variant_stock["Pista peach"]["_"]` decreases by the ordered quantity, exactly like `stock_quantity` does.

## Actual Result

`stock_quantity` (the aggregate count) correctly decreases. `variant_stock["Pista peach"]["_"]` does not change at all — it stays at its original value indefinitely, no matter how many orders are placed for that color.

## Root Cause

`decrement_stock` in `supabase/migrations/sprint4_combined.sql` (lines 46–86) only takes the variant-decrement branch when **both** dimensions are non-placeholder:

```sql
IF v_current IS NOT NULL AND v_current <> '{}'::jsonb
   AND p_color <> '_' AND p_size <> '_' THEN
  -- decrement variant_stock[p_color][p_size]
  ...
END IF;
-- Fallback: just decrement stock_quantity
```

The application always calls this RPC with `p_size: item.size || '_'` (`store/src/app/api/orders/route.ts:130`, and identically in `payments/tracker/route.ts:149`). For a product that only tracks color, the frontend's `selectedSize` state is never set (`AddToCartButton.tsx` only sets a size when `hasSizes` is true), so `item.size` is always `''`, which resolves to `p_size = '_'`.

Because the data model already uses the literal key `'_'` to mean "no size dimension" *inside* `variant_stock` itself (`{"Pista peach": {"_": 7}}`), the guard's `p_size <> '_'` check is testing for exactly the value that legitimately occurs on every single order for these products. The condition can never be true for a color-only product, so the function always falls through to the "just decrement total" branch and `variant_stock` is never touched.

Products that track both color **and** size are unaffected — for those, `p_size` is a real size string (e.g. `"M"`) and the guard passes normally.

Confirmed empirically: calling the RPC directly against the live database with a nonexistent product id and `p_color`/`p_size` params returned `204` (the 4-parameter function exists and is callable) — no separate mismatch/version-drift issue; this is a live logic bug in the deployed function, not a stale-vs-live signature mismatch.

## Business Impact

For any product configured with colors but no sizes — apparently a common configuration in this catalog — the per-color "in stock" number shown to customers (via `AddToCartButton.tsx`'s "Only X left" messaging and color-availability gating) never reflects actual sales. Over time this number becomes increasingly wrong, in the optimistic direction: it will keep showing stock as available for a color that has, in reality, sold through, until the *aggregate* `stock_quantity` (which does update correctly) eventually hits zero. Between those two points, customers can order a specific color that is actually out of stock, and the storefront will keep advertising it as available. This risks orders that can't be fulfilled in the customer's chosen color, refunds/exchanges, and customer trust — with no error or warning anywhere in the system, since nothing throws; the wrong branch just runs silently every time.

## Technical Impact

Data drift only — no crash, no exception, no user-facing error. `variant_stock` entries for affected products silently diverge from reality with every order. Any other feature that reads `variant_stock` for color-only products (dashboard "Only 2 left" stock warnings, the Merchandise "Trending Now" tooltip's stock line, `AddToCartButton` availability gating) is working off stale numbers.

## Recommended Fix

Change the guard in `decrement_stock` from requiring *both* dimensions to be non-placeholder to attempting a variant decrement whenever the color key actually exists in `variant_stock`, regardless of whether size is the `_` placeholder:

```sql
IF v_current IS NOT NULL AND v_current ? p_color THEN
  v_qty := COALESCE((v_current -> p_color -> p_size)::integer, 0);
  ...
```

i.e. drop the `p_color <> '_' AND p_size <> '_'` condition and instead check that `p_color` is a real key present in the stored JSONB (`v_current ? p_color`), since `p_size = '_'` is a valid, expected key inside that JSONB rather than a sentinel meaning "skip variant tracking."

## Regression Risk

Low-medium — the fix is isolated to one SQL function's guard clause and doesn't change its signature or the two call sites. Must re-verify: (1) color-only products decrement correctly per-color after an order, (2) color+size products continue to decrement correctly (no regression), (3) products with no variant tracking at all (`variant_stock = '{}'`) still only decrement `stock_quantity` via the fallback path. No existing Playwright spec currently asserts on `variant_stock` values after an order — this would need new coverage (e.g. `order-confirmation.spec.ts` or a new inventory-focused spec) since the current suite only checks that the *order* succeeds, not that stock fields end up correct afterward.
