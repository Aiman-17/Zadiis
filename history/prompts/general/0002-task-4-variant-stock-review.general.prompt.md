---
id: "0002"
title: Task 4 Variant Stock Enforcement Review
stage: general
date: 2026-06-23
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: code-review (inline)
labels: ["code-review", "variant-stock", "zadiis", "AddToCartButton", "task-4", "stock-enforcement"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - .superpowers/sdd/task-4-brief.md
  - .superpowers/sdd/task-4-report.md
  - .superpowers/sdd/review-18b8abe..ba2e596.diff
  - store/src/components/products/AddToCartButton.tsx
  - store/src/app/api/orders/route.ts
  - store/src/app/api/payments/tracker/route.ts
tests:
  - npx tsc --noEmit (zero errors confirmed)
---

## Prompt

Review Task 4 of ZADIIS — per-variant stock enforcement in AddToCartButton and order APIs.

**Brief:** `C:\Users\QC\Desktop\ecom-business-project\.superpowers\sdd\task-4-brief.md`
**Report:** `C:\Users\QC\Desktop\ecom-business-project\.superpowers\sdd\task-4-report.md`
**Diff:** `C:\Users\QC\Desktop\ecom-business-project\.superpowers\sdd\review-18b8abe..ba2e596.diff`

**Global constraints to verify:**
- `hasTracking = Object.keys(product.variant_stock ?? {}).length > 0` — gates ALL variant logic; legacy products (`{}`) get zero behavior change
- Sentinel key `"_"` used consistently: `selectedColor || '_'` and `selectedSize || '_'` in all lookups
- `isSizeDisabled`: checks `variant_stock[selectedColor || '_'][size] <= 0` — only when hasTracking
- `isColorDisabled`: all sizes under color are 0 (every value in `variant_stock[color]` is 0)
- Color selection RESETS `selectedSize` to `''` (so sizes re-evaluate under the new color)
- Disabled sizes: rendered with `disabled` prop + `line-through` style + `cursor: not-allowed` — NOT hidden
- Disabled colors: rendered at `opacity: 0.35` + `cursor: not-allowed` + visual indicator (slash/overlay) — NOT hidden
- Global sold-out: still uses `product.stock_quantity === 0` as the button disabled check
- `orders/route.ts` decrement loop: passes `p_color: item.color || '_'` and `p_size: item.size || '_'`
- `tracker/route.ts` decrement loop: same RPC params as orders/route.ts
- Zero TypeScript errors

Report: Spec ✅/❌, Issues (Critical/Important/Minor), Task quality: Approved/Needs fixes.

## Response snapshot

Reviewed all three changed files against every enumerated constraint. All 11 spec constraints pass. Two important issues identified: (1) dead `getVariantQty` helper defined but never called anywhere; (2) the `disabled` condition on the Add to Cart button includes `selectedColor !== ''` which falsely prevents the button from going disabled for size-only tracked products — handleAdd still blocks the add but the button remains visually active. Task verdict: Needs Fixes.

## Outcome

- ✅ Impact: Full constraint-by-constraint audit of Task 4 completed; all spec constraints verified with exact line references; two important issues surfaced with specific fix guidance.
- 🧪 Tests: tsc --noEmit passed with zero errors.
- 📁 Files: Read-only review — no files modified by this exchange.
- 🔁 Next prompts: Fix the `disabled` button condition by removing `selectedColor !== ''`; remove dead `getVariantQty` function; re-run tsc; commit fix.
- 🧠 Reflection: The `selectedColor !== ''` guard was an intuitive "both selections made" shorthand that silently breaks for products without colors — always test the no-color and no-size sentinel paths explicitly in variant stock logic.

## Evaluation notes (flywheel)

- Failure modes observed: None in the review process itself. The implementation had one subtle boolean logic error in the button disabled condition that wasn't caught in the agent's self-report — the agent report said "no concerns."
- Graders run and results (PASS/FAIL): Manual constraint-by-constraint line trace — PASS on 9/11 constraints, FAIL on button disabled UX for size-only products, WARNING on dead code.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Add an explicit test case in the brief for "size-only product with variant_stock tracking" to catch the selectedColor !== '' edge case at spec time rather than review time.
