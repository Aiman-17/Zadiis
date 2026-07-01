---
id: 057
title: Analytics KPI Calculation Bug Fixes
stage: general
date: 2026-06-29
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: fix analytics calculation bugs only, no new features
labels: ["analytics", "dashboard", "kpi", "bug-fix", "calculations"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/DashboardCharts.tsx
  - store/src/components/admin/AnalyticsClient.tsx
  - store/src/app/admin/page.tsx
tests:
  - manual: verify AOV excludes returned orders
  - manual: verify inventory value correct for variant products
  - manual: verify sale revenue counts only sale items
  - manual: verify discounts given excludes returned orders
---

## Prompt

We are moving forward to testing and debugging full unit integration and e2e testing. Check all profits revenue analytics with expected calculated results. Only read it not implement or making plan. [then:] Dont add and implement any new thing stays as it is only fix bugs not missing things.

## Response snapshot

Read all analytics code. Found 4 calculation bugs. Fixed only those bugs, no new features added.

**Bug 1 — AOV denominator included returned orders (DashboardCharts.tsx:61)**
`ordersThisMonth` was `filter(o => o.order_status !== 'cancelled')` — returned orders were in the count but revenue excluded them. AOV was understated.
Fix: added `&& o.order_status !== 'returned'` to the filter.

**Bug 2 — Discounts Given counted returned orders (AnalyticsClient.tsx:190)**
`discountsGiven` excluded cancelled but not returned. Discounts from reversed sales were still shown as given.
Fix: added `&& o.order_status !== 'returned'` to the filter.

**Bug 3 — Inventory Value used stock_quantity for variant products (AnalyticsClient.tsx:274)**
`inventoryValue += p.price * p.stock_quantity` — for variant products real stock lives in `variant_stock[color][size]`, not `stock_quantity`. Inventory value was wrong for most products.
Fix: compute total from variant_stock when present, fall back to stock_quantity for legacy products.

**Bug 4 — Sale revenue attributed entire order.total instead of sale items only (admin/page.tsx:53)**
Mixed orders (sale + non-sale items) had full order.total credited to the sale. Overcounted sale revenue.
Fix: sum only items whose product_id maps to that sale via productToSale.

## Outcome

- ✅ Impact: AOV, discounts given, inventory value, and sale analytics are now mathematically correct.
- 🧪 Tests: manual verification needed against known orders with cost_price set
- 📁 Files: 3 files modified, 4 targeted bug fixes
- 🔁 Next prompts: live browser test to confirm numbers match expected calculations
- 🧠 Reflection: All bugs were silent — no errors thrown, just wrong numbers displayed. Inventory value bug was most impactful as variant products are the majority of catalog.

## Evaluation notes (flywheel)

- Failure modes observed: silent wrong values — nothing crashes, numbers just don't match reality
- Graders run and results (PASS/FAIL): not yet run — awaiting live test verification
- Prompt variant (if applicable): null
- Next experiment: place 2 controlled orders with known cost_price and verify gross profit = (sale_price - cost_price) x qty
