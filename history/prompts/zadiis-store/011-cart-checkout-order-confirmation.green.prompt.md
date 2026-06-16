---
id: "011"
title: Cart, Checkout, and Order Confirmation Pages
stage: green
date: 2026-06-07
surface: agent
model: claude-sonnet-4-6
feature: zadiis-store
branch: main
user: QC
command: implement tasks 14-16
labels: ["cart","checkout","orders-api","order-confirmation","resend","supabase","next.js"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/(store)/cart/page.tsx
  - store/src/app/(store)/checkout/page.tsx
  - store/src/app/(store)/order/[id]/page.tsx
  - store/src/app/api/orders/route.ts
tests:
  - npm run build (passing, all 8 routes generated cleanly)
---

## Prompt

You are implementing Tasks 14, 15, and 16 of the ZADIIS women's fashion ecommerce store.

Task 14: Cart Page — Create store/src/app/(store)/cart/page.tsx with quantity controls, remove items, and proceed to checkout.
Task 15: Orders API + Checkout Page — Create store/src/app/api/orders/route.ts (Supabase insert + Resend email) and store/src/app/(store)/checkout/page.tsx with form, city select, payment method selection (JazzCash, Easypaisa, Card — COD hidden).
Task 16: Order Confirmation Page — Create store/src/app/(store)/order/[id]/page.tsx as a server component fetching order from Supabase and displaying confirmation with order summary.

## Response snapshot

Created 4 files:

1. `store/src/app/(store)/cart/page.tsx` — Client component. Reads cart from localStorage via `getCart()`, supports quantity update via `saveCart()`, remove via `removeFromCart()`, dispatches `cart-updated` event after mutations. Shows empty state with Continue Shopping link. Displays total in PKR.

2. `store/src/app/api/orders/route.ts` — POST handler. Inserts order into Supabase `orders` table via `supabaseAdmin`, then sends owner notification email via Resend (from `orders@zadiis.com` to `OWNER_EMAIL` env var). Email failures are caught and logged without blocking order creation. Returns `{ orderId }` on success.

3. `store/src/app/(store)/checkout/page.tsx` — Client component. Redirects to `/cart` if cart is empty. Collects name, phone, optional email, address, city (dropdown of 9 Pakistani cities), and payment method (JazzCash, Easypaisa, Card). Submits to `/api/orders`, clears cart on success, redirects to `/order/[id]`.

4. `store/src/app/(store)/order/[id]/page.tsx` — Async server component. Awaits `params` per Next.js 15+ convention. Fetches order by ID from Supabase. Displays CheckCircle icon, order ID (first 8 chars uppercased), customer name, itemised order summary with PKR prices, and contact confirmation message.

Build: `npm run build` passed with 0 errors. All 8 routes generated (/, /_not-found, /api/orders, /cart, /checkout, /order/[id], /shop, /shop/[slug]).

Commits:
- eac6555 feat: add cart page with quantity controls
- aa1698e feat: add checkout page and order API with email notification
- 2287b1f feat: add order confirmation page
