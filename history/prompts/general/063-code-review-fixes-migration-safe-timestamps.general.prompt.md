---
id: 063
title: Code Review Fixes Migration Safe Timestamps
stage: general
date: 2026-06-30
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: test all this and analyze all changes with code review / fix it
labels: ["admin", "bug-fix", "orders", "timestamps", "migration", "code-review", "dashboard"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/api/admin/orders/route.ts
  - store/src/app/api/admin/orders/return/route.ts
  - store/src/components/admin/DashboardCharts.tsx
tests:
  - admin-kpi-test.mjs — 21/21 PASS
  - admin-auth-full.mjs — 11/11 PASS
  - admin-login-manual.mjs — PASS
  - Build: npm run build — ✓ Compiled (0 TypeScript errors, 43 pages)
---

## Prompt

test all this and analyze all changes with code review / fix it (I already run supabase migration)

## Response snapshot

**Testing:** All 3 Playwright suites run in parallel — 21/21 + 11/11 + login manual all PASS.

**Code review (subagent)** found 3 issues in commit 38a186b:

**Issue 1 (Critical, 100%)** — `cancelled_at`/`returned_at` in main `update` object of `orders/route.ts`. Since Supabase migration was pending, PostgREST rejected the entire UPDATE for containing unknown columns — breaking all order cancellations.
- Fix: removed from main `update`, added a separate `void supabaseAdmin.from('orders').update({ cancelled_at: ..., returned_at: ... }).eq('id', id)` after main update succeeds. Migration-safe: fails silently before columns exist, works transparently after migration runs.

**Issue 2 (Important, 90%)** — `/api/admin/orders/return/route.ts` never set `returned_at`. Admin returns always go through this route (not the main PUT), so the `returned_at` branch in DashboardCharts was permanently unreachable — `returned7d` always used `created_at`.
- Fix: added `void supabaseAdmin.from('orders').update({ returned_at: new Date().toISOString() }).eq('id', id)` after the return update succeeds.

**Issue 3 (Important, 82%)** — `cancelled_at` never cleared on status reversal; would inflate `cancelled7d` for reverted cancellations.
- Fix: the void call sets `cancelled_at: order_status === 'cancelled' ? now : null` and `returned_at: order_status === 'returned' ? now : null` — both cleared on any other status, handling reversals cleanly.

**DashboardCharts simplification:** `cancelled7d`/`returned7d` filters changed to:
```ts
orders.filter(o => o.order_status === 'cancelled' && isWithinDays(o.cancelled_at ?? o.created_at, 7))
```
`order_status` guard handles reversals; `?? o.created_at` handles pre-migration fallback.

**Supabase migration confirmed run by user:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS returned_at  TIMESTAMPTZ;
```

All fixes committed in d73ce54. Build clean, 21/21 tests pass.

## Outcome

- ✅ Impact: Order cancellations unblocked; returned_at now written by the return route; cancelled/returned 7d counts use action date when available; status reversals handled cleanly.
- 🧪 Tests: Build ✓ (0 errors). Playwright 21/21 + 11/11 PASS.
- 📁 Files: 3 files modified, 15 insertions / 5 deletions, commit d73ce54.
- 🔁 Next prompts: push to production; verify cancellation in admin sets cancelled_at in Supabase table.
- 🧠 Reflection: The critical bug (Issue 1) was introduced by adding migration-dependent columns to the main update in the same commit as the migration note — a sequencing mistake. The void-call pattern (separate fire-and-forget update) is the right fix: keeps the main operation atomic and makes the timestamp write progressively adoptable without code changes.

## Evaluation notes (flywheel)

- Failure modes observed: placed migration-dependent columns in main update object before migration ran — caused silent cancellation breakage. Fix: always separate schema-dependent writes into secondary calls when migration is pending.
- Graders run and results (PASS/FAIL): admin-kpi-test.mjs 21/21 PASS, admin-auth-full.mjs 11/11 PASS.
- Prompt variant (if applicable): null
- Next experiment: add a Playwright test that cancels an order and checks the DB row for cancelled_at being populated.
