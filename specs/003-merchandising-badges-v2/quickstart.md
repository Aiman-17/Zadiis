# Quickstart: Merchandising Badges v2

## Verify the fix manually (no test framework needed)

1. Start the production build: `cd store && npm run build && npm start`
2. Open `/`, `/shop`, and `/admin/analytics?tab=products` side by side.
3. Confirm the same products carry a "Best Seller" label on all three — today
   this will show 2 products on Shop, 4 on Homepage, 5 in Analytics (the bug).
   After this feature ships, all three must match exactly.
4. In `/admin/products/[id]/edit` for a product with existing stock, increase
   its stock quantity and save. Reload the Homepage — the product should now
   appear in "Just Dropped" even though its listing is old.
5. Mark a product as Featured in the admin edit form with no dates set —
   confirm it appears in a new Featured section on the homepage/shop,
   independent of whether it's also a Best Seller or Trending.

## Key files to read before touching anything

- `store/src/lib/products.ts` — the four existing per-purpose query functions being consolidated
- `store/src/lib/scoring.ts` — where `best_seller_score`/`trending_score` are computed today (unchanged computation, only how they're *read/ranked* changes)
- `store/src/components/products/ProductCard.tsx` — the `showBestseller`/`showFire` badge logic (`best_seller_score >= 5` threshold — one of the 4 duplicated definitions)
- `store/src/app/api/admin/products/route.ts:43-64` — the existing pre-update stock read, the hook point for restock-event logging
- `specs/003-merchandising-badges-v2/research.md` — the 7 concrete decisions and why each was made this way, not the more elaborate alternative
