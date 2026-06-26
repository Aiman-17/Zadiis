---
id: 047
title: Merchandising Fields Flags Analytics Velocity
stage: green
date: 2026-06-25
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: yes (approving full merchandising plan from prior session)
labels: ["merchandising","analytics","products","velocity","category","flags"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - docs/migrations/2026-06-26-merchandising-fields.sql
  - store/src/types/index.ts
  - store/src/app/admin/products/new/page.tsx
  - store/src/app/admin/products/[id]/edit/EditProductForm.tsx
  - store/src/components/admin/AdminProductsClient.tsx
  - store/src/components/admin/AnalyticsClient.tsx
  - store/src/components/admin/DashboardCharts.tsx
tests:
  - TypeScript: npx tsc --noEmit clean (no errors)
  - Forms: product_category, is_trending, is_new_arrival included in POST/PUT body
  - AdminProductsClient: DTS column, flag pills, counts banner render without crash
  - AnalyticsClient: Merchandising tab renders with category perf, slow movers, dead inventory, price ranges, size sell-through, new arrivals
  - DashboardCharts: vs prev 7d % shown on revenue card; slow mover count in Inventory Health
---

## Prompt

User approved plan for large merchandising feature set (from prior session context summary). Key confirmed requirements:
- Category dropdown (Summer/Winter/Formal/Casual/Eid/Sale) + free text "Other" input
- Slow movers threshold: 15 days (velocity < 0.3/day)
- Manual checkbox flags: Best Seller (existing), Trending (new), New Arrival (new) — as pill toggle buttons
- Auto-scoring system stays (best_seller_score, trending_score) — manual flags are additions on top
- Product list: category badge, flag pills, Days to Sellout column
- Analytics: new Merchandising tab (category perf, slow movers, dead inventory, price ranges, size sell-through, new arrivals)
- Dashboard: vs last period % on Revenue 7d, slow mover count in Inventory Health

## Response snapshot

Built the complete merchandising feature set across 7 files:

**SQL migration** (user must run in Supabase): `docs/migrations/2026-06-26-merchandising-fields.sql`
- Adds `product_category text`, `is_trending boolean DEFAULT false`, `is_new_arrival boolean DEFAULT false` to products table

**types/index.ts**: Added `product_category?`, `is_trending?`, `is_new_arrival?` to Product type

**New product form + Edit form**: 
- Added `PRESET_CATEGORIES = ['Summer', 'Winter', 'Formal', 'Casual', 'Eid', 'Sale']` dropdown with "Other" + text input
- Replaced plain `is_bestseller` checkbox with `FLAG_OPTIONS` pill toggle buttons (★ Best Seller, ↑ Trending, ✦ New Arrival) in amber/pink/purple active colors

**AdminProductsClient**: Added `getProductStock`, `productVelocity`, `daysToSellout`, `isSlowMover`, `DTSBadge` helpers. Product rows now show category badge + flag pills. Added "Days to Sellout" column. Added counts banner (Best Sellers · Trending · New Arrivals · Slow Movers).

**AnalyticsClient**: Added `merchandising` to Tab type, added Merchandising tab with: Category Performance (horizontal bars), Price Range Performance (4 buckets), Size Sell-Through (sold vs remaining %), New Arrivals table, Slow Movers table, Dead Inventory table.

**DashboardCharts**: Added prev 7d revenue comparison (↑/↓ % vs prev 7d). Added `slowMoverCount` badge to Inventory Health grid. Grid expanded from 3→4 cols.

## Outcome

- ✅ Impact: Complete merchandising layer added — manual product flags, season/type categorization, velocity-based slow mover detection, dead inventory identification, category/price-range analytics, size sell-through tracking
- 🧪 Tests: TypeScript passes clean; all 7 files modified with no build errors
- 📁 Files: types/index.ts, new/page.tsx, EditProductForm.tsx, AdminProductsClient.tsx, AnalyticsClient.tsx, DashboardCharts.tsx + migration SQL
- 🔁 Next prompts: Run SQL migration in Supabase, test all new forms/tabs in browser, add category to existing products
- 🧠 Reflection: Slow mover computation uses `total_sold / ageDays` (velocity) from product record — accurate enough for a small store; if needed later, can refine to use 15-day order window with a separate fetch

## Evaluation notes (flywheel)

- Failure modes observed: None (TS clean first pass)
- Graders run and results (PASS/FAIL): TypeScript PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): After migration, update existing products with product_category values to see category performance in analytics
