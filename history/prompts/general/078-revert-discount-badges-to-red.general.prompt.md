---
id: 078
title: Revert discount badges to red, keep sale nav/hero blue
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
tests:
 - typecheck: npx tsc --noEmit (clean)
 - build: npm run build (clean)
 - manual: grepped store/src for #1E3A8A after the revert — confirmed only Header.tsx's "Sale" nav link (desktop + mobile) and sale/page.tsx's hero eyebrow text remain blue; every discount-badge occurrence (ProductCard, shop/[slug] sale banner/tag/text/badge) is back to #C62828
---

## Prompt

> the image card sale discount make it previuos deep red and tell me whats color is best for prodcutdetail page I think blue also not looks good

> you can serach on web

> yes

## Response snapshot

Reverted the product card's `-XX%` discount badge to `#C62828` (its original deep red) per the explicit instruction. For the product detail page, researched the question rather than guessing: web search on ecommerce badge design confirmed red/yellow are the highest-converting, most recognized colors for discount badges specifically due to high contrast and urgency signaling, and — critically — that consistent badge color between product tiles and product detail pages matters for recognition and faster purchase decisions. Recommended reverting the detail page's discount badge to match the card (red) rather than picking a new color, and the user confirmed.

Reverted on `shop/[slug]/page.tsx`: the ambient "Sale On Now" banner (dot + "View Sale →"), the "Sale" tag + "Limited time price" text, and the main product's own `-XX%` badge — all back to `#C62828`. Deliberately left blue on the Header's "Sale" nav link and the `/sale` page hero eyebrow text, since those are branding/navigation elements rather than discount badges, where a distinct accent color is more conventional and wasn't part of the "looks bad" complaint.

## Outcome

- ✅ Impact: all discount badges (card grids, sliders, and product detail page) are visually consistent again using the proven red, while the sale nav link and page hero retain the newer blue as a distinct branding accent.
- 🧪 Tests: typecheck + build clean; grep-based verification confirming exactly which elements are blue vs red post-revert.
- 📁 Files: store/src/components/products/ProductCard.tsx, store/src/app/(store)/shop/[slug]/page.tsx
- 🔁 Next prompts: none identified — user may still want the header "Sale" link / sale-page hero reverted to red too, or may keep them as the sole blue accent
- 🧠 Reflection: worth remembering that "discount badge" and "sale branding/nav" are two different UI roles that happened to share one color before [[sale-color-blue-rebrand]] — the badge role reverted here because consistency + red convention won out; the branding role is still an open question.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): grep verification of blue/red distribution post-revert — PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
