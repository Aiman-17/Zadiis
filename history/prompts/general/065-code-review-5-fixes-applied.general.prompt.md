---
id: 065
title: Code Review 5 Fixes Applied
stage: general
date: 2026-06-30
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: fix all this
labels: ["bug-fix", "code-review", "orders", "analytics", "cron", "refactor", "timestamps"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/api/admin/orders/route.ts
  - store/src/app/api/admin/orders/return/route.ts
  - store/src/app/api/cron/deactivate-sales/route.ts
  - store/src/components/admin/AnalyticsClient.tsx
tests:
  - npm run build — pending
---

## Prompt

fix all this

(Applying all 5 findings from PHR 064 code review.)

## Response snapshot

**Fix 1 (HIGH) — orders/route.ts:114:** Narrowed void timestamp guard from `order_status !== undefined` to `order_status === 'cancelled' || order_status === 'returned'`. Prevents silent Supabase errors on every status update pre-migration; eliminates unnecessary double-write for delivered/shipped/processing updates post-migration.

**Fix 2 (MEDIUM) — return/route.ts:43:** Added `cancelled_at: null` to the void update so the return route clears the field consistently with the PUT route. Ensures no stale `cancelled_at` survives after a cancelled→returned sequence once Fix 1 narrow guard is in effect.

**Fix 3 (MEDIUM) — cron/deactivate-sales/route.ts:** Added early `!process.env.CRON_SECRET` guard that returns HTTP 500 with a logged error instead of silently comparing against "Bearer undefined". Missing env var is now visible in Vercel function logs.

**Fix 4 (LOW) — AnalyticsClient.tsx:** Extracted `toWeeklySundayKey(d: Date): string` helper from the repeated `ws.setDate(d.getDate() - d.getDay()); return localDateKey(ws)` pattern. Used in both `buildTrendData` and `buildSalesTrendTable`, eliminating the duplication.

**Fix 5 (LOW) — AnalyticsClient.tsx:** Merged three separate `orders.filter(...).forEach(o => items.forEach(i => ...))` passes (productMap, productRepeatMap, productSizeColorMap) into a single combined pass. Reduces O(orders×items) work by 2/3 for the Analytics Products tab render.

## Outcome

- ✅ Impact: 1 confirmed bug eliminated (silent Supabase errors on every non-terminal status update), 2 medium consistency gaps closed, 1 code duplication removed, 1 efficiency improvement.
- 🧪 Tests: npm run build — pending.
- 📁 Files: 4 files modified.
- 🔁 Next prompts: Push to main → Vercel deploy → verify no Supabase errors in logs for order status updates.
- 🧠 Reflection: Fix 1 + Fix 2 are coupled — narrowing the PUT guard required the return route to also clear cancelled_at. Both applied together so the invariant holds end-to-end.

## Evaluation notes (flywheel)

- Failure modes observed: Edit tool required explicit Read before editing return/route.ts — file was seen in diff output but tool tracking required a direct Read call.
- Graders run and results (PASS/FAIL): Build pending.
- Prompt variant (if applicable): null
- Next experiment: null
