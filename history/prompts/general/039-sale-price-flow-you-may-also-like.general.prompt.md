---
id: 039
title: Sale Price Flow End-to-End + You May Also Like
stage: green
date: 2026-06-24
surface: agent
model: claude-sonnet-4-6
feature: sales-storefront
branch: main
user: Aiman-17
command: inline implementation
labels: ["sale","storefront","cart","product-detail","bug-fix","you-may-also-like","home-page"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/lib/cart-store.ts
  - store/src/components/products/AddToCartButton.tsx
  - store/src/app/(store)/shop/[slug]/page.tsx
  - store/src/app/(store)/cart/page.tsx
  - store/src/app/(store)/page.tsx
tests:
  - manual: product on sale shows red discounted price + strikethrough + Save PKR badge on detail page
  - manual: sale urgency banner with pulsing red dot appears on product detail when on sale
  - manual: adding sale product to cart stores sale price (not regular price)
  - manual: cart shows red sale price + strikethrough original + Save PKR X green badge
  - manual: checkout total uses sale price (inherited from cart fix)
  - manual: home sale banner shows dark bg with pulsing dots and red CTA button
  - manual: You May Also Like section shows same-category products on product detail
---

## Prompt

After activation of sales there are so many bugs Home page Dont show any sales button and animation and product detail price of sales product not showing cut off price and any urgency discounted price save rs 1000 something and cuttoff price in red color create urgency and in cart and checkout page the discounted price not calculated shoing actual price and calculating actual price except delivey. Minor changes I also want You may also like products suggestion with sam fabric if category is lawn cotton and some different if customer change her mind unstiched stiched suggestion.

[Follow-up] Before any changes tell me

[Follow-up] yes go ahead

## Response snapshot

Root cause identified: `AddToCartButton` always stored `product.price` in cart regardless of any active sale. Product detail page never fetched sale data at all. Sale prices existed in the DB but nothing surfaced them to the buyer.

**Changes made:**

1. **`cart-store.ts`**: Added `originalPrice?: number` to `CartItem` type — stores the pre-sale regular price alongside the discounted cart price for savings display.

2. **`AddToCartButton.tsx`**: Added `salePrice?: number` prop. When present, stores `salePrice` as `price` and `product.price` as `originalPrice` in cart. This is the single fix that repairs both cart and checkout pricing.

3. **`shop/[slug]/page.tsx`** (major rewrite):
   - Fetches reviews + active sale + related products in parallel via `Promise.all`
   - Checks if product is in the active sale via `sale_products` table lookup
   - Shows red discounted price + strikethrough original + `Save PKR X` badge when on sale
   - Pulsing red dot urgency banner (`FEF2F2` bg, Tailwind `animate-pulse`) with sale end date if `ends_at` set
   - Passes `salePrice` to `AddToCartButton`
   - **"You May Also Like"**: queries same `category_id` products (active, excluding current, limit 4), renders as `ProductCard` grid at bottom

4. **`cart/page.tsx`**: When `item.originalPrice` > `item.price`, shows red discounted price, gray strikethrough original, green `Save PKR X` badge per item.

5. **`(store)/page.tsx`**: Sale banner upgraded — dark `#1C1C1C` background, two pulsing red dots flanking "Limited Time Sale" text, title + description, prominent red `Shop the Sale →` CTA button.

## Outcome

- ✅ Impact: All 4 sale bugs fixed. Sale price now surfaces from DB → product detail → cart → checkout in one consistent flow. The `originalPrice` field in CartItem enables savings display at cart and checkout level.
- ✅ "You May Also Like" shows same-category products below reviews — natural fabric/style similarity since categories are e.g. "Lawn Unstitched", "Cotton Stitched"
- ✅ Home banner now visually urgent with animation
- 🧪 Tests: Manual — verify with an active sale and a product in it
- 📁 Files: 5 files modified
- 🔁 Next: Consider showing "You May Also Like" on the sale page too; could add stitched/unstitched cross-category suggestions if category names are standardized

## Evaluation notes (flywheel)

- Failure modes observed: Single-point failure in AddToCartButton — one field lookup missing broke the entire sale price chain
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): Add sale badge to ProductCard on product listing pages when sale is active
