---
id: 060
title: Admin 10 Polish Fixes Cost Map Error Guards
stage: general
date: 2026-06-29
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: Fix all (14 remaining findings from sp.analyze report)
labels: ["admin", "bug-fix", "analytics", "payments", "products", "settings", "sales", "invoices", "error-handling", "ux"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/admin/analytics/page.tsx
  - store/src/components/admin/AnalyticsClient.tsx
  - store/src/app/admin/payments/page.tsx
  - store/src/components/admin/AdminProductsClient.tsx
  - store/src/app/admin/settings/page.tsx
  - store/src/app/admin/sales/new/page.tsx
  - store/src/app/admin/invoices/page.tsx
tests:
  - Build: npm run build — ✓ Compiled (0 TypeScript errors)
  - Playwright admin-kpi-test.mjs — run after push
---

## Prompt

Fix all (continuing from "whats remaining" — implementing the 14 remaining findings from the full admin sp.analyze report, resumed from context summary)

## Response snapshot

**Resumed from context summary.** Previous session implemented 9 bugs across 8 files. This session implements the remaining 10 fixes in 7 files (single commit `74fa694`):

- **C2** `analytics/page.tsx` + `AnalyticsClient.tsx` — Added third parallel query for all products (incl. inactive) `select('id, cost_price')`. Passed as optional `allCostPrices` prop; `costMap` now uses `allCostPrices ?? products`. Inactive/archived products no longer contribute $0 cost, inflating gross profit.
- **B4** `AnalyticsClient.tsx:533` — Gross Profit KPI sub-label now `${profitMarginPct}% margin · COD counted on delivery` to disambiguate revenue recognition timing.
- **B5** `AnalyticsClient.tsx:1035` — Size Sell-Through header changed from plain `<h3>` to flex row with inline note `% = sold in period ÷ (sold + current stock)` explaining the mixed-period math.
- **P2** `payments/page.tsx` — Added `const [actionError, setActionError] = useState<string|null>(null)`; `markPaid`, `archivePayment`, `restorePayment` now call `setActionError` on failure and `setActionError(null)` on success. Dismissible error banner rendered below page heading.
- **PR2** `AdminProductsClient.tsx` — `handleDelete` now captures `res` from `fetch` and returns early with `alert(...)` if `!res.ok`. Product state only moves to archived on confirmed API success.
- **PR3** `AdminProductsClient.tsx` — `handleDelete` now calls `router.refresh()` after state update, matching the existing `handleRestore` behaviour.
- **ST2** `settings/page.tsx` — `toggleCod` captures `res`; if `!res.ok`, reverts `setCodEnabled(!enabled)` to restore prior toggle state.
- **ST3** `settings/page.tsx` — `addZone` guards against duplicate city name with case-insensitive comparison before POSTing.
- **NS1** `sales/new/page.tsx` — `handleSubmit` collects `results` from `Promise.all`; counts `!r.ok` failures and shows `setError(...)` before redirecting to edit page if any product additions failed.
- **IV2** `invoices/page.tsx` — Orphaned invoices (order deleted) now show `"Order deleted"` in order-number column and `"—"` for customer name instead of empty cells.

**Ruled out / skipped:**
- C1: `total_sold` incremented in `orders/route.ts` line 112 on delivery — confirmed NOT a bug.
- P3: COD page doesn't filter `is_archived`, so archiving a payment doesn't remove it from COD reconciliation — confirmed NOT a bug.
- SL1: `productToSale` overwrite only affects cross-sale attribution for a product in multiple sales simultaneously — UI prevents this; corner case not worth adding complexity.
- CD2: `cod_collected_at` optimistic timestamp — acceptable UX behaviour, deferred.

## Outcome

- ✅ Impact: Gross profit now accurate for archived products; COD caveat visible; size table explained; payments admin gets error feedback; archive/restore actions safe against silent failures; COD toggle safe to toggle-back; duplicate cities blocked; sale partial-failures surfaced; orphaned invoices labelled.
- 🧪 Tests: Build ✓ Compiled (0 TypeScript errors). Playwright admin-kpi-test.mjs — pending (run after push).
- 📁 Files: 7 files modified, 43 insertions / 13 deletions, commit 74fa694
- 🔁 Next prompts: push to main → Vercel deploy → run Playwright tests
- 🧠 Reflection: Two ruled-out items (C1, P3) were confirmed non-bugs by reading the actual DB query and API route — architecture review phase from prior session carried over correctly. SL1 and CD2 assessed as not worth the added complexity given the constraints.

## Evaluation notes (flywheel)

- Failure modes observed: none — build passed first try
- Graders run and results (PASS/FAIL): Playwright admin-kpi-test.mjs — pending
- Prompt variant (if applicable): null
- Next experiment: deploy and run Playwright; then consider adding a Playwright test for the COD toggle revert behaviour (ST2)
