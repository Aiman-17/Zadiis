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

## Phase 3: User Story 4 — Professional PDF Invoices (Priority: P3, session 2)

**Goal**: Payment-confirmation emails for online (non-COD) orders attach a real PDF invoice, rendered via `@react-pdf/renderer`, matching the store's brand fonts/colors — replacing the current `.html`-file attachment. Admin's browser-based print view is untouched.

**Independent Test**: Confirm an online payment, open the resulting email, confirm the attachment is a `.pdf` opening correctly in a standard viewer with brand-consistent styling and identical content to the old HTML version. Full steps in `quickstart.md`'s "US4" section.

### Implementation for User Story 4

- [X] T024 [US4] Add `@react-pdf/renderer` to `store/package.json` dependencies.
- [X] T025 [P] [US4] **(corrected mid-implementation)** Bundle TTF font files into `store/src/lib/fonts/`. The `google/fonts` source repo turned out to only publish variable-axis `.ttf` files for Inter/Playfair Display (unsuitable for distinct static weights), and `@fontsource/*` npm packages only ship woff/woff2 — neither worked. Resolved by fetching genuine static TTFs directly from Google's font-serving CDN using a legacy-browser User-Agent (a well-established technique; modern UAs get woff2, pre-WOFF-era UAs get true `format('truetype')` URLs) — confirmed via `file` as real TrueType Font data. Do NOT register via Google Fonts CDN URLs at runtime — verified this session as a real reliability risk for this library (WOFF2 format incompatibility + a font-load/render race condition with no built-in await mechanism); files are bundled locally instead.
- [X] T026 [US4] Create `store/src/lib/invoice-pdf.tsx` — a `@react-pdf/renderer` `Document`/`Page` component tree taking the same input shape as `buildInvoiceDocument` (`email.ts:189-201`: invoice_number, order_number, customer_name, address, city, items, subtotal, delivery_charge, total, payment_method, transaction_id), registering the local TTF fonts from T025 via `Font.register()` with local file paths, and reproducing the same content sections (header, bill-to, item table, subtotal/delivery/total, payment details) using the existing brand colors (`#A68B6E` gold, `#1C1C1C` near-black, `#FAF8F5` cream, `#E8DDD4` border). Export a `renderInvoicePdf(data): Promise<Buffer>` helper wrapping `renderToBuffer()`. (Depends on T024, T025.)
- [X] T027 [US4] In `store/src/lib/email.ts`'s attachment block (lines 319-333), replace the `buildInvoiceDocument(...)` + `contentType: 'text/html'` + `filename: '${invoice_number}.html'` with `await renderInvoicePdf(...)` + `contentType: 'application/pdf'` + `filename: '${invoice_number}.pdf'`, keeping the same `Buffer → base64` encoding step. Remove the now-unused `buildInvoiceDocument` function entirely (dead code once replaced) — do not leave it as unreferenced code. (Depends on T026.)
- [X] T028 [US4] **(corrected mid-implementation)** Add a lightweight automated check that calls `renderInvoicePdf()` directly and asserts the returned `Buffer` is non-empty and starts with the PDF magic bytes (`%PDF`). Originally planned as a Playwright spec (`store/tests/admin/invoice-pdf.spec.ts`) but that failed with `Cannot read properties of null (reading 'props')` — root-caused to Playwright Test's own esbuild bundler mishandling `@react-pdf/renderer`'s custom React reconciler when the `.tsx` file is pulled into its transform pipeline (confirmed via a direct `tsx` run producing a correct 17KB PDF with the identical function call — a test-infrastructure incompatibility, not a production bug). Implemented instead as `store/scripts/verify-invoice-pdf.mjs`, run via `npm run verify:invoice-pdf` (uses the `tsx` devDependency, added this task).
- [ ] T029 [US4] Manual verification per `quickstart.md`'s US4 section: place a real online-payment order, confirm the emailed PDF opens correctly and matches brand styling; confirm COD orders still produce no email invoice; confirm `/admin/invoices/[id]/print` is unaffected.

**Checkpoint**: User Story 4 independently functional — touches only `email.ts` and two new files, no overlap with US1/US2/US3.

---

## Phase 4: Polish & Cross-Cutting Concerns

