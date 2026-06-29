---
id: "034"
title: Variant Stock Auto-Calc Fix and Sales 500 Analysis
stage: general
date: 2026-06-24
surface: agent
model: claude-sonnet-4-6
feature: variant-stock-sprint4
branch: main
user: Aiman-17
command: fix variant stock total + explain db status
labels: ["variant-stock","bug-fix","stock_quantity","auto-calculate","sales","migration"]
links:
  spec: docs/superpowers/specs/2026-06-23-variant-stock-reviews-checkout-design.md
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/admin/products/new/page.tsx
  - store/src/app/admin/products/[id]/edit/EditProductForm.tsx
  - store/src/app/api/admin/products/route.ts
tests:
  - manual: admin product form — variant grid stock is read-only and shows sum when grid has values
  - manual: admin product form — manual stock_quantity editable when no variant grid filled
  - manual: save product — stock_quantity in DB equals sum of all variant_stock cells
---

## Prompt

User asked:
1. Don't go live, test on localhost first
2. Did you change any Supabase previous schema (what needs to be run)?
3. Feedback on variant stock per color problem — what exactly was done vs what spec required
4. 500 internal server error on sales creation — fix it
5. Resolve errors step by step, start with stock per variant

Design target: Color × Size matrix, auto-calculated total stock, disabled sold-out variants.

## Response snapshot

### Database status (migration NOT run yet)
`supabase/migrations/sprint4_combined.sql` was CREATED but NEVER APPLIED to Supabase.
Nothing was removed from the old schema — only additions:
- products: +variant_stock JSONB, +is_bestseller boolean
- orders: +is_sale boolean
- NEW: sales table, sale_products table
- UPDATED: decrement_stock RPC (adds p_color, p_size params)

### Variant stock gap found and fixed
Gap: stock_quantity field was still manually editable, labelled "auto-calculated" but not actually calculated.
Spec says: "Total Stock = sum(all variant cells). Admin should NOT manually maintain stock_quantity."

Fix (commit ea666a2):
- Added `sumVariantStock()` helper to both admin forms
- `hasVariantTracking` computed from `Object.keys(variant_stock).length > 0`
- When grid has values: `stock_quantity` shows as read-only display, auto-derived from grid sum
- When grid is empty (legacy): manual input field shown as before
- On save: `autoStock ?? form.stock_quantity` sent to API
- API (admin/products PUT+POST): `calcTotalStock()` recalculates server-side when variant_stock non-empty

### Sales 500 error root cause
The `sales` table does not exist in the database — migration not run.
Fix: user must run `supabase/migrations/sprint4_combined.sql` in Supabase SQL Editor.
Once run, sales API will work.

## Outcome

- ✅ Variant stock auto-calculation implemented (frontend + backend)
- ✅ TypeScript: 0 errors
- ✅ Committed: ea666a2
- ⏳ Sales 500: blocked on user running migration
- ⏳ Further UX testing: to follow after migration is run
