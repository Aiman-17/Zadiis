---
id: 046
title: Analytics Sales Trend Timezone Dedup Fix
stage: green
date: 2026-06-26
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: test it / now test the analytics sales trend working with time filters
labels: ["analytics","sales-trend","timezone","bug-fix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/AnalyticsClient.tsx
tests:
  - Playwright: 7d Sales Trend shows Jun 19–25 only (Jun 15/18 filtered out), single Sun Jun 21 row, 19 orders
  - Playwright: 30d Sales Trend shows Jun 15–25, single Sun Jun 21 row (2 orders merged), 23 orders
  - Playwright: 90d Sales Trend shows 2 unique weeks (Week of Jun 14 / Week of Jun 21), no duplicates
  - Playwright: 12m Sales Trend shows single June 2026 row
  - TypeScript: npx tsc --noEmit clean (commit a245669)
---

## Prompt

now test the analytics sales trend working with time filters / test it

## Response snapshot

Discovered and fixed two bugs in AnalyticsClient.tsx:

**Bug:** `d.toISOString().slice(0, 10)` returns UTC date for the grouping key, but `d.toLocaleDateString(...)` uses local PKT (UTC+5) timezone for the label. Orders placed between 19:00–24:00 UTC on a given day fall on the next calendar day in PKT, creating two different UTC keys that both render the same local-date label — causing duplicate "Sun, Jun 21" rows in daily view and duplicate "Week of Jun 14"/"Week of Jun 21" rows in weekly view. The same bug affected `buildTrendData` (Revenue Trend line chart).

**Fix:** Added `localDateKey(d)` helper that builds the date string from `d.getFullYear()`, `d.getMonth()`, `d.getDate()` (all local time). Replaced all `d.toISOString().slice(0,10)` key usages in both `buildTrendData` and `buildSalesTrendTable`.

**Results after fix:**
- 7d: Jun 19–25, single Sun Jun 21 (2 orders, PKR 5,299), total 19 orders / PKR 86,435
- 30d: Jun 15–25, single Sun Jun 21, total 23 orders / PKR 108,020
- 90d: 2 clean weeks — Week of Jun 21 (16 orders ↑74%) / Week of Jun 14 (7 orders)
- 12m: June 2026 single row

## Outcome

- ✅ Impact: Duplicate day/week rows eliminated across all time filters in Revenue Trend and Sales Trend; data now groups correctly by Pakistan local date
- 🧪 Tests: All 4 filter ranges verified via Playwright on live zadiis.com.pk
- 📁 Files: store/src/components/admin/AnalyticsClient.tsx
- 🔁 Next prompts: Verify Revenue Trend line chart for same fix (duplicate dots gone)
- 🧠 Reflection: PKT is UTC+5 — orders placed after 7 PM PKT cross the UTC midnight boundary and were getting double-counted into two different day buckets

## Evaluation notes (flywheel)

- Failure modes observed: UTC vs local timezone mismatch in date grouping key — common in apps with non-UTC users; always use local date parts (getFullYear/getMonth/getDate) for display grouping, not ISO string slicing
- Graders run and results (PASS/FAIL): Live browser test PASS all 4 filters
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add timezone label or note on the analytics page showing data is in PKT
