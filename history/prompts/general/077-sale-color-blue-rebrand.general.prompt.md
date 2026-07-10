---
id: 077
title: Sale color rebrand to deep blue
stage: green
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["design", "sale", "product-card", "color"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/components/products/ProductCard.tsx
 - store/src/app/(store)/shop/[slug]/page.tsx
 - store/src/app/(store)/sale/page.tsx
 - store/src/components/layout/Header.tsx
tests:
 - typecheck: npx tsc --noEmit (clean)
 - build: npm run build (clean)
 - manual: fetched /sale and /shop/suit-for-women live and grepped for the new blue (#1E3A8A) and old red (#C62828) — confirmed blue now present on sale/discount elements (7 and 10 occurrences respectively) while red is preserved only on the unrelated low-stock "Almost Gone"/"Going Fast" urgency indicators that happened to share the same hex before
---

## Prompt

> make sale color blue on all store sale pages and products card discount

(clarifying answer, interjected while investigating scope:) > deep and calm blue

## Response snapshot

`#C62828` (red) was being reused across three unrelated semantic concepts in the store: sale/discount branding, low-stock urgency ("Almost Gone", "Only X left", "Going Fast"), and the homepage "Trending"/"Last Chance" section tabs. Rather than blanket-replacing every occurrence, audited each one by context and changed only the genuinely sale/discount-related instances to a deep, calm navy (`#1E3A8A`):

- `ProductCard.tsx` — the `-XX%` discount badge shown on every product card storewide.
- `shop/[slug]/page.tsx` — the ambient "Sale On Now" banner (dot + "View Sale →"), the "Sale" tag + "Limited time price" text, and the main product's own `-XX%` discount badge.
- `sale/page.tsx` — the "Exclusive Sale Event" hero eyebrow text.
- `Header.tsx` — the "Sale" nav link, both desktop and mobile.

Deliberately left red untouched on: the Hourglass "Almost Gone — Final Stock" indicator and matching icon in `ProductCard`/`shop/[slug]/page.tsx` (low stock, not sale), `AddToCartButton`'s "Only X left in stock", `ProductSectionTabs`' "Trending"/"Last Chance" tab accents, `ProductViewers`' viewer-count pulse dot, and `sale/page.tsx`'s "Going Fast" tag — all of these are stock-urgency or social-proof signals that happened to share the sale's red, not the sale color itself.

## Outcome

- ✅ Impact: sale/discount UI now consistently uses a deep calm blue across the storefront, while unrelated urgency signals keep their original red, avoiding a confusing single-color overload across different meanings.
- 🧪 Tests: typecheck + build clean; live grep-based verification on /sale and a product detail page confirming both the new blue and the correctly-preserved red.
- 📁 Files: store/src/components/products/ProductCard.tsx, store/src/app/(store)/shop/[slug]/page.tsx, store/src/app/(store)/sale/page.tsx, store/src/components/layout/Header.tsx
- 🔁 Next prompts: none identified — user can ask to also recolor the low-stock/trending red if they want a single accent color storewide
- 🧠 Reflection: worth flagging to the user that "the sale color" wasn't actually its own concept in the codebase — it was one hex value silently shared by three different UI meanings. Splitting on semantics rather than literal color value avoided an over-broad find/replace.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): live grep verification of blue/red counts per page — PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