- [ ] T030 [P] Run every step in `quickstart.md` end-to-end for US1, US2, and US4.
- [X] T031 [P] **(bug-pattern sweep)** Grep every file touched by T001-T029 for un-awaited `supabaseAdmin` calls and any new page/route missing `export const dynamic = 'force-dynamic'` — this project has two documented recurring bug classes from prior sessions (unawaited Supabase writes, missing force-dynamic causing stale cached admin data). Fix anything found before considering this feature done.
- [X] T032 Update `specs/004-post-launch-roadmap/checklists/requirements.md` if implementation surfaced anything requiring a spec clarification not already captured.
- [X] T033 [P] `npm run build && npm run lint` in `store/` — must pass with zero new errors/warnings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **US1 (Phase 1)**, **US2 (Phase 2)**, and **US4 (Phase 3)** have no dependency on each other — fully parallel-safe, touch disjoint files (US4 only touches `email.ts` + 2 new files under `lib/`).
- **Polish (Phase 4)** depends on US1, US2, and US4 all being complete.

### Within User Story 1

T002 (table) blocks T003 (API route) and all six notification-insert tasks (T005-T009). T004 (bug fix) blocks T005 (same file, sequential). T006, T007, T008, T009 are independent of each other and of the T004→T005 chain (different files) — all parallel-safe once T002/T003 exist. T010, T011 depend on T003 (need the API route to poll/fetch). T012 depends on T003 and T011. T013 (mobile check) depends on T010, T011, T012 all being done.

### Within User Story 2

T016 (YoyWidget component) is independent of T015 (data-fetch change) — parallel-safe. T017 and T018 (tab integration) each depend on both T015 and T016. T019 (regression check) depends on T017 and T018.

### Within User Story 4

T025 (fonts) is parallel-safe with T024 (dependency install) — different concerns. T026 (PDF component) depends on both T024 and T025. T027 (email.ts swap) depends on T026. T028 (automated check) depends on T026 (can run before or after T027, but is most meaningful after). T029 (manual verification) depends on T027 being complete.

### Parallel Opportunities

- T001 (US1 test) can be written any time before T002-T013 are implemented.
- T004, T006, T007, T008 are parallel-safe with each other (four different files).
- T014 (US2 test) can be written any time before T015-T019 are implemented.
- T016 is parallel-safe with T015.
- T024 and T025 (US4) are parallel-safe with each other.
- T030, T031, T033 in Polish are parallel-safe with each other; T032 depends on findings from the others.

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

## Parallel Example: User Story 4

```bash
# T024 and T025 can run together — dependency install vs. font bundling, no shared dependency:
Task: "Add @react-pdf/renderer to package.json"
Task: "Bundle Playfair Display / Inter TTF files into store/src/lib/fonts/"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (US1): T001-T013.
2. **STOP and VALIDATE**: run `quickstart.md`'s US1 section independently.
3. Deploy/demo if ready — US2/US4 are not required for US1 to ship value.

### Incremental Delivery

1. US1 (T001-T013) → validate independently → deploy/demo (MVP).
2. US2 (T014-T019) → validate independently → deploy/demo.
3. US4 (T024-T029) → validate independently → deploy/demo.
4. Polish (T030-T033) → final gate before PR.

---

## Summary

- **Total tasks**: 33 (T001-T033)
- **User Story 1**: 13 tasks (T001-T013) — 1 test, 12 implementation (including 2 bug-fix tasks: T004, T009)
- **User Story 2**: 6 tasks (T014-T019) — 1 test, 5 implementation
- **User Story 4**: 6 tasks (T024-T029) — 5 implementation, 1 manual verification (email attachments aren't Playwright-inspectable)
- **Polish**: 4 tasks (T030-T033) — includes a project-specific bug-pattern sweep (T031)
- **Parallel opportunities**: T004/T006/T007/T008 (US1 write sites), T015/T016 (US2), T024/T025 (US4), T030/T031/T033 (Polish)
- **Suggested MVP scope**: User Story 1 only (T001-T013) — delivers the higher-priority, more novel capability (notification center) independently of US2/US4.
- **Bugs resolved as part of this task list** (per an earlier run's explicit request): T004 (missing `id` in `cancel/route.ts` order select), T009 (two missed `admin_notifications` write call sites in `admin/orders/route.ts`), T031 (proactive sweep for this project's two documented recurring bug classes in all new code).
- **Design risk caught during planning for US4**: registering brand fonts via Google Fonts CDN URLs was the initial idea, corrected to bundling local TTF files (T025) after verifying `@react-pdf/renderer`'s actual font-handling limitations — see `research.md` Decision 8.
