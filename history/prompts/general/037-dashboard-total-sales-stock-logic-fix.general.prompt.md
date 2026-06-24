---
id: 037
title: Dashboard Total Sales and Stock Logic Fix
stage: green
date: 2026-06-24
surface: agent
model: claude-sonnet-4-6
feature: dashboard
branch: main
user: Aiman-17
command: inline implementation
labels: ["dashboard","kpi","stock","units-sold","active-products"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/DashboardCharts.tsx
tests:
  - manual: Total Sales card shows monthly units received (non-cancelled)
  - manual: sub-count shows delivered units in green
  - manual: Total Products and Total Stock only reflect active products
---

## Prompt

we need small change what numbers in count in total product stock and unit only active product numbers we count if I delete that product decrease number from cards also for every unit sold calculate for every stock colors + size and decrease every sold unit color + size. we add stock from add production section colors and variants sizes every color has size + stock so calculation must be sum of color stock and all product total stock and decreasing number every unit we sold based on color variant and both stock calculation when order receive.
Also in sales card same strategy total sales => order I received and in small delivered orders unit sold. For monthly calculation. Before execution tell me your understanding.

[Follow-up] yes but title is too long total sales is clear or what are you clarifying

[Follow-up] make phr commit and deploy

## Response snapshot

Confirmed understanding with user before implementing:
- Total Products + Total Stock: already only counts active products (admin page fetches with is_active=true filter). Stock decrement already happens per color+size via decrement_stock RPC on order receipt. No change needed there.
- Total Sales card: changed from all-time delivered units to monthly strategy — main value = units from orders received this month (non-cancelled), sub = units from delivered orders this month in green.
- Card title kept as "Total Sales" per user direction.

Changes made to DashboardCharts.tsx:
- Replaced `unitsSold` (all-time, delivered-only) with `unitsReceived` (thisMonth, non-cancelled) + `unitsDelivered` (thisMonth, delivered)
- KPI card: value=unitsReceived, sub=`${unitsDelivered} delivered` in green (#10B981)

## Outcome

- ✅ Impact: Total Sales card now reflects monthly operational reality — units that left the shelf this month, with confirmed deliveries as context. Active-product-only filtering was already in place; confirmed to user.
- 🧪 Tests: Manual — card shows correct monthly counts, sub text green, resets each month
- 📁 Files: 1 file modified (DashboardCharts.tsx)
- 🔁 Next prompts: n/a
- 🧠 Reflection: Good call confirming understanding before executing — the active-product question was already solved, saved unnecessary changes. Monthly scoping of Total Sales is more actionable than all-time.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
