---
id: 061
title: Principal Engineer Full Platform Audit
stage: general
date: 2026-06-30
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /sp.analyze — full multi-role platform audit (Principal SE / Staff Architect / Code Reviewer / Performance / Security)
labels: ["audit", "dashboard", "analytics", "sales", "cod", "payments", "products", "orders", "kpi", "profit", "inventory"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files: []
tests: []
---

## Prompt

Yes You are acting as a Principal Software Engineer, Staff Software Architect, Senior Code Reviewer, Performance Engineer, Security Engineer.
Review above report.
Check all values in all cards and calculations if the data show for only this time in dashboard cards does data automatically zero after that time
ALL Profit calculations does gross revenue net revenue calculate a real value with all integration(product price and cost price) does the cards are tracking for every orders.
Orders this month low stock alerts kpi total products(all units calculation on all if add new product
All for inventory health (there is a a bug on cancel KPI) avg order value low stock total products ordersthismonth(the value is become zero after month repeat rate revenue this year and revenue this month
(this month revenue value automatic become zero) sales trends order breakdown inventory health cancel (all data shows correctly only 7 days) returns sold out last chance slow movers low stock alert and merchandising
does all flags data is showing correctly and base on which calculations low stock alert. On products page all product units
stock are showing correctly and orders page the same size color and sku product same shown if customer order
payment page we online payment are showing and also cod with actual price(and the payment system works correctly with all cord and online payment) invoice page cod page and also sales page if end the kpi on dashboard is remove or not and the kpi of sale on dashboard
showing both sales start and end date after ending automatic removing and on sales page active btn is gone or not shwoing sale start date and end date with year and month for tracking on sale page kpi if sale end do the inactive and complete btn shown.
Analytics page all data on revenue with time filter sales trend with time filter products (for sizes and colors also add prodcut name revenue and repeat customer rate) does this all works

## Response snapshot

Full source read of 1,257-line AnalyticsClient.tsx, 370-line DashboardCharts.tsx, admin/page.tsx, sales/page.tsx, orders/page.tsx, cod/page.tsx, invoices/page.tsx, AdminProductsClient.tsx via 3 parallel Explore agents.

**15 findings across HIGH/MEDIUM/LOW:**

HIGH bugs:
- H1: Sales page missing start/end dates in listing
- H2: No auto-expiry for sales with ends_at — is_active stays true forever
- H3: COD totalOut includes returned orders — reconciliation broken (Out ≠ Pending + Received + Lost)
- H4: Dashboard Cancelled(7d) / Returns(7d) include archived orders (missing !is_archived filter)
- H5: Gross Profit excludes delivery_charge revenue — margin % artificially suppressed

MEDIUM findings:
- M1: COD totalOut misleads on expected cash (same root as H3)
- M2: Dashboard Repeat Rate is ALL-TIME, Analytics is range-filtered — same label, different data
- M3: Inventory Value uses retail price (p.price × stock), not cost_price — overstates by 2-4×
- M4: No "Completed" status for expired sales — only "Inactive"
- M5: Payment method pie includes returned orders
- M6: Low Stock KPI counts variants; products page counts products — numbers never match
- M7: Products tab has no sortable table — chart only, top 8 truncated

LOW findings:
- L1: Repeat Rate in Revenue tab, not Products tab (user asked for it there)
- L2: Just Dropped = 7d window; New Arrivals = 30d — inconsistent "new" definition across sections
- L3: Cancelled(7d) links to unfiltered orders page — no tab/filter param

**Confirmed working correctly (no fix needed):**
- All time-bounded KPIs auto-reset (month/year/7d rolling) ✅
- Gross/Net Revenue standard accounting-correct ✅
- Gross Profit uses cost_price incl. inactive products (C2 fix) ✅
- COD profit only on delivery; card/online only when paid ✅
- Analytics all tabs respect time range filter ✅
- Variant stock summation correct in all components ✅
- Orders page shows full item detail (size/color/SKU/price) ✅
- Low stock threshold (≤3) consistent across dashboard and products ✅

## Outcome

- ✅ Impact: 15 findings catalogued. 4 are data-integrity issues (H2, H3, H4, H5). 1 is a missing feature (H1 sale dates). Rest are UX/accuracy polish.
- 🧪 Tests: Read-only audit — no code changes. Playwright tests remain 21/21 from prior session.
- 📁 Files: No files modified. 3 Explore agents read 8 source files.
- 🔁 Next prompts: Fix H1–H5 (implement plan first), then M3 (inventory value), M4 (Completed status), M5/M6 (calculation accuracy)
- 🧠 Reflection: The COD accounting gap (H3) is subtle — totalOut including returned orders means the 4 KPI cards can never reconcile. The Gross Profit delivery gap (H5) is architectural — delivery revenue flows through order.total but profit only calculates item-level margin. Both require deliberate design decisions before fixing.

## Evaluation notes (flywheel)

- Failure modes observed: none — all agents returned full file contents
- Graders run and results (PASS/FAIL): no code changes this session
- Prompt variant (if applicable): sp.analyze with multi-role context
- Next experiment: implement H1+H2 (sale dates + auto-expiry) as a pair; H4 (archived filter) is a 1-line fix
