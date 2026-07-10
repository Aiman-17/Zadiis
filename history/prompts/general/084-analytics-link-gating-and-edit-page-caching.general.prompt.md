---
id: 084
title: Analytics link gating, product edit page caching
stage: green
date: 2026-07-05
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["sale", "analytics", "caching", "reliability"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/app/admin/sales/page.tsx
 - store/src/app/admin/products/[id]/edit/page.tsx
tests:
 - typecheck: npx tsc --noEmit (clean)
 - build: npm run build (clean) — confirmed /admin/products/[id]/edit flipped from static (○) to dynamic (ƒ)
 - manual: full E2E suite re-run (139 passed, 0 failed, 18 skipped) after the previous sale-integration fixes, then a targeted re-run of sales.spec.ts + products.spec.ts (15 passed, 1 pre-existing skip, 0 failed) after these two additional fixes
 - manual: verified live against real data — confirmed Flash Sale has zero real historical orders in its actual window (2026-07-04 06:53 -> 2026-07-05 06:53; the only real is_sale orders are from June 25-27 under other sales), so the previous fix was correct; the Analytics link was simply hidden by a separate, pre-existing bug. After removing the orders>0 gate, all 5 sales show an Analytics link, and Flash Sale's link correctly opens the margin-preview view (4 products, 70% discount each, has_orders:false)
---

## Prompt

> the analytics is not showing on flash sale (latest)

> there is a severe bug find out

> yes

## Response snapshot

Investigated the "analytics not showing" report by checking real order data directly: Flash Sale's actual window (`2026-07-04T06:53` → `2026-07-05T06:53`) genuinely has zero historical `is_sale` orders — the only 4 real ones are from June 25–27, all under other sales' windows. So the previous session's fix (scoping revenue by date window instead of "last sale wins") was working correctly; it just surfaced a separate, real bug that had been hidden until then.

**The bug**: `admin/sales/page.tsx`'s "Analytics" link was gated behind `{(rev?.orders ?? 0) > 0 && <Button>...}`, completely hiding the link for any sale with zero orders. But the analytics detail page/route was explicitly built to handle that exact case — a "Margin Preview" mode showing projected profit per unit for a sale with products but no sales yet. Admins could never reach that page at all for a fresh or quiet sale, since the button that links to it never rendered. Fixed by removing the gate entirely — the link is now always shown, since the detail page already handles every state (no products / no orders yet / has orders) gracefully.

While already auditing this file, also picked up a queued follow-up from the previous fix: a codebase-wide check (via a research agent) for the same missing-`force-dynamic` bug pattern that had frozen `admin/sales` on a year-old build cache. Found one more real instance: `admin/products/[id]/edit/page.tsx` — a Server Component fetching a live, admin-editable product row with no dynamic-rendering directive, same stale-cache risk. Fixed by adding `force-dynamic`, matching every other admin data page's convention.

## Outcome

- ✅ Impact: admins can now open analytics/margin-preview for any sale regardless of order count; the product edit page can no longer serve a frozen, potentially-overwritable stale form.
- 🧪 Tests: typecheck + build clean; full E2E suite re-run clean (139/0/18) after the prior round of sale fixes; targeted re-run of the two directly affected spec files (15/0/1) after these two fixes.
- 📁 Files: store/src/app/admin/sales/page.tsx, store/src/app/admin/products/[id]/edit/page.tsx
- 🔁 Next prompts: none identified — the force-dynamic audit is now complete across the codebase (confirmed via the research agent's full sweep: everything else either already has it, inherits it from `(store)/layout.tsx`'s own `force-dynamic`, or is a client component fetching data at runtime)
- 🧠 Reflection: what looked like a regression from the last fix was actually the last fix working correctly and exposing a second, independent bug that had been masked by the first one (cross-sale revenue contamination happened to make sales look like they had orders, which incidentally kept their Analytics links visible). Worth remembering that fixing one bug can retire the accidental workaround that was hiding another.

## Evaluation notes (flywheel)

- Failure modes observed: none in the fixes themselves; the investigative process (checking real order data before assuming a regression) correctly avoided a wrong diagnosis.
- Graders run and results (PASS/FAIL): full E2E suite — PASS; targeted sales/products spec re-run — PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
