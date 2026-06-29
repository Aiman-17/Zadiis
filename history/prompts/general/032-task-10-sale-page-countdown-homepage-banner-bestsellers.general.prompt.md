---
id: "032"
title: Task 10 Sale Page Countdown Homepage Banner Bestsellers
stage: green
date: 2026-06-23
surface: agent
model: claude-sonnet-4-6
feature: sale-store-page
branch: main
user: Aiman-17
command: implement task-10
labels: ["sale","countdown","homepage","bestsellers","productcard","task-10"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/products/ProductCard.tsx
  - store/src/lib/products.ts
  - store/src/components/products/SaleCountdown.tsx
  - store/src/app/(store)/sale/page.tsx
  - store/src/app/(store)/page.tsx
  - .superpowers/sdd/task-10-report.md
tests:
  - npx tsc --noEmit (0 errors)
---

## Prompt

Implement Task 10 (final task) of the ZADIIS Next.js e-commerce project: create the public sale store page, countdown timer component, add a sale price badge to ProductCard, add `getBestsellerProducts` to lib/products.ts, and update the homepage with a sale banner and best sellers section.

## Response snapshot

Implemented all 5 steps:
1. Updated `ProductCard.tsx` with optional `salePrice?: number` prop — sale price shown in red (#DC2626), original struck-through in gray (#9CA3AF)
2. Added `getBestsellerProducts(limit=6)` to `store/src/lib/products.ts` querying `is_bestseller=true` active in-stock products
3. Created `store/src/components/products/SaleCountdown.tsx` — client component with useEffect/setInterval countdown (h/m/s), "Sale has ended" when expired, brand color #A68B6E for "Ends in" label
4. Created `store/src/app/(store)/sale/page.tsx` — server component (`force-dynamic`), fetches active sale directly from supabaseAdmin, shows dark header (#1C1C1C) with title/description/countdown, 2-3 col product grid with salePrice, "No Active Sale" fallback
5. Updated `store/src/app/(store)/page.tsx` — added `getBestsellerProducts` import, expanded Promise.all to fetch activeSale and bestSellers, added sale banner (warm brown #A68B6E) after Trust Bar, added Best Sellers grid after New Arrivals; hero section untouched

TSC: 0 errors. Committed as 5358b65.

## Outcome

- Impact: Sale page at /sale with countdown timer, homepage sale banner + best sellers section, ProductCard sale badge — all wired up
- Tests: TypeScript type-check passed with zero errors
- Files: 5 files modified/created; 1 new directory (sale/)
- Next prompts: End-to-end test with a live sale in admin; verify delivery charge override in checkout
- Reflection: All changes minimal and targeted; hero section left untouched per spec; type casts on Supabase nested joins match the pattern established in the brief

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): tsc --noEmit PASS
- Prompt variant (if applicable): null
- Next experiment: Add days to countdown display for sales lasting more than 24 hours
