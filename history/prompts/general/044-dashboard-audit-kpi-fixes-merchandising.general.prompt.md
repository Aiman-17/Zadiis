---
id: 044
title: Dashboard Audit KPI Fixes Merchandising
stage: green
date: 2026-06-25
surface: agent
model: claude-sonnet-4-6
feature: admin-dashboard
branch: main
user: Aiman-17
command: fix all dashboard audit issues
labels: ["dashboard","kpi","analytics","merchandising","retail","audit"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/DashboardCharts.tsx
tests:
  - Verified Gross Revenue (7d) = PKR 94,725 matches Analytics Gross Revenue tab
  - Verified Net sub-label = PKR 86,435 matches Analytics Net Revenue
  - Verified New Orders card count matches orders page Active tab
  - Verified Pending Shipment counts processing + shipped
  - AOV card: PKR 4,860 (revenueThisMonth / ordersThisMonth)
  - Outstanding COD card present and coloured amber when > 0
  - Fulfillment rate shown under Orders This Month
  - Best Sellers: all 4 products visible ranked (was only 1)
  - Low Stock Alerts heading no longer shows "Low Stock Alerts1" (badge fixed)
---

## Prompt

"Fix all of them"

(Referring to the 8 dashboard audit issues reported after acting as retail merchandising director and ecommerce architecture principal:)

1. "This Week's Revenue" label was showing Net Revenue, not Gross — misleading vs Analytics page
2. New Orders card (14) didn't match orders page Active tab (17) — used 7-day filter wrongly
3. "Total Sales" label was wrong — showed unit count, not orders; 35 units / 4 delivered = confusing 11% ratio
4. "Low Stock Alerts1" — badge number concatenated into h3 heading text
5. No Average Order Value (AOV) — critical retail KPI missing
6. Best Sellers only showed 1 of 4 products — filter on score > 0 hid unscored products
7. No Outstanding COD metric — cash in field not visible
8. No Fulfillment Rate — 17 unprocessed new orders with no urgency signal

## Response snapshot

Single file changed: `store/src/components/admin/DashboardCharts.tsx`

**Fix #1 — Gross vs Net Revenue:**
- Added `grossRevenue7d = last7days.reduce(...)` (all orders including cancelled)
- Existing `netRevenue7d` kept (filtered)
- Card now shows Gross as headline, Net as sub-label "Net: PKR X"

**Fix #2 — Action card counts:**
- `newOrders`: removed `isWithinDays(o.created_at, 7)` filter → counts ALL new status orders
- `pendingShipment`: added `|| o.order_status === 'shipped'` → matches orders page
- Added `overdueNewOrders` (new orders > 24h old) → shows red warning on card

**Fix #3 — "Total Sales" removed:**
- Replaced with AOV card: `Math.round(revenueThisMonth / ordersThisMonth)`
- Orders This Month now has fulfillment rate % as sub-label

**Fix #4 — Badge bug:**
- Moved `<span>` badge from inside `<h3>` to sibling in a flex container
- h3 text is now clean: "Low Stock Alerts"

**Fix #5 — AOV:**
- New card: "Avg. Order Value" = revenueThisMonth / ordersThisMonth

**Fix #6 — Best Sellers:**
- Removed `.filter(p => p.best_seller_score > 0)` → all products shown ranked
- Products with 0 sales show "no sales" in grey instead of disappearing

**Fix #7 — Outstanding COD:**
- New card: sum of `o.total` for COD orders not yet delivered/cancelled/returned
- Coloured amber (#B45309) when value > 0

**Fix #8 — Fulfillment Rate:**
- Added `deliveredThisMonth` count and `fulfillmentRate = delivered/ordersThisMonth * 100`
- Shown as "X% fulfilled" under Orders This Month, green ≥ 50%, amber < 50%

Committed as `f8cc3c5`, pushed to main, Vercel deployment triggered.

## Outcome

- ✅ Impact: All 8 audit issues resolved in one commit; dashboard now shows accurate gross/net split, correct action counts, AOV, COD outstanding, fulfillment rate, and all products in Best Sellers
- 🧪 Tests: Cross-checked Gross Revenue (94,725) and Net Revenue (86,435) against analytics 7d tab — exact match
- 📁 Files: 1 file modified (DashboardCharts.tsx), committed f8cc3c5, pushed to main
- 🔁 Next prompts: Could add avg days to ship metric; could add week-over-week revenue delta
- 🧠 Reflection: Root cause of most issues was time-window inconsistency (dashboard 7-day vs orders page all-time) and labels not distinguishing gross/net — both fixable with label clarity rather than architecture changes

## Evaluation notes (flywheel)

- Failure modes observed: None — all calculations are client-side from already-fetched data
- Graders run and results (PASS/FAIL): Cross-checked with analytics page — PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add week-over-week delta arrow (↑12%) next to Gross Revenue card
