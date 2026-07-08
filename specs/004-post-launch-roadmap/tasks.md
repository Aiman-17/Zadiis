---
description: "Task list for US1 (Admin Notification Center) + US2 (YoY Revenue & Sales Trend)"
---

# Tasks: Post-Launch Roadmap — US1 + US2

**Input**: Design documents from `specs/004-post-launch-roadmap/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)
**Tests**: Included and REQUIRED — constitution Principle VII (E2E Testing Mandate) makes Playwright coverage a hard gate for every critical admin journey, not optional for this project.
**Context note**: this run was explicitly asked to "also resolve bugs" — three concrete bugs found during `/sp.plan`'s verification pass (not hypothetical) are folded in as required tasks below, marked **(bug fix)**: the missing `id` in `cancel/route.ts`'s order select, and the two previously-missed `admin/orders/route.ts` notification write call sites.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 or US2

## Setup / Foundational

No setup or foundational tasks are required. This feature adds zero new npm dependencies (reuses `@supabase/supabase-js`, `recharts`, `lucide-react`, all already in `store/package.json`) and no infrastructure shared between US1 and US2 — the two stories touch entirely disjoint files (notifications vs. analytics). Each story is fully self-contained starting from its own first task below.

---

## Phase 1: User Story 1 — Admin Notification Center (Priority: P1) 🎯 MVP

**Goal**: Merchant sees payment-received/cancellation/return/exchange events inside the admin panel, with a "NEW" badge, mark-as-read, archive, and delete — without checking email. New orders are explicitly excluded (already covered elsewhere).

**Independent Test**: Trigger each of the four in-scope event types against a real/local order; confirm each produces a notification and the bell badge updates; confirm placing a new order does NOT; confirm archive (recoverable) and delete (permanent, confirmed) both work. Full steps in `quickstart.md`.

### Tests for User Story 1 (write first, confirm they fail before implementation)

- [X] T001 [P] [US1] Playwright E2E test in `store/tests/admin/notifications.spec.ts` covering: bell badge shows correct unread count; all 4 in-scope event types produce a notification with correct order link; a new order does NOT produce one; "mark all read" clears the badge and visually distinguishes read from unread; Archive hides a notification from the main list and it's recoverable; Delete shows a `confirm()` dialog and permanently removes the row only after confirming.

### Implementation for User Story 1

- [X] T002 [US1] Create `store/supabase/admin-notifications.sql` — `admin_notifications` table (`id, type, order_id, message, created_at, read_at, archived_at`) per `data-model.md`, service-role-only RLS policy, no anon policy.
- [X] T003 [US1] Create `store/src/app/api/admin/notifications/route.ts` — `GET` (list + unreadCount, joined with `order_number`), `PATCH` (mark one or all read), `PUT` (archive/restore), `DELETE` (permanent) per `contracts/admin-notifications-api.md`. Every Supabase write (`insert`/`update`/`delete`) MUST be `await`ed — this codebase has a documented history of unawaited-write bugs causing silent failures; do not repeat it here. (Depends on T002.)
- [X] T004 [P] [US1] **(bug fix)** Add `id` to the order select in `store/src/app/api/requests/cancel/route.ts:27` (currently `select('order_status, created_at, customer_email, customer_name')`, missing `id`) — required before this call site can populate `admin_notifications.order_id`. Verified missing this session, not hypothetical.
- [X] T005 [US1] Insert an `admin_notifications` row (`type='cancellation_request'`) after `sendOwnerCancellationRequest` in `store/src/app/api/requests/cancel/route.ts:80`, using the `id` added in T004. (Depends on T002, T003, T004.)
- [X] T006 [P] [US1] Insert an `admin_notifications` row (`type='payment_received'`) after `sendOwnerPaymentReceived` in `store/src/app/api/payments/verify/route.ts:80`. (Depends on T002, T003.)
- [X] T007 [P] [US1] Insert an `admin_notifications` row (`type='payment_received'`) after `sendOwnerPaymentReceived` in `store/src/app/api/webhooks/safepay/route.ts:108`. (Depends on T002, T003.)
- [X] T008 [P] [US1] Insert `admin_notifications` rows (`type='exchange_request'` at line 129, `type='return_request'` at line 134) after `sendOwnerExchangeRequest`/`sendOwnerReturnRequest` in `store/src/app/api/requests/return/route.ts`. (Depends on T002, T003.)
- [X] T009 [US1] **(bug fix)** Insert `admin_notifications` rows (`type='payment_received'`) at the two previously-missed call sites in `store/src/app/api/admin/orders/route.ts:155` (admin manually marks a COD order "delivered") and `:174` (admin manually sets `payment_status='paid'`). Found during `/sp.plan` verification — without this, admin-triggered payment events would silently never appear in the notification center while the owner email still fires. (Depends on T002, T003.)
- [X] T010 [US1] Add a bell icon + unread-count polling to `store/src/app/admin/layout.tsx` — extend the existing `check()` function (lines 26-58) with a new `notifCount` state sourced from `GET /api/admin/notifications`'s `unreadCount`. Do NOT reuse the diff-based `newOrders` counting pattern (lines 36-41) — this must be a true current-state unread count, not a since-last-poll delta (see `research.md` Decision 3). (Depends on T003.)
- [X] T011 [US1] Create `store/src/app/admin/notifications/page.tsx` — server component, fetches the initial list via `supabaseAdmin`. MUST include `export const dynamic = 'force-dynamic'` — this codebase has a documented history of admin pages serving stale cached data from missing this export; do not repeat it here. (Depends on T002.)
- [X] T012 [US1] Create `store/src/components/admin/NotificationsClient.tsx` — renders the list, "NEW" pill badge on unread rows (reusing `AdminProductsClient.tsx:88`'s exact pill style), mark-read on view, Archive/Restore buttons, Delete button gated behind a `confirm()` dialog matching the existing Invoices/Payments delete-confirmation wording convention. (Depends on T003, T011.)
- [X] T013 [US1] Mobile verification at a 375px viewport for the bell icon and `/admin/notifications` page, per constitution Principle II (Mobile-First Development). (Depends on T010, T011, T012.)

**Checkpoint**: User Story 1 is fully functional and independently testable — a merchant can see, read, archive, and delete notifications for all four in-scope events without touching User Story 2's code.

---

## Phase 2: User Story 2 — YoY Revenue & Sales Trend (Priority: P2)

**Goal**: The Revenue tab shows a year-over-year revenue widget; the Performance tab shows a year-over-year sales/units widget. Both are additive — the existing 7d/30d/90d/12m range filter and every current chart must remain byte-identical. Both collapse to an "insufficient history" message until 12 months of order data exist.

**Independent Test**: With the store's current ~1-month order history, open both tabs across all 4 range options — confirm the collapsed state renders and existing chart output is unchanged. Full steps in `quickstart.md`.

### Tests for User Story 2 (write first, confirm they fail before implementation)

- [X] T014 [P] [US2] Playwright E2E test in `store/tests/admin/analytics.spec.ts` (extend the file if it already exists, else create it) covering: the YoY widget renders the collapsed "insufficient history" state on both the Revenue and Performance tabs; switching the range filter through 7d/30d/90d/12m does not change the widget's collapsed state or any existing chart's output (regression assertion).

### Implementation for User Story 2

- [X] T015 [US2] Add a trailing-24-month superset fetch to `store/src/app/admin/analytics/page.tsx`, passed to `AnalyticsClient` as a new `ordersForYoY` prop. The existing range-filtered `orders` fetch (lines 28-43, `.gte('created_at', from)`) MUST remain completely unchanged — this is a second, independent fetch, not a modification of the first (see `research.md` Decision 4, FR-006).
- [X] T016 [P] [US2] Create `store/src/components/admin/YoyWidget.tsx` — a sibling bucketing function taking an explicit `monthsBack` count (reusing `buildAllBuckets`'s `12m`-branch shape from `AnalyticsClient.tsx:61-73` as the pattern, not a shared call), an eligibility check derived from the earliest order in `ordersForYoY` (not a hardcoded date), an emphasis-style chart (current year in brand gold `#A68B6E` solid — matching the existing single-series Revenue line color at `AnalyticsClient.tsx:666` — prior year in muted gray dashed), a supporting month-by-month table, and a `+X%`/`-X%` headline stat using the existing green/red growth-indicator colors (lines 154-157). Takes a `metric: 'revenue' | 'units'` prop to serve both tabs from one component.
- [X] T017 [US2] Integrate `<YoyWidget metric="revenue" />` into `AnalyticsClient.tsx`'s `'revenue'` tab render branch, appended after existing content. (Depends on T015, T016.)
- [X] T018 [US2] Integrate `<YoyWidget metric="units" />` into `AnalyticsClient.tsx`'s `'performance'` tab render branch, appended after existing content. (Depends on T015, T016.)
- [X] T019 [US2] Regression check per `quickstart.md`: diff `/admin/analytics` output across all 5 tabs × all 4 range options against pre-change `main` — must be pixel-identical outside the two new widgets. (Depends on T017, T018.)

