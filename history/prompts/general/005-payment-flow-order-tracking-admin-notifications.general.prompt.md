---
id: 005
title: Payment Flow Order Tracking Admin Notifications
stage: general
date: 2026-06-07
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: QC
command: general question
labels: ["payment","order-tracking","admin","notifications","operations","whatsapp"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/(store)/checkout/page.tsx
  - store/src/app/api/orders/route.ts
  - store/src/app/(store)/order/[id]/page.tsx
  - store/src/types/index.ts
tests:
  - none
---

## Prompt

Tell me user payment method(before order confirmation email or after) also tell how do I know the payment I recieve is from this customer if multiple people paid also about a product tracking number which shows me which product and color customer give me an order. Do I recieve all information in email , this will prevent from wrong orders. Tell me about these proceudres also in admin panel I need notification something if other oerson using he also knows customer send an order.

## Response snapshot

Full operational analysis of the ZADIIS order and payment flow covering:

1. Payment timing: Currently payment method is selected BEFORE order is saved, but no actual payment collection exists — customer selects JazzCash/Easypaisa/Card but is not redirected to pay. Orders saved with payment_status: 'pending'. Manual verification needed.

2. Payment matching: Order ID (#A3F7B2C1) is the unique reference. Customers should be instructed to write it in the JazzCash/Easypaisa reference field and WhatsApp a screenshot. Admin matches amount + Order ID + phone number.

3. Product/color tracking: Already built — every order email and confirmation page shows: Product Name, Size, Color, Quantity, Price per item. No separate tracking number system yet (courier tracking number to be added in Task 21).

4. Email contents: Owner receives Order ID, customer name, phone, address, city, payment method, all items with size/color/quantity/price, and total. Missing: payment transaction ID, payment confirmation status.

5. Admin notifications: Not yet built. Recommended: Supabase Realtime subscription in admin dashboard so all open admin sessions receive instant notification when a new order is placed. Browser notification + sound for staff awareness.

Gaps identified: Order confirmation page does not show payment instructions (where to send money, Order ID as reference). This is the most urgent operational fix needed.

## Outcome

- Impact: Operational clarity on payment flow, order matching, and admin notification requirements for ZADIIS
- Tests: none — this was an analysis/explainer session
- Files: read-only analysis of checkout/page.tsx, api/orders/route.ts, order/[id]/page.tsx, types/index.ts
- Next prompts: Update order confirmation page to show payment instructions with Order ID as reference; implement Supabase Realtime notifications in admin dashboard (Task 19)
- Reflection: Current system has a critical gap — customers are not told where to send payment or what reference to use. This must be fixed before launch.

## Evaluation notes (flywheel)

- Failure modes observed: Payment flow is incomplete — no actual payment collection, no instructions to customer on how to pay
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add payment instructions block to order/[id]/page.tsx showing account number and Order ID as reference
