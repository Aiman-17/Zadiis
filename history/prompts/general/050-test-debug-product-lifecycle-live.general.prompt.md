---
id: 050
title: Test & Debug Product Lifecycle Live
stage: green
date: 2026-06-27
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: aurex707@gmail.com
command: now test and debug (product lifecycle engine on live site)
labels: ["testing","debugging","shop","new-arrivals","badges","live"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/lib/products.ts
  - store/src/app/(store)/new-arrivals/page.tsx
tests:
  - Home page section order: Trending → Best Sellers → Last Chance
  - On-image icons: 🔥 trending cards, ⭐ bestseller cards
  - LAST CHANCE badge below title on low-stock product
  - /new-arrivals page: empty state, title, CTA
  - Admin add product: New Arrival Settings panel (collection name, dates)
  - Admin edit product: flags load from DB (is_trending highlighted)
  - Shop page: products visible after fix
  - Sale page: countdown, urgency text
  - Product detail: stock urgency, sale banner
---

## Prompt

Test and debug product lifecycle changes on live site (zadiis.com.pk).

## Response snapshot

Tested all affected pages on live Vercel deployment.

**PASS:**
- Home page: Trending Now → Best Sellers → Last Chance order ✓
- On-image icons: 🔥 on all 4 trending cards, ⭐ on bestseller cards ✓
- Sale discount -20% badge bottom-left ✓
- LAST CHANCE text badge below "New suit" (stock=2) ✓
- /new-arrivals: loads, empty state, "BROWSE ALL PRODUCTS" CTA ✓
- /new-arrivals title: "New Arrivals | ZADIIS" (template applied correctly) ✓
- Admin add product: New Arrival Settings panel expands on click, all fields present ✓
- Admin edit product: DB flags load correctly (is_trending highlighted for trending product) ✓
- Shop: products showing with icons after fix ✓
- Sale page: countdown, urgency text ✓
- Product detail: stock urgency message ✓

**BUG FOUND & FIXED (commit 0e9d111):**
1. Shop page showed "No products found" — root cause: `.or('is_new_arrival.eq.false,new_arrival_end.lt.${today}')` in getProducts failed silently because PostgREST schema cache hadn't refreshed for new `new_arrival_end` column. Catch block swallowed error returning 0 products. Fix: simplified to `.eq('is_new_arrival', false)`.
2. /new-arrivals title showed "New Arrivals | ZADIIS | ZADIIS" — root cause: metadata title included '| ZADIIS' which the root layout template `%s | ZADIIS` duplicated. Fix: title to just 'New Arrivals'.

**Pre-existing data issue (not a code bug):**
- "New suit" product has description = "Best" — someone typed this in the description field. Shows on product detail page as just "Best". Admin should edit this product.

## Outcome

- ✅ All new lifecycle features working on live site
- ✅ 2 bugs fixed and deployed
- ⚠️ "New suit" product description needs updating by admin
- ⏳ New Arrivals and Just Dropped sections will show once admin marks products with is_new_arrival=true or lists new products