**Checkpoint**: User Stories 1 and 2 both independently functional — neither touches the other's files.

---

## Phase 3: Polish & Cross-Cutting Concerns

- [ ] T020 [P] Run every step in `quickstart.md` end-to-end for both US1 and US2.
- [X] T021 [P] **(bug-pattern sweep)** Grep every file touched by T001-T019 for un-awaited `supabaseAdmin` calls and any new page/route missing `export const dynamic = 'force-dynamic'` — this project has two documented recurring bug classes from prior sessions (unawaited Supabase writes, missing force-dynamic causing stale cached admin data). Fix anything found before considering this feature done.
- [X] T022 Update `specs/004-post-launch-roadmap/checklists/requirements.md` if implementation surfaced anything requiring a spec clarification not already captured.
- [X] T023 [P] `npm run build && npm run lint` in `store/` — must pass with zero new errors/warnings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)** and **US2 (Phase 2)** have no dependency on each other — fully parallel-safe, touch disjoint files.
- **Polish (Phase 3)** depends on both US1 and US2 being complete.

### Within User Story 1

T002 (table) blocks T003 (API route) and all six notification-insert tasks (T005-T009). T004 (bug fix) blocks T005 (same file, sequential). T006, T007, T008, T009 are independent of each other and of the T004→T005 chain (different files) — all parallel-safe once T002/T003 exist. T010, T011 depend on T003 (need the API route to poll/fetch). T012 depends on T003 and T011. T013 (mobile check) depends on T010, T011, T012 all being done.

