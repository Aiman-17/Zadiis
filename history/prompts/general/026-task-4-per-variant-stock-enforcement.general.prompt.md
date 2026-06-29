---
id: "026"
title: Task 4 Per-Variant Stock Enforcement
stage: green
date: 2026-06-23
surface: agent
model: claude-sonnet-4-6
feature: variant-stock
branch: main
user: Aiman-17
command: implement task-4-brief.md
labels: ["variant-stock","add-to-cart","rpc","stock-enforcement","ui"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/products/AddToCartButton.tsx
  - store/src/app/api/orders/route.ts
  - store/src/app/api/payments/tracker/route.ts
  - .superpowers/sdd/task-4-report.md
tests:
  - npx tsc --noEmit (0 errors)
---

## Prompt

You are implementing Task 4 of a Next.js e-commerce project (ZADIIS). This task adds per-variant stock enforcement to the store UI and order APIs.

Three files to update:
1. store/src/components/products/AddToCartButton.tsx — variant-aware disabled size/color buttons
2. store/src/app/api/orders/route.ts — decrement_stock RPC now passes p_color and p_size
3. store/src/app/api/payments/tracker/route.ts — same RPC change

Key constraints:
- variant_stock: {} = legacy product, no filtering
- Sentinel key "_" = dimension absent
- Disabled buttons still rendered (not hidden)
- Global "Sold Out" still uses product.stock_quantity === 0

## Response snapshot

All three files updated per task-4-brief.md spec:

- AddToCartButton.tsx: full rewrite adding hasTracking gate, isSizeDisabled/isColorDisabled helpers, selectedVariantQty useMemo, disabled UI rendering with line-through for sizes and opacity+slash for colors, color change resets selectedSize
- orders/route.ts: decrement loop type widened, p_color and p_size added to RPC call
- tracker/route.ts: same decrement loop change

TSC: 0 errors. Commit: ba2e596.

## Outcome

- Impact: Per-variant stock now enforced in UI (disabled buttons) and server-side (RPC receives color/size). Legacy products unaffected (hasTracking=false guard).
- Tests: tsc --noEmit passes with 0 errors
- Files: 3 modified, 1 report created
- Next prompts: Task 5 (if any); manual QA against a product with mixed variant stock
- Reflection: Straightforward implementation matching the brief exactly. The sentinel `_` key pattern cleanly handles single-dimension and dimensionless products.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): tsc PASS
- Prompt variant (if applicable): null
- Next experiment: null
