---
id: 009
title: Order Number Generation ZD-XXXX
stage: general
date: 2026-06-16
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: aurex707@gmail.com
command: implement Task 9 - Order Number Generation
labels: ["orders","order-number","delivery-charge","api","resend"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/api/orders/route.ts
tests:
  - none
---

## Prompt

You are implementing Task 9: Order Number Generation for ZADIIS, a Pakistani women's fashion ecommerce store.

Replace `store/src/app/api/orders/route.ts` entirely with the new version that:
1. Generates a sequential `ZD-XXXX` order number on each order
2. Stores `delivery_charge` in the order record
3. Includes order number in the email subject

## Response snapshot

- Read existing `store/src/app/api/orders/route.ts` (88 lines, no order_number or delivery_charge logic)
- Wrote replacement file with `generateOrderNumber()` function that queries the latest order_number from Supabase and increments (starting at ZD-1001)
- New POST handler destructures `delivery_charge` from body and inserts it into the order record
- Email subject updated to use `order.order_number` instead of truncated UUID
- Email body shows order number, delivery charge line, and SKU in items list
- Committed: `feat: ZD-XXXX order number generation and delivery charge in orders` (commit 8f3f49a)

## Outcome

- Impact: Orders API now generates human-readable ZD-XXXX order numbers, stores delivery charge, and sends improved email notifications with the order number in the subject line
- Tests: none run (no test suite for this route)
- Files: store/src/app/api/orders/route.ts (52 insertions, 10 deletions)
- Next prompts: Task 10 and beyond; verify Supabase migration has order_number and delivery_charge columns
- Reflection: Straightforward replacement; race condition on order number generation is acceptable at this scale per task spec, with Supabase unique constraint as safety net

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): none
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): add a retry loop if unique constraint violation occurs on insert