### Within User Story 2

T016 (YoyWidget component) is independent of T015 (data-fetch change) — parallel-safe. T017 and T018 (tab integration) each depend on both T015 and T016. T019 (regression check) depends on T017 and T018.

### Parallel Opportunities

- T001 (US1 test) can be written any time before T002-T013 are implemented.
- T004, T006, T007, T008 are parallel-safe with each other (four different files).
- T014 (US2 test) can be written any time before T015-T019 are implemented.
- T016 is parallel-safe with T015.
- T020, T021, T023 in Polish are parallel-safe with each other; T022 depends on findings from the others.

---

## Parallel Example: User Story 1

```bash
# After T002 (table) and T003 (API route) exist, launch the four independent write-call-site tasks together:
Task: "Insert admin_notifications row after sendOwnerPaymentReceived in payments/verify/route.ts:80"
Task: "Insert admin_notifications row after sendOwnerPaymentReceived in webhooks/safepay/route.ts:108"
Task: "Insert admin_notifications rows after return/exchange sends in requests/return/route.ts"
Task: "Insert admin_notifications rows at the two admin/orders/route.ts call sites (bug fix)"
```

## Parallel Example: User Story 2

```bash
# T015 and T016 can run together — different files, no shared dependency:
Task: "Add trailing-24-month superset fetch to admin/analytics/page.tsx"
Task: "Create YoyWidget.tsx component"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (US1): T001-T013.
2. **STOP and VALIDATE**: run `quickstart.md`'s US1 section independently.
3. Deploy/demo if ready — US2 is not required for US1 to ship value.

### Incremental Delivery

1. US1 (T001-T013) → validate independently → deploy/demo (MVP).
2. US2 (T014-T019) → validate independently → deploy/demo.
3. Polish (T020-T023) → final gate before PR.

---

## Summary

- **Total tasks**: 23 (T001-T023)
- **User Story 1**: 13 tasks (T001-T013) — 1 test, 12 implementation (including 2 bug-fix tasks: T004, T009)
- **User Story 2**: 6 tasks (T014-T019) — 1 test, 5 implementation
- **Polish**: 4 tasks (T020-T023) — includes a project-specific bug-pattern sweep (T021)
- **Parallel opportunities**: T004/T006/T007/T008 (US1 write sites), T015/T016 (US2), T020/T021/T023 (Polish)
- **Suggested MVP scope**: User Story 1 only (T001-T013) — delivers the higher-priority, more novel capability (notification center) independently of US2.
- **Bugs resolved as part of this task list** (per this run's explicit request): T004 (missing `id` in `cancel/route.ts` order select), T009 (two missed `admin_notifications` write call sites in `admin/orders/route.ts`), T021 (proactive sweep for this project's two documented recurring bug classes in all new code).
