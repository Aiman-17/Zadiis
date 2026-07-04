---
id: 070
title: Free delivery item threshold, sale filter hide, return/cancel test verification
stage: green
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["checkout", "shipping-policy", "e2e-testing", "shop-filters", "bugfix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/app/(store)/returns/page.tsx (verified only, no change)
 - store/src/app/(store)/cancel-order/page.tsx (verified only, no change)
 - store/src/app/(store)/page.tsx
 - store/src/app/(store)/shipping/page.tsx
 - store/src/app/(store)/checkout/page.tsx
 - store/src/app/(store)/shop/page.tsx
 - store/src/components/products/ProductFilters.tsx
 - store/tests/store/home.spec.ts
 - store/tests/store/checkout-otp.spec.ts
tests:
 - store/tests/store/returns.spec.ts (7 passed — returns & cancel-order flows)
 - store/tests/store/checkout.spec.ts (7 passed, 2 pre-existing env-gated skips)
 - store/tests/store/checkout-otp.spec.ts (13 passed, after fixing a pre-existing payment-method fallback gap)
 - store/tests/store/shop.spec.ts (10 passed, 1 pre-existing skip)
 - store/tests/store/home.spec.ts (6 passed, after updating trust-bar copy assertion)
 - Full store suite: 68 passed, 13 skipped (pre-existing, env-gated), 0 failed
---

## Prompt

Now test exchange return and cancel page aslo the free delivery policy make it over 5 orders on every page shipping you add that home checkout procudure etc.

[Mid-task follow-up]: also remove sale btn from store page filter section (because sale is not activated or make it hide when sale is inactive)

[Clarifying answer given when asked whether "over 5 orders" meant a PKR subtotal threshold or a loyalty-order-count threshold]: no free delivery over 5 orders means they order 5 products or 5 stock not 1 unit or product

## Response snapshot

- Verified /returns (titled "Returns & Exchanges") and /cancel-order pages: existing Playwright coverage (`returns.spec.ts`) already exercises both forms happy-path + negative-path; ran and confirmed all 7 pass.
- Free delivery policy was previously marketing-copy only ("Free delivery over PKR 10,000" on home + /shipping) with no actual enforcement in checkout pricing. Clarified with user: the real rule is item-quantity based — free delivery once total cart quantity ≥ 5 units (not a price threshold, not a loyalty/order-count perk).
  - Implemented in `checkout/page.tsx`: `FREE_DELIVERY_MIN_QUANTITY = 5`, computed `qualifiesForFreeDelivery` from summed cart item quantities, delivery charge zeroed when met (overrides zone charge / sale override), summary line shows "Free", and a nudge line shows "Add N more item(s) for free delivery" when under threshold.
  - Updated copy on homepage trust bar and /shipping page to "Free delivery on orders of 5+ items" / "5 or more items".
- Sale filter pill: `ProductFilters.tsx` always rendered a "Sale" category button regardless of whether a sale was active. Split into `BASE_CATEGORIES` + conditional `hasSale` prop (same pattern already used by Header/Footer/StoreLayout — queries `sales` table for an active, non-expired sale). `shop/page.tsx` now queries sale status server-side and passes `hasSale` down. Verified live: current DB has no active sale, and the Sale pill no longer appears on /shop.
- Verification friction: the locally running server turned out to be a stale `next start` (production) process serving pre-edit HTML — killed it, and every subsequent `next dev` (Turbopack) attempt hung at the request-handling layer (TCP connect succeeded, HTTP response never returned, confirmed via Test-NetConnection + long-timeout curl) across multiple ports, independent of the edits. Rebuilt with `npm run build` and served via `npm run start`, which reliably serves requests in this sandboxed Windows environment — used that to run the full Playwright store suite.
- Full store suite: typecheck clean; 68 passed, 13 skipped (pre-existing, env-gated — payment gateway secrets), 0 failed. Fixed two now-stale test assertions along the way: `home.spec.ts` trust-bar text match, and a genuine pre-existing gap in `checkout-otp.spec.ts` (test only clicked COD "if visible" with no fallback, so when `cod_enabled=false` in this DB it never selected any payment method and never reached the OTP-guard code path under test — added a JazzCash fallback).

## Outcome

- ✅ Impact: Return/cancel/exchange journeys confirmed working end-to-end with no regressions. Free delivery is now a real, enforced checkout rule (5+ items) instead of unbacked marketing copy, and messaging is consistent across home/shipping/checkout. Sale filter pill correctly hides when no sale is active, matching Header/Footer/nav behavior.
- 🧪 Tests: Full `store` Playwright project green (68 passed / 13 pre-existing skips / 0 failed) against a fresh production build.
- 📁 Files: see files list above — 3 copy/logic edits, 1 filter component + 1 page wiring, 2 test-file corrections.
- 🔁 Next prompts: consider whether server-side order creation should also validate/recompute the free-delivery charge (currently trusts the client-submitted `delivery_charge`, a pre-existing pattern unrelated to this change); consider a similar "N more items for free delivery" nudge on the cart page.
- 🧠 Reflection: local verification was blocked for a long stretch by an unrelated environment quirk (Turbopack dev server accepting TCP connections but never completing HTTP requests in this sandbox) — worth remembering that `next build && next start` is the reliable fallback here when `next dev` misbehaves.

## Evaluation notes (flywheel)

- Failure modes observed: stale `next start` process masking edits during first verification pass; Turbopack dev server hang unrelated to code changes; two test files with assertions/fallbacks that hadn't kept pace with copy changes and DB config (cod_enabled=false).
- Graders run and results (PASS/FAIL): Playwright store suite — PASS (68/68 non-skipped); `tsc --noEmit` — PASS (no errors).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): investigate root cause of the Turbopack dev-server hang in this sandbox so future verification doesn't need the build+start workaround.
