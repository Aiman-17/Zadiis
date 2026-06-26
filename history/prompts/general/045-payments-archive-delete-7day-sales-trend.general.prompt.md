---
id: 045
title: Payments Archive/Delete, 7-Day Sales Trend, Low Stock Filter Link
stage: green
date: 2026-06-25
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: test it
labels: ["payments","dashboard","analytics","low-stock","sales-trend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/admin/payments/page.tsx
  - store/src/app/api/admin/orders/route.ts
  - store/src/components/admin/DashboardCharts.tsx
  - store/src/components/admin/AnalyticsClient.tsx
  - store/src/components/admin/AdminProductsClient.tsx
tests:
  - Playwright browser test: Payments All tab shows 11 non-paid orders
  - Playwright browser test: Payments Paid tab shows 13 orders with Archive + Delete buttons
  - Playwright browser test: Payments All/Pending tabs have no Delete button
  - Playwright browser test: Archived Payments collapsible section visible with count badge
  - Playwright browser test: Dashboard Sales Trend shows "Revenue per day — last 7 days" with Fri/Sat/Sun/Mon/Tue/Wed/Today
  - Playwright browser test: Low Stock Alerts KPI links to /admin/products?filter=low-stock
  - Playwright browser test: Dashboard COD card removed
  - TypeScript: npx tsc --noEmit passed clean (commits 78dc3b7, ef548c8)
---

## Prompt

test it

## Response snapshot

Tested full payments page and dashboard after deploying commits 78dc3b7 (TS fix) and ef548c8 (7-day sales trend revert).

**Payments page:**
- All (11): only non-paid/unpaid orders — paid ones no longer appear in All tab ✓
- Pending (11): pending filter working ✓
- Paid (13): every row shows Archive (📁) and Delete (🗑️) buttons; COD rows show "Collect on delivery" label only ✓
- All/Pending tabs: no Delete button present (only Archive) ✓
- Archived Payments: collapsible section at bottom showing 1 archived payment ✓

**Dashboard:**
- Sales Trend: subtitle "Revenue per day — last 7 days", days Fri/Sat/Sun/Mon/Tue/Wed/Today ✓
- Gross Revenue (7d): PKR 94,725 with Net: PKR 86,435 sub-label ✓
- AOV: PKR 4,501 ✓
- Low Stock Alerts KPI: 2 variants with link to /admin/products?filter=low-stock ✓
- Best Sellers: 5 products ranked ✓
- No COD card on dashboard ✓

## Outcome

- ✅ Impact: Payments page now has full archive/delete/restore lifecycle; delete is guarded to paid-only; dashboard sales trend is 7-day daily (yearly moved to Analytics Sales Trend tab under 12m filter)
- 🧪 Tests: All Playwright browser assertions passed on live production at zadiis.com.pk
- 📁 Files: payments/page.tsx, api/admin/orders/route.ts, DashboardCharts.tsx, AnalyticsClient.tsx, AdminProductsClient.tsx
- 🔁 Next prompts: Verify low stock filter banner on products page; test archive restore flow on payments; test Analytics Sales Trend 12m view
- 🧠 Reflection: Recharts Tooltip formatter type incompatibility (v: number annotation rejected by ValueType | undefined union) was the root cause of two Vercel build failures — fixed by removing explicit annotation and using Number(v) coercion

## Evaluation notes (flywheel)

- Failure modes observed: Vercel TypeScript strict mode rejects explicit `number` annotation on Recharts Tooltip formatter param — must use implicit type and cast with Number(v)
- Graders run and results (PASS/FAIL): Live browser test PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Test archiving a payment and verify it disappears from active tabs and appears in Archived section
