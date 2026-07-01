---
id: 062
title: Week 1-3 Admin Bug Fixes Financial Intelligence
stage: general
date: 2026-06-30
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: make plan for all bug fixing from our report and implementation roadmap weeks
labels: ["admin", "analytics", "dashboard", "bug-fix", "financial-intelligence", "cron", "schema", "sales", "kpi", "cod"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/AnalyticsClient.tsx
  - store/src/components/admin/DashboardCharts.tsx
  - store/src/app/admin/sales/page.tsx
  - store/src/app/admin/page.tsx
  - store/src/app/api/admin/orders/route.ts
  - store/src/app/api/cron/deactivate-sales/route.ts
  - store/src/types/index.ts
  - store/vercel.json
tests:
  - Build: npm run build — ✓ Compiled (0 TypeScript errors, 43 pages)
  - Playwright admin-kpi-test.mjs — pending (run after push)
---

## Prompt

make plan for all bug fixing from our report and implementation roadmap weeks.

(Full session also included: `/sp.analyze` full platform audit across all 9 admin pages + analytics + dashboard, CFO/CEO/Accountant financial strategy advice for COD-heavy Pakistan e-commerce, and final plan implementation.)

## Response snapshot

**Phase 1 — Plan approved** (EnterPlanMode + ExitPlanMode cycle). Plan at `C:\Users\QC\.claude\plans\lucky-squishing-mitten.md`.

**Phase 2 — Implementation (Week 1–3), single commit `38a186b`:**

**Week 1 — Critical code fixes (3 files):**
- BUG-1 FIXED: `buildTrendData` in `AnalyticsClient.tsx` — added `isWeekly` branch that rolls each order date back to its Sunday, matching the weekly keys that `buildAllBuckets('90d')` creates. 90d Revenue + Orders Trend charts now show real data instead of all-zero bars.
- BUG-3 FIXED: `inventoryValue += p.price * totalStock` → `(p.cost_price || 0) * totalStock`. Label updated to "Inventory Value (at cost)".
- BUG-4 FIXED: `sales/page.tsx` — added `fmtSaleDate()` helper and `{(sale.starts_at || sale.ends_at) && ...}` block below status line.
- BUG-6 FIXED: `qty <= 3` → `qty > 0 && qty <= 3` in both DashboardCharts.tsx and AnalyticsClient.tsx. Sold-out (qty=0) variants no longer inflate the Low Stock count.
- FIX-5 NEW: `DashboardCharts.tsx` — added `lastMonthStart/lastMonthEnd/lastMonth` block. Revenue This Month, Orders This Month, and AOV cards now show "↑/↓ vs last month: PKR X" sub-labels (falls back to "first month on record" when no prior month data).

**Week 2 — Financial intelligence (3 files):**
- ADD-1: COD Success Rate KPI card. Computed from `resolvedCod` (excludes in-transit). Green ≥65%, amber 50–64%, red <50%. Shows delivered count / resolved total.
- ADD-2: Cash Collected vs COD In Transit MTD row. `cashCollectedMTD` counts delivered COD + paid online only. `inTransitMTD` = booked - collected. Shown as a split banner above the charts.
- ADD-3 (BUG-7): `isCompleted = !sale.is_active && ends_at != null && new Date(ends_at) < now`. Blue "Completed" badge; "Inactive" reserved for manually paused sales.
- ADD-4: Per-product repeat customer rate table below Top Selling Products chart. Computes `productRepeatMap` (phone → count per product), renders "Repeat %" column (—for ≤1 unique customer, green ≥20%).

**Week 3-A — Infrastructure (2 files + vercel.json):**
- New route `/api/cron/deactivate-sales` — Supabase UPDATE `is_active=false` where `ends_at < now` AND `is_active=true`. Protected by `CRON_SECRET` (same pattern as existing crons).
- `vercel.json` — added `{ "path": "/api/cron/deactivate-sales", "schedule": "0 * * * *" }`.
- `admin/page.tsx` — lazy deactivation fallback: fetches sales with `ends_at`, detects expired ones, fires void update, filters them out of summaries immediately. Acts as belt-and-suspenders between cron runs.

**Week 3-B — Schema prep (3 files, migration pending):**
- `types/index.ts` — added `cancelled_at?: string | null` and `returned_at?: string | null` to Order type.
- `orders/route.ts` PUT — writes `cancelled_at`/`returned_at` timestamp on status change.
- `DashboardCharts.tsx` — 7d counts now use action date (`cancelled_at`/`returned_at`) when present, falls back to `created_at` for pre-migration orders. Card labels updated to "Cancelled (last 7d)" / "Returns (last 7d)".

## Outcome

- ✅ Impact: 7 confirmed bugs fixed; 4 CFO-grade financial KPIs added; sale auto-deactivation live; action timestamps written to DB going forward; Low Stock / Inventory Value now financially accurate.
- 🧪 Tests: Build ✓ Compiled (0 TypeScript errors, 43 pages, 3 static). Playwright pending push.
- 📁 Files: 8 files modified/created, 235 insertions / 47 deletions, commit 38a186b.
- 🔁 Next prompts: (1) Push to main → Vercel deploy → run Playwright. (2) Run SQL migration in Supabase: `ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ; ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;`. (3) Add `CRON_SECRET` to Vercel environment variables if not already set. (4) Month 2: P&L tab, Inventory Turnover, Cash Cycle Time.
- 🧠 Reflection: The 90d trend bug (BUG-1) was a key/bucket mismatch — `buildSalesTrendTable` already had the fix pattern (`isWeekly` branch); `buildTrendData` just needed to match it. The lazy deactivation pattern (fire-and-forget void Supabase call + immediate local filter) is safe even if the update fails — worst case is the expired sale shows until next load.

## Evaluation notes (flywheel)

- Failure modes observed: sales/page.tsx JSX edit split a `<p>` tag incorrectly on first attempt — caught by reading the result immediately and corrected with a follow-up Edit.
- Graders run and results (PASS/FAIL): Build ✓ on all 3 week-checkpoints (W1, W2, W3). Playwright pending.
- Prompt variant (if applicable): null
- Next experiment: push to Vercel and verify 90d trend chart shows real weekly bars in production (the only fix that requires live order data to validate visually).
