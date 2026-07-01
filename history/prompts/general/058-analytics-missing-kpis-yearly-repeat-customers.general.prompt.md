---
id: 058
title: Analytics Missing KPIs Yearly and Repeat Customers
stage: general
date: 2026-06-29
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: add missing KPIs — yearly tracking and repeat customer rate
labels: ["analytics", "dashboard", "kpi", "repeat-customers", "yoy"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/DashboardCharts.tsx
  - store/src/components/admin/AnalyticsClient.tsx
tests:
  - store/tests/admin-kpi-test.mjs (Playwright — 21/21 pass)
---

## Prompt

ADD missing KPIs but skip cod collection (already have in COD page) and revenue per product (will add later). [then:] Okay add it. [then:] commit and push. [then:] test it on production.

## Response snapshot

Added missing KPIs scoped to what the existing data model supports (no new DB fields or API changes).

**Dashboard (`DashboardCharts.tsx`) — 2 new KPI cards:**
- **Revenue This Year** — current calendar year net revenue (excl. cancelled + returned) with YoY % vs same period last year. Uses `allOrders` already fetched on the dashboard page — no new query needed.
- **Repeat Rate** — % of unique customers (by `customer_phone`) who ordered more than once, all-time. Shows `X of Y customers` sub-line.

**Analytics → Revenue tab (`AnalyticsClient.tsx`) — 3 new KPI cards added to existing 3-card row (now 6 cards, 2 rows of 3):**
- **Unique Customers** — distinct phone numbers in the selected date range (active orders only)
- **Repeat Rate** — customers with >1 order within the range + repeat count sub-line
- **Avg Orders / Customer** — active orders ÷ unique customers, 1 decimal

**Build fix applied:** The inventory value fix from PHR 057 introduced a duplicate `const vs` inside the same `products.forEach` block, causing a Vercel build error. Fixed by removing the redundant declaration (the first `vs` from the inventory value block is reused by the low-stock block below it). Committed as separate fix commit `c33d8cc`.

**Commits:**
- `ae9c768` — main KPI additions + 4 bug fixes
- `c33d8cc` — duplicate `const vs` build fix

## Outcome

- ✅ Impact: Dashboard now shows yearly revenue trend + all-time repeat customer loyalty. Analytics shows per-range customer depth metrics. Build error fixed before deployment.
- 🧪 Tests: Playwright `admin-kpi-test.mjs` — 21/21 PASS on production (login, 7 dashboard cards, 6 analytics cards, 4 range switches)
- 📁 Files: 2 files modified across 2 commits
- 🔁 Next prompts: verify KPI values match manual DB calculation; add revenue per product when ready
- 🧠 Reflection: Yearly KPI was free — dashboard already fetches all-time orders. Repeat customer used `customer_phone` as identity key since it's the only required identifier. The duplicate `const vs` bug came from merging two separate blocks that both declared the same variable inside the same forEach closure.

## Evaluation notes (flywheel)

- Failure modes observed: duplicate `const vs` in same closure scope — silent locally (TypeScript/ESLint didn't catch it), caught by Vercel build (`next build` runs full type check)
- Graders run and results (PASS/FAIL): Playwright admin-kpi-test.mjs — PASS 21/21
- Prompt variant (if applicable): null
- Next experiment: cross-check Repeat Rate % against manual Supabase query: `SELECT customer_phone, COUNT(*) FROM orders GROUP BY customer_phone HAVING COUNT(*) > 1`
