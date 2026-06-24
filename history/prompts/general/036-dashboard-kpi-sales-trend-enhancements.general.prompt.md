---
id: 036
title: Dashboard KPI Cards and Sales Trend Enhancements
stage: green
date: 2026-06-24
surface: agent
model: claude-sonnet-4-6
feature: dashboard
branch: main
user: Aiman-17
command: inline implementation
labels: ["dashboard","kpi","charts","admin","deploy"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/DashboardCharts.tsx
tests:
  - manual: dashboard loads with 8 KPI cards
  - manual: sales trend chart renders last 7 days + today highlighted
  - manual: recent orders count badge visible
---

## Prompt

Now we have a duplicate of top selling product in admin dashboard one already in analytics we dont need in dashboard what we need replacing it tell me. also add total sales card and total products overall products with sizes and colors stock or stock on dashboard so we have seven cards. I think we need a sales trend in dashboard todays and last7 days not top selling products.

[Follow-up] also add today revenue card

[Follow-up] make phr commit and deploy but add last thing add total count number in recent orders same like low stock alerts. with highlight.

## Response snapshot

- Removed Top Products horizontal bar chart from dashboard (duplicated in Analytics tab)
- Replaced with Sales Trend bar chart: last 7 days + today, today bar highlighted in brand tan (`#A68B6E`), previous days in cream (`#E8DDD4`)
- Added Today's Revenue KPI card (last 24h net revenue, excludes cancelled/returned)
- Added Total Sales KPI card (all-time net revenue)
- Added Total Products KPI card (active product count)
- Expanded KPI grid from 5 → 8 cards in a clean 4×2 layout (`md:grid-cols-4`)
- Added count badge to Recent Orders header matching Low Stock Alerts style (brand tan pill)
- Committed, deployed to production at https://zadiis.com.pk

## Outcome

- ✅ Impact: Dashboard is now a single-pane operational view — today's performance, monthly totals, all-time revenue, inventory health, and 7-day sales trend without leaving the page. Top products removed from dashboard to reduce duplication with Analytics.
- 🧪 Tests: Manual — dashboard loads, 8 KPI cards render, sales trend shows 7 bars with today highlighted, recent orders badge shows count
- 📁 Files: 1 file modified (DashboardCharts.tsx)
- 🔁 Next prompts: Add click-through from KPI cards to relevant admin pages; consider real-time refresh
- 🧠 Reflection: 8-card 4×2 grid is clean. Sales trend replaces top products well — operational tempo (how many orders today/this week) is more useful at a glance than product rankings which belong in analytics.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): add revenue line overlay on sales trend bars
