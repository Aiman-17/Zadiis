---
id: 017
title: Dashboard Yearly Revenue Summary Cards
stage: general
date: 2026-06-20
surface: agent
model: haiku-4-5
feature: none
branch: main
user: Aiman-17
command: Task 9 of Sprint 2 — Update DashboardCharts + admin dashboard page
labels: ["dashboard","analytics","recharts","pct-change"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - src/components/admin/DashboardCharts.tsx
tests:
  - npm run build (TypeScript check)
---

## Prompt

Update `src/components/admin/DashboardCharts.tsx` to include:
- 3 summary stat cards above charts: This Month Revenue (with % change vs last month), Yearly Revenue (last 12 months total), Avg Monthly Revenue
- NEW: 12-month line chart (yearly revenue trend)
- Keep existing: 6-month bar chart, orders/returns line chart, color pie chart

Replace entire file with provided content that includes:
- `CartesianGrid` import (was missing)
- `pctChange()` utility to calculate month-over-month % change
- `getMonthLabel()` helper for date calculation
- `months6` and `months12` arrays (6 and 12 month lookbacks)
- `getMonthData()` function to process both 6 and 12 month windows
- Summary cards with conditional color (green for up, red for down)
- Yearly 12-month line chart with CartesianGrid
- All brand colors via inline styles (no arbitrary Tailwind classes)

Run build and commit.

## Response snapshot

Replaced entire DashboardCharts.tsx file with new version containing:
- 3 summary stat cards (This Month Revenue, Yearly Revenue, Avg Monthly Revenue)
- 12-month yearly revenue line chart (NEW)
- Percentage change indicator (current vs previous month)
- CartesianGrid import added to recharts
- Helper functions: pctChange(), getMonthLabel(), getMonthData()
- Kept all existing charts (6-month bar, orders/returns line, color pie)
- Build completed successfully with no TypeScript errors
- Committed with message: "feat: yearly revenue chart, % change, and avg monthly revenue on dashboard"

## Outcome

- ✅ Impact: Dashboard now displays 3 summary metrics with monthly trend, plus 12-month revenue visualization for better year-over-year insights
- 🧪 Tests: Build passed (next build), TypeScript check passed, no compilation errors
- 📁 Files: src/components/admin/DashboardCharts.tsx (85 insertions, 36 deletions)
- 🔁 Next prompts: Verify dashboard rendering in admin panel, test with real order data
- 🧠 Reflection: Smooth implementation — template was precise, all imports correct, build clean

## Evaluation notes (flywheel)

- Failure modes observed: None
- Graders run and results (PASS/FAIL): PASS (build, TypeScript, git commit)
- Prompt variant (if applicable): null
- Next experiment: null
