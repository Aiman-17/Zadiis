---
id: 071
title: Returns/exchange policy Q&A and order-lookup bug investigation
stage: explainer
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["returns", "exchange", "bug-investigation", "order-lookup", "qa"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/app/api/requests/return/route.ts (read only, no change)
 - store/src/components/products/AddToCartButton.tsx (read only, no change)
 - store/src/lib/cart-store.ts (read only, no change)
 - store/src/app/(store)/cart/CartClient.tsx (read only, no change)
 - store/src/app/api/orders/route.ts (read only, no change)
tests:
 - Manual curl reproduction against live /api/requests/return with real DB order numbers (no automated test added)
---

## Prompt

what if customer wants to order same product 5 times or any in different colors (they can select colors only once)
dont imple,ent anything only tell

[Next]: do returns and exchange only works with a paid orders within 7 days

[Next]: okay but I think there is a bug if I enter a product number order from 3 july but it raises an eror that number of prodcut didnot exist etc test it

[Next]: I am typing ZD-5110 (coords real order  I do at july) but still error raise without spacing

[Next]: okay my mistake

## Response snapshot

- Explained the free-delivery quantity math against real cart mechanics: `addToCart()` merges by `id+size+color`, so repeated same-color adds bump one line's quantity; different colors become separate line items; either way `checkout/page.tsx`'s `totalQuantity` sums quantity across every line item, so 5 units via any combination of colors/products reaches the free-delivery threshold identically. Flagged an adjacent (unasked) caveat: neither add-to-cart nor the cart page's qty stepper re-checks stock against what's already in the cart.
- Explained the actual return/exchange eligibility rule from `store/src/app/api/requests/return/route.ts:47-73`: only checks order exists, `created_at` within 7 days, and `order_status !== 'cancelled'`. There is no `payment_status` check at all — a COD order with nothing paid yet, or an online order with failed/pending payment, is not blocked. Also noted `'returned'` status isn't checked either (a second return request against an already-returned order wouldn't be rejected).
- Investigated the reported bug by pulling real order numbers from Supabase directly (script querying `orders` table) and hitting the live `/api/requests/return` endpoint with curl. Confirmed: exact-format order numbers work; `ZD1049` (no dash) and `#ZD-1049` (hash prefix) both incorrectly return 404 NOT_FOUND even though the order exists and is within the window. Root cause: `.trim().toUpperCase()` normalization doesn't strip non-alphanumeric characters or tolerate a missing dash before the exact-match `.eq('order_number', ...)` lookup. Confirmed the 7-day expiry logic itself is correct and distinct from NOT_FOUND (tested an 8-day-old real order → got the EXPIRED message, not NOT_FOUND).
- User then tested `ZD-5110`, claiming it was a real July order with exact spacing. Verified directly against the DB: no such order exists (exact match, fuzzy `ilike` search, and range check all confirmed) — order numbers are strictly sequential (`generateOrderNumber()` in `api/orders/route.ts:7-22`, `ZD-{max+1}` starting at 1001), current max is `ZD-1055` out of 55 total orders, so `ZD-5110` was never possible. User acknowledged the mistake.

## Outcome

- ✅ Impact: No code changed in this exchange — pure investigation/Q&A. Left the user with an accurate mental model of (a) how the 5-item free-delivery threshold interacts with per-color/per-product cart lines, (b) the real return/exchange eligibility rule (no payment check, 7-day window off `created_at`), and (c) one confirmed, reproducible, unfixed bug: order-number lookup fails on missing-dash or `#`-prefixed input.
- 🧪 Tests: Manual curl reproduction only (documented above); no automated regression test added yet for the order-number normalization bug.
- 📁 Files: none modified — investigation only.
- 🔁 Next prompts: user has not yet asked for the order-number normalization bug to be fixed — offered but not actioned. Consider filing via `/sp.bug-report` and adding a regression test (`ZD1049` / `#ZD-1049` → should still resolve) if/when the user asks for the fix.
- 🧠 Reflection: querying Supabase directly (small throwaway node scripts run from inside `store/` so `node_modules` resolves) was the fastest way to get ground truth for "does this order exist" instead of guessing from code alone — worth reaching for again when a reported bug hinges on live data.

## Evaluation notes (flywheel)

- Failure modes observed: none in my own output; the user's own report (`ZD-5110`) turned out to be a data mistake, not a bug — correctly distinguished from the genuine `ZD1049`/`#ZD-1049` bug via direct DB verification before concluding either way.
- Graders run and results (PASS/FAIL): n/a (no code change to grade)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): if the user asks to fix the order-number bug, smallest viable fix is stripping non-alphanumerics (`replace(/[^A-Z0-9]/g, '')`) on both the stored and incoming value before comparison, or comparing against a normalized column.
