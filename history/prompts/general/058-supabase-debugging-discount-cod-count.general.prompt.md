---
id: 058
title: Supabase Debugging — discount_percentage undefined and COD count zero
stage: general
date: 2026-06-29
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: ecom-supabase-debugging skill
labels: ["debugging","supabase","select","rls","cod","order_status"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/(store)/shop/[slug]/page.tsx
tests:
  - none
---

## Prompt

You have access to the following debugging skill for this project's stack. Read it carefully before diagnosing.

**SKILL: ecom-supabase-debugging**

Now diagnose these two bugs:

**Bug 1:** A new column `discount_percentage` (integer, nullable, default null) was added to the Supabase `products` table via migration. The product detail page renders `undefined` for discount_percentage even though running `SELECT discount_percentage FROM products LIMIT 5` in Supabase Studio returns real values like 10, 20, 15.

**Bug 2:** The admin dashboard shows 0 COD (Cash on Delivery) orders even though Supabase Studio shows 14 orders with order_status = 'new' and payment_method = 'cod'. The dashboard count query looks like this:
```ts
const { count } = await supabase
  .from('orders')
  .select('id', { count: 'exact' })
  .in('order_status', ['processing', 'shipped', 'delivered'])
```

For each bug: name the root cause first, then show the exact code fix.

## Response snapshot

**Bug 1 — Root cause:** `discount_percentage` is absent from the hand-rolled `.select('name, description, images, price, slug')` on line 23 of `store/src/app/(store)/shop/[slug]/page.tsx`. Supabase silently returns `undefined` for any column not in the select string.

**Fix:** Add `discount_percentage` to that select:
```ts
.select('name, description, images, price, slug, discount_percentage')
```
All other product queries in `store/src/lib/products.ts` use `.select('*, categories(name, slug)')` so they are unaffected.

**Bug 2 — Root cause:** COD orders are created with `order_status = 'new'` and sit there until an admin advances them. The count query's `.in('order_status', ['processing', 'shipped', 'delivered'])` excludes `'new'`, so all 14 COD orders are invisible to the count.

**Fix:** Add `'new'` to the status list:
```ts
.in('order_status', ['new', 'processing', 'shipped', 'delivered'])
```
Secondary occurrences of the same missing-`'new'` pattern exist in:
- `store/src/app/(store)/shop/[slug]/page.tsx` line 86 (24h sold badge)
- `store/src/lib/scoring.ts` line 83 (product scoring)
- `store/src/app/api/cron/archive/route.ts` line 30 (archive guard — intentional, leave as-is)

## Outcome

- ✅ Impact: Identified exact file and line for both bugs; no code was modified (diagnosis only)
- 🧪 Tests: none run
- 📁 Files: store/src/app/(store)/shop/[slug]/page.tsx (lines 23, 86); store/src/lib/scoring.ts (line 83); store/src/app/api/cron/archive/route.ts (line 30)
- 🔁 Next prompts: apply the fixes; consider adding `'new'` to the scoring and product-page sold-count queries if COD orders should influence those signals
- 🧠 Reflection: Both bugs are canonical patterns from the ecom-supabase-debugging skill — missing field in select and missing status in filter. Skill worked as designed.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): apply the two-line fixes and reload the product page + dashboard to verify
