---
id: 059
title: Admin Bug Fixes 9 Pages Silent Failures Charts
stage: general
date: 2026-06-29
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: full admin pages sp.analyze then fix confirmed bugs — senior architecture engineer plan first
labels: ["admin", "bug-fix", "analytics", "orders", "cod", "settings", "sales", "payments", "error-handling"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/AnalyticsClient.tsx
  - store/src/app/admin/cod/page.tsx
  - store/src/app/admin/orders/page.tsx
  - store/src/app/admin/payments/page.tsx
  - store/src/app/admin/sales/new/page.tsx
  - store/src/app/admin/settings/page.tsx
  - store/src/components/admin/AdminProductsClient.tsx
  - store/src/components/admin/CodClient.tsx
tests:
  - store/tests/admin-kpi-test.mjs (Playwright — run after push)
---

## Prompt

Yes you are a senior software architecture engineer make plan first [then: continue]

Context: after running /sp.analyze on all 9 admin pages, 29 findings were catalogued. User asked to plan first as a senior architect, then implement.

## Response snapshot

**Architecture process:**
1. Ran 3 parallel Explore agents to read all critical sections (AnalyticsClient, orders, payments, DashboardCharts, AdminProductsClient, CodClient, settings)
2. Verified each finding against actual code before including in plan
3. Ruled out 2 reported bugs: I2 (fulfillmentRate — already scoped correctly) and IV1 (deleteInvoice — already has res.ok guard)
4. Wrote formal plan with before/after diffs, execution order (lowest→highest risk), and verification steps
5. Got user approval then implemented

**9 bugs fixed in 8 files, single commit `f553fb0`:**

- **I3** `AnalyticsClient.tsx:249` — Top Products filter now excludes returned orders (`&& o.order_status !== 'returned'`)
- **I4** `AnalyticsClient.tsx:275` — Color/Size/City charts now exclude returned orders (same filter addition); also fixed productSizeColorMap at line 263
- **CD1** `cod/page.tsx:18` — `totalPending` now excludes returned orders (`o.order_status !== 'returned'`) — COD cash not in-flight for returned shipments
- **PR1** `AdminProductsClient.tsx:125` — ArchivedRow now calls `getProductStock(p)` instead of `p.stock_quantity` (wrong for variant products)
- **ST1** `settings/page.tsx:176` — Delivery charge input switched from controlled `value+onChange+onBlur` to uncontrolled `defaultValue+key+onBlur` — eliminates N+1 API calls per keystroke
- **NS2** `sales/new/page.tsx:84` — `handleSubmit` now validates `Object.keys(selected).length === 0` before creating a sale
- **CD3** `CodClient.tsx:34` — Added `const [error, setError] = useState<string|null>(null)` and shows error message when `update()` API fails
- **O1** `orders/page.tsx:98–137` — Added `const [actionError, setActionError] = useState<string|null>(null)`; all 4 action functions (updateStatus, returnOrder, cancelOrder, archiveOrder) now check `res.ok` and show dismissible error banner
- **P1** `payments/page.tsx:76,150` — deletePayment confirm dialog and button title now truthfully state "DELETE ORDER" not "payment record"

**Build:** `npm run build` exit code 0 — no TypeScript errors.

## Outcome

- ✅ Impact: Returned orders no longer inflate Top Products/chart data; COD "Awaiting Cash" is accurate; variant stock shows correctly in archived products; settings delivery charge no longer hammers the API; orders page gives admin feedback on failed actions; sale creation requires at least 1 product; delete button in payments is honest about what it destroys.
- 🧪 Tests: Playwright admin-kpi-test.mjs — run after push (results pending)
- 📁 Files: 8 files modified, 41 insertions / 13 deletions
- 🔁 Next prompts: run Playwright tests on production; address C2 (inactive product cost gap in analytics) when ready
- 🧠 Reflection: Two findings from the analysis report turned out to be non-bugs on close code inspection: fulfillmentRate was already correctly scoped to thisMonth orders, and deleteInvoice already had the res.ok guard. Architecture review phase (parallel Explore agents reading exact line numbers) was essential before writing the plan — saves wasted implementation effort.

## Evaluation notes (flywheel)

- Failure modes observed: none during implementation; build passed first try
- Graders run and results (PASS/FAIL): Playwright admin-kpi-test.mjs — pending
- Prompt variant (if applicable): null
- Next experiment: cross-check COD totalPending before/after returned order exclusion against manual Supabase query
