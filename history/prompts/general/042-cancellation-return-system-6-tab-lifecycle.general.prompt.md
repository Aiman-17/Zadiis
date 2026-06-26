---
id: 042
title: Cancellation Return System 6-Tab Lifecycle
stage: green
date: 2026-06-25
surface: agent
model: claude-sonnet-4-6
feature: cancellation-return-system
branch: main
user: Aiman-17
command: implementation
labels: ["cancellation","returns","admin-orders","email","lifecycle","analytics"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/supabase/requests-tables.sql
  - store/src/app/api/admin/requests/route.ts
  - store/src/app/api/requests/cancel/route.ts
  - store/src/app/api/requests/return/route.ts
  - store/src/app/api/cron/cleanup/route.ts
  - store/src/app/(store)/cancel-order/page.tsx
  - store/src/components/store/ReturnRequestForm.tsx
  - store/src/app/(store)/returns/page.tsx
  - store/src/app/admin/orders/page.tsx
  - store/src/app/api/admin/orders/route.ts
  - store/src/lib/email.ts
  - store/src/components/admin/AnalyticsClient.tsx
  - store/vercel.json
tests:
  - null
---

## Prompt

User requested: cancellation and return request forms for customers that store in Supabase and appear as request cards in admin orders page (separate Returns and Cancellations tabs). 6-tab lifecycle for orders (Active=new, Pending Shipment=processing+shipped, Completed=delivered, Returns, Cancellations, Archived). 90-day data retention via daily cron. Analytics returns tab. Auto-cancel email to customer. No search needed — admin handles everything from within the respective tabs via action buttons on request cards.

## Response snapshot

13 files changed:

**New DB tables**: `cancellation_requests` + `return_requests` with RLS, 90-day cleanup index.

**Customer forms**: `/cancel-order` (new page) — order number + email + reason → stores in DB + emails owner + 24h confirmation to customer. `/returns` page — added ReturnRequestForm component below existing policy. Return form validates 7-day window server-side; professional rejection message if expired.

**API routes**: `POST /api/requests/cancel` (no order validation), `POST /api/requests/return` (validates order exists + 7-day window), `GET/PATCH /api/admin/requests` (admin fetch + resolve).

**Admin orders page**: Rewritten with 6 lifecycle tabs. Request cards at top of Returns/Cancellations tabs with "Process Return"/"Cancel Order" buttons that find the order in already-loaded state by order_number and open the existing modal. "Dismiss" button marks request resolved without processing.

**Email**: 5 new functions — sendCustomerOrderCancelled, sendOwnerCancellationRequest, sendCustomerCancellationConfirmation, sendOwnerReturnRequest, sendCustomerReturnConfirmation. Auto-cancel email wired into admin orders PUT when status changes to 'cancelled'.

**Cron**: `/api/cron/cleanup` deletes records older than 90 days, runs daily at 4am via vercel.json.

**Analytics**: Returns tab added (mirrors Cancellations tab) — return rate %, orders returned, revenue lost, return reasons bar chart.

## Outcome

- ✅ 13 files created/modified, committed and pushed to main
- ⚠️ MANUAL STEP: Run `store/supabase/requests-tables.sql` in Supabase SQL editor
- 📁 Commit: a5c2170

## Evaluation notes

- Lifecycle tabs naturally filter by status — no explicit filter UI needed
- 90-day retention keeps DB clean; records are tiny so no storage concern
- Request card "Cancel Order" button finds order client-side (all orders already loaded) — no extra API call
