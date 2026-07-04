---
id: 072
title: Gate COD dashboard KPIs behind COD setting
stage: green
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["dashboard", "cod", "settings", "admin"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/components/admin/DashboardCharts.tsx
 - store/src/app/admin/page.tsx
tests:
 - manual: logged in as admin, toggled store_settings.cod_enabled true/false via /api/admin/settings, curled /admin and grepped rendered HTML for "Collected"/"In Transit"/"Success Rate" fragments to confirm they appear only when enabled; confirmed other KPIs (Orders This Month, Repeat Rate, Total Products) unaffected
 - typecheck: npx tsc --noEmit (clean)
 - build: npm run build (clean)
---

## Prompt

Now in dashboard there are 3 kpi of cod first tell me(how are you calculating mtc and in transit) I want to disbale that kpis when I disable cod from settings (I dont need cod data) when enable cod from settings cod kpis also display.

## Response snapshot

Explained the calculation in `store/src/components/admin/DashboardCharts.tsx`:
- **COD Success Rate**: `codDelivered / resolvedCod.length`, where `resolvedCod` = orders with `payment_method === 'cod'` and `order_status` in (delivered, returned, cancelled) — i.e. COD orders that have reached a final state, excluding ones still in flight.
- **Cash Collected (MTD)** (user's "mtc"): sum of this-month orders' `total` where the order is not cancelled/returned AND (for COD: `order_status === 'delivered'`; for prepaid: `payment_status === 'paid'`) — money actually confirmed in hand.
- **COD In Transit**: `revenueThisMonth - cashCollectedMTD` — booked revenue this month that hasn't converted to collected cash yet (COD orders not yet delivered, mostly).

Implemented the toggle: threaded a `codEnabled` boolean prop through `DashboardCharts` (default `false`, matching the existing `store_settings.cod_enabled` convention where absence/`'false'` means disabled). `store/src/app/admin/page.tsx` now fetches `store_settings` for key `cod_enabled` in the existing `Promise.all` batch and passes it down. Wrapped the "COD Success Rate" KPI card and the whole "Cash Position (MTD)" block (Cash Collected + COD In Transit) in `codEnabled &&` guards — when COD is disabled all three KPIs are hidden; other KPIs (Total Products, Repeat Rate, order counts) are untouched.

Verified live: built and ran production server, logged in via `/api/admin/auth`, toggled `cod_enabled` true → all three KPI fragments rendered; toggled false → all three disappeared while unrelated KPIs stayed. Restored `cod_enabled` to its original `false` value afterward and stopped the test server.

## Outcome

- ✅ Impact: Dashboard COD KPIs (Success Rate, Cash Collected MTD, COD In Transit) now respect the existing COD on/off setting instead of always rendering when there's COD order history.
- 🧪 Tests: typecheck clean, production build clean, manual end-to-end verification via curl against a real running server with the actual DB toggle (not mocked).
- 📁 Files: store/src/components/admin/DashboardCharts.tsx, store/src/app/admin/page.tsx
- 🔁 Next prompts: none identified
- 🧠 Reflection: A stale `next start` process from an earlier verification pass was already holding port 3000, so the first two rounds of curl verification silently tested old code. Caught it via the "port already in use" line in the new server's own startup log, not via curl output — worth checking for that before trusting a fresh verification pass.

## Evaluation notes (flywheel)

- Failure modes observed: stale server process on port 3000 masked the code change during initial verification (classic "editing code but testing an old process" trap flagged by the systematic-debugging skill).
- Graders run and results (PASS/FAIL): manual curl-based KPI presence check — PASS for both enabled and disabled states.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
