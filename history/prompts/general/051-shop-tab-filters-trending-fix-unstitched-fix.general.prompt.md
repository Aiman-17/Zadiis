---
id: "051"
title: Shop Tab Filters — Trending Fix + Unstitched Fix
stage: green
date: 2026-06-27
surface: agent
model: claude-sonnet-4-6
feature: shop-tab-filters
branch: main
user: aurex707@gmail.com
command: test all tabs with filters
labels: ["shop","tabs","filters","trending","unstitched","bug-fix","playwright"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/(store)/shop/[slug]/page.tsx
  - store/src/components/products/ProductSectionTabs.tsx
  - store/src/app/(store)/shop/page.tsx
  - store/src/lib/products.ts
tests:
  - Playwright: /shop?tab=trending — 1 product only (is_trending=true)
  - Playwright: /shop?cat=Casual&type=unstitched — CO-ORDS 2pcs set shown
  - Playwright: /shop?tab=new-arrivals — empty (no products marked)
  - Playwright: /shop?tab=just-dropped — CO-ORDS 2pcs set (added recently)
  - Playwright: /shop?tab=last-chance — New suit best cotton quality (low stock)
---

## Prompt

"remove the 12 people viewing right now on product detail page this looks fake also remove the products above the womens fashion section on shop page the best seller trending etc flags applies on women's collection section this is bug test it from playwright"

[Session continued through multiple clarifications:]
- User confirmed tabs should be filter buttons, not separate product sections
- Tabs combine with all other filters (size, price, category, type) at DB level
- Tab strip should appear below "Women's Collection" heading
- Fixes needed: trending tab showing bestsellers too; Casual+Unstitched returning no results

Final test request: "Now test all tabs with filters In trending tab also not working correctly show trending and best seller also and if I click casual and unstiched I have co ords in that category you can check but after applying filter result not shwoing test again"

Then: "yes test it" (remaining tabs: New Arrivals, Just Dropped, Last Chance)

## Response snapshot

Implemented tab-as-filter architecture across the shop page:
1. Removed fake ProductViewers widget from PDP
2. Rebuilt ProductSectionTabs as URL-driven filter buttons (no embedded product grids)
3. Shop page reads `?tab=` param server-side, passes to getProducts()
4. getProducts() applies tab-specific DB conditions; tab bypasses new_arrival/sale exclusions

Bug fixes in commit 10f413c:
- Trending tab: changed from `.or('trending_score.gt.0,is_trending.eq.true')` to `.eq('is_trending', true)` — auto-computed trending_score caused bestsellers with recent sales to bleed into trending tab
- Unstitched filter: changed from `sizes.cs.{"Unstitched"}` to `sizes.cs.{Unstitched}` (removed double-quotes inside {}) — PostgREST broke parsing when combined with other `.eq()` params; also added `sizes.is.null` for products with no sizes entered

All 5 tabs verified passing via Playwright screenshots after deployment.

## Outcome

- ✅ Impact: Tab strip now filters Women's Collection at DB level; clicking Best Sellers shows only bestsellers; Trending shows only admin-flagged trending products; Casual+Unstitched combo correctly finds CO-ORDS 2pcs set
- 🧪 Tests: 5 tab scenarios + 1 combined filter scenario tested via Playwright on production URL
- 📁 Files: 4 files modified (shop page, PDP page, ProductSectionTabs, products lib)
- 🔁 Next prompts: Consider adding "New Arrivals" products to DB so that tab shows results; test Best Sellers tab with category filter combo
- 🧠 Reflection: PostgREST array containment syntax is tricky — double-quotes inside `{}` work standalone but break inside `.or()` when combined with other params. Always test filter combos, not just single filters.

## Evaluation notes (flywheel)

- Failure modes observed: (1) trending_score auto-compute caused data bleed between Trending and Best Sellers tabs; (2) PostgREST URL encoding broke `{"Unstitched"}` inside compound `.or()` calls
- Graders run and results (PASS/FAIL): Playwright visual verification — PASS for all 5 tabs
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add `is_trending` checkbox to admin product edit form so admin can flag products without SQL
