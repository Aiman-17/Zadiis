---
id: "066"
title: Analytics 4-Tab UI Redesign
stage: general
date: 2026-07-01
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: "Redesign analytics from 7 tabs to 4 tabs — UI only, no data removed"
labels: ["analytics", "ui-redesign", "admin", "performance", "inventory", "orders"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/AnalyticsClient.tsx
tests:
  - npm run build (type-check + build)
---

## Prompt

Context carried from prior session (before context compaction):

The admin analytics page had 7 tabs (Revenue, Sales Trend, Products, Inventory, Merchandising, Cancellations, Returns). All 4 middle tabs showed the same underlying data — selling units and revenue breakdown of every order — just with different titles. The admin was confused by the overlap.

User's agreed redesign direction:
- Revenue tab: financial KPIs only (unchanged)
- Performance tab: new mega-tab merging Sales Trend + Products + Merchandising content
- Inventory tab: pure stock health only (no revenue data)
- Orders tab: merged Cancellations + Returns analytics

Critical constraint verbatim: "yes dont need to remove any single data only need to change UI not logic to make it simple and easily understandable"

Final user message this session: "dont compact / first create phr"

## Response snapshot

Rewrote `store/src/components/admin/AnalyticsClient.tsx` with 4-tab structure:

**Revenue tab** (unchanged):
- Gross/net revenue, profit margin, repeat rate KPIs
- Revenue trend line chart
- Payment methods pie chart
- Discount impact banner

**Performance tab** (new mega-tab — all sales intelligence in one place):
1. Sales Over Time bar chart (from Sales Trend) with rich tooltip (orders, units, revenue, AOV)
2. Period Breakdown table — period, orders, units, revenue, AOV, vs prev % (units column added)
3. Top Products — bar chart + table with collection, remaining stock, velocity (units/day for selected range), auto-generated flags (★ Best Seller, ↑ Trending, ✦ New, ⚠ Low Stock, 🔥 Almost Gone, OUT), repeat %
4. Sizes & Colors by Product — per-product breakdown with sold/remaining/sell-through % bars
5. Cities — bar chart by revenue (not orders) + table with orders, revenue, AOV
6. Category Performance — progress bars (from Merchandising)
7. Price Range Performance — 4-card grid (from Merchandising)
8. Best Sellers + Trending panels with stock levels (from Inventory/Merchandising)
9. Top Colors bar chart

**Inventory tab** (pure stock health):
- KPIs: inventory value at cost, low stock variants, dead stock count, total SKUs
- Stock by Collection bar chart
- Low Stock list (qty > 0 AND ≤ 3 — fixes sold-out exclusion)
- Size Sell-Through bars
- New Arrivals table
- Slow Movers table
- Dead Inventory table with age brackets (1m+, 3m+, 6m+ color-coded badges)

**Orders tab** (merged Cancellations + Returns):
- 5 combined KPIs: cancellation rate, return rate, orders cancelled, orders returned, revenue leakage
- Side-by-side charts: Cancellation Reasons | Return Reasons

**New computations added** (additive, no logic changed):
- `buildAllBuckets` / `buildSalesTrendTable`: added `units: 0` field to buckets so period table can show units column
- `productStockMap`: remaining stock per product name (for top products table)
- `productByName`: product lookup map by name (for flags and collection)
- `productVariantRemainingMap`: remaining stock per product per size and color (for per-product sell-through)
- `productFlagMap`: pre-computed auto badges per top product
- `cityDataMap` → `topCities`: now includes revenue and AOV (previously orders/units only)
- Tab type changed from 7 options to 4: `'revenue' | 'performance' | 'inventory' | 'orders'`

## Outcome

- ✅ Impact: Admin analytics consolidated from 7 confusing overlapping tabs to 4 clear purpose-driven tabs. All data preserved — nothing removed. Performance tab is single source of truth for sales intelligence. Inventory tab is single source of truth for stock health.
- 🧪 Tests: npm run build — type check + build verification required before deploy
- 📁 Files: store/src/components/admin/AnalyticsClient.tsx (full rewrite of JSX structure + minor additive computations)
- 🔁 Next prompts: npm run build to verify, then deploy to Vercel; also Supabase migration still pending (cancelled_at / returned_at columns)
- 🧠 Reflection: User's core constraint was "don't remove any data, only change UI." Solution: merge overlapping tabs into one mega Performance tab with clearly labelled sections, rather than deleting any panel.

## Evaluation notes (flywheel)

- Failure modes observed: 7-tab analytics caused admin confusion because Sales Trend / Products / Merchandising all showed unit+revenue data with different labels. No single source of truth per concept.
- Graders run and results (PASS/FAIL): build not yet run
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): run npm run build to check for TypeScript errors before deploying
