---
id: 0008
title: BUG-004 fix — consolidate effective stock computation
stage: green
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: null
labels: ["bugfix", "inventory", "stock-drift", "checkout", "last-chance", "refactor"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/lib/stock.ts
 - store/src/lib/scoring.ts
 - store/src/lib/products.ts
 - store/src/components/products/ProductCard.tsx
 - store/src/components/products/AddToCartButton.tsx
 - store/src/app/(store)/shop/[slug]/page.tsx
 - store/src/app/(store)/sale/page.tsx
 - store/src/app/api/orders/route.ts
 - store/src/app/api/payments/tracker/route.ts
 - store/src/app/api/cart/validate/route.ts
 - store/src/components/admin/AdminProductsClient.tsx
 - store/src/components/admin/AnalyticsClient.tsx
 - store/src/components/admin/DashboardCharts.tsx
 - store/src/app/admin/sales/new/page.tsx
 - store/src/app/admin/sales/[id]/edit/page.tsx
 - store/tests/store/product.spec.ts
 - specs/001-e2e-test-suite/bugs/BUG-004-stock-quantity-drifts-from-variant-stock.md
tests:
 - store/tests/store/product.spec.ts (last-chance urgency test, fixed strict-mode locator, 1/1 pass)
 - full store+admin Playwright regression (157 tests, 144 pass, 12 skip, 0 fail)
---

## Prompt

fix it

## Response snapshot

Implemented the fix BUG-004 recommended, but scope grew significantly once
the actual codebase was searched rather than trusting the report's original
"3 duplicates" estimate. Created store/src/lib/stock.ts exporting a single
getEffectiveStock() (prefers the sum of variant_stock over raw
stock_quantity whenever variants are tracked). Grepped for every
independent reimplementation of this exact computation and found 11, not
3: scoring.ts::getTotalStock(), ProductCard.tsx::getEffectiveStock(),
shop/[slug]/page.tsx (two separate inline computations — isSoldOut AND
totalStock), sale/page.tsx::getTotalStock(), AdminProductsClient.tsx
::getProductStock(), AnalyticsClient.tsx::getMerchStock(),
DashboardCharts.tsx (three separate local functions: getProductStock,
dashStock, and an inline reduce for the totalStock KPI), and
admin/sales/new/page.tsx + admin/sales/[id]/edit/page.tsx's getStock().
All 11 consolidated to import the shared function.

Then fixed the actual bug consequences — six consumers that had never been
routed through ANY of those existing helpers, still trusting raw
stock_quantity directly:
1. orders/route.ts (COD checkout stock validation)
2. payments/tracker/route.ts (online-payment checkout — same bug,
   previously undiscovered since BUG-004's report only named the COD path)
3. cart/validate/route.ts (had no variant awareness at all, not even a
   fallback per-variant check as thorough as the other two)
4. AddToCartButton.tsx's totalOutOfStock (the most customer-visible
   instance — this drove the actual disabled/"Sold Out" state of the Add
   to Cart button on the product's own page, contradicting ProductCard's
   already-correct in-stock display in listings)
5. shop/[slug]/page.tsx's remaining raw stock_quantity reads (an "Out of
   Stock" badge and a "Hurry! Only X left" urgency message that had
   survived an earlier partial consolidation on the same page)
6. products.ts's getLastChanceProducts() and the Shop's 'last-chance' tab
   — switched from a DB-level stock_quantity range filter to fetching the
   active catalog and filtering/sorting on effective stock in JS (same
   pattern merchandising.ts already established for Best Seller/Trending)

Rebuilt, verified live: POST /api/cart/validate for the previously-blocked
product now returns {"unavailable":[]}; its product page renders "Add to
Cart" (not "Sold Out") and "Hurry! Only 2 left in stock". Ran the full
store+admin regression — 1 failure, a pre-existing test
(product.spec.ts:100) hitting a Playwright strict-mode violation because
the fix now correctly shows BOTH the "Almost Gone — Final Stock" badge and
the urgency message simultaneously for this product (previously it wasn't
reachable via the last-chance tab at all, so this combination was never
exercised) — fixed by adding .first() to the assertion, not a product
regression. Reran clean: 144/144 non-skipped tests pass.

Updated BUG-004's status to Fixed with verification evidence, and added a
Post-fix note explaining the previously-recommended data-reconciliation
SQL is no longer required for correctness (every consumer now ignores the
stale stock_quantity value when variant_stock exists) — offered as
optional data-hygiene SQL instead, not applied (no direct DB write access
this session).

## Outcome

- ✅ Impact: A real, live, revenue-losing checkout bug is fixed — "New suit best cotton quality with printed" is purchasable again in any size. Eleven duplicated stock computations across the codebase now share one implementation, closing off this entire class of future drift-blindness bugs, not just the two symptoms originally reported.
- 🧪 Tests: full store+admin regression 144/144 non-skipped pass (1 pre-existing test fixed for a strict-mode locator issue surfaced by the fix, not caused by it).
- 📁 Files: 15 code files consolidated/fixed, 1 test file fixed, BUG-004 report updated to Fixed.
- 🔁 Next prompts: awaiting user decision on whether to commit/push (not done yet, per instruction not to commit without asking), and whether to apply the now-optional data-hygiene SQL.
- 🧠 Reflection: the bug report's own "Component" field named only 2 places and estimated 3 duplicate helpers; actually grepping the codebase before fixing (rather than trusting the report's prior estimate literally) surfaced 11 duplicates and 6 real consumer-facing bugs, including the online-payment checkout path and the Add to Cart button's own Sold Out state — the single most customer-visible instance, which the original report hadn't even named as a component. Reports written from partial investigation are a starting point for the fix, not its ceiling.

## Evaluation notes (flywheel)

- Failure modes observed: a report scoping itself to the components visible during the initial investigation ("checkout" meant only the COD path; "3 duplicates" was an undercount) — mitigated by a full grep sweep before considering the fix complete, the same discipline used in 003-merchandising-badges-v2's audit.
- Graders run and results (PASS/FAIL): tsc --noEmit — PASS (clean) at every intermediate step. Live verification (cart/validate, Add to Cart button rendering) — PASS. Full regression — PASS (144/144 after 1 test fix).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): none pending user's commit decision.
