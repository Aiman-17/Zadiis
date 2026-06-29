---
id: 013
title: Stock Validation and Decrement on Order Placement
stage: green
date: 2026-06-20
surface: agent
model: claude-sonnet-4-6
feature: zadiis-store
branch: main
user: Aiman-17
command: implement Task 3 Sprint 2 stock validation and decrement
labels: ["stock","orders","api","checkout","supabase-rpc"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/api/orders/route.ts
  - store/src/app/(store)/checkout/page.tsx
tests:
  - npm run build (TypeScript check — PASS)
---

## Prompt

You are implementing Task 3 of Sprint 2 for ZADIIS, a Pakistani women's fashion ecommerce store built with Next.js 16 + Supabase + TypeScript.

File 1: `src/app/api/orders/route.ts` — add stock validation BEFORE order insert and stock decrement AFTER order insert using `supabaseAdmin.rpc('decrement_stock', ...)`.

File 2: `src/app/(store)/checkout/page.tsx` — ensure `handleSubmit` shows `data.error` from the API (instead of generic alert) when `!res.ok`.

## Response snapshot

- Read both files to understand current structure.
- Added stock validation loop (per-item `stock_quantity` check) after field validation in `route.ts`, returning 400 with `outOfStock: true` when insufficient stock.
- Added stock decrement loop after successful order creation in `route.ts`, calling `supabaseAdmin.rpc('decrement_stock', ...)` for each item.
- Added `error` state to checkout page, cleared on each submit attempt.
- Replaced `alert()` calls with `setError(data.error || '...')` for API errors and network errors.
- Added inline red error banner above the Place Order button to display errors.
- Build passed cleanly: `✓ Compiled successfully`, TypeScript check passed.
- Committed as `feat: stock validation and decrement on order placement` (commit `1cbb91d`).

## Outcome

- ✅ Impact: Orders now guard against overselling — stock is validated before insert and decremented atomically via RPC after successful order creation. Checkout surfaces specific out-of-stock error messages to the user.
- 🧪 Tests: npm run build TypeScript check — PASS
- 📁 Files: store/src/app/api/orders/route.ts, store/src/app/(store)/checkout/page.tsx
- 🔁 Next prompts: Task 4 Sprint 2 (reviews/ratings), or further stock UI (product page stock display)
- 🧠 Reflection: Minimal diff approach — no unrelated code touched. Error state added cleanly to checkout without restructuring the component.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): build PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): add optimistic stock display on product pages
