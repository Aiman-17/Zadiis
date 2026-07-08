# Implementation Plan: Post-Launch Roadmap — US1 (Notification Center) + US2 (YoY Analytics)

**Branch**: `004-post-launch-roadmap` | **Date**: 2026-07-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-post-launch-roadmap/spec.md`, scoped to User Story 1 and User Story 2 only (User Story 3 and User Story 4 remain deferred, spec-only, untouched by this plan).

## Summary

Two independent, additive admin-panel capabilities: (1) an in-admin notification center surfacing payment-received/cancellation/return/exchange events that today only reach the merchant via email, with archive/delete so it doesn't grow unbounded; (2) year-over-year comparison widgets in the Analytics Revenue and Performance tabs, each on its own fixed trailing-12-month window independent of the existing global range filter, collapsing to an "insufficient history" message until 12 months of order data exist. Both reuse existing patterns (the admin's 30s-polling convention, the existing badge-pill visual style, `recharts`, and the existing monthly-bucketing logic in `AnalyticsClient.tsx`) rather than introducing new infrastructure.

## Technical Context

**Language/Version**: TypeScript, Next.js 16.2.7 (App Router)
**Primary Dependencies**: `@supabase/supabase-js` (existing), `recharts` (existing, already used throughout `AnalyticsClient.tsx`), `lucide-react` (existing, for the bell/archive/delete icons)
**Storage**: Supabase (PostgreSQL) — one new table, `admin_notifications`; no changes to existing tables
**Testing**: Playwright (`store/tests/admin/**/*.spec.ts`), per constitution Principle VII (E2E Testing Mandate)
**Target Platform**: Web (Vercel), admin panel only — no customer-facing surface touched
**Project Type**: Web (single Next.js app under `store/`)
**Performance Goals**: No regression to constitution Principle V (page load < 3s on 4G) — this is admin-only, but the YoY superset fetch must not measurably slow the existing Analytics page load
**Constraints**: FR-006 (additive-only — zero behavior change to existing Revenue/Performance tab charts and the 7d/30d/90d/12m range filter); single-admin-user assumption (no multi-admin auth exists anywhere in this codebase, so no per-user read-state design is needed)
**Scale/Scope**: 2 user stories, 1 new table, 1 new admin page (`/admin/notifications`), 2 new API routes, ~4 existing files touched for notification write call sites, 1 existing file (`AnalyticsClient.tsx`) extended with 2 new widgets

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment |
|---|---|
| I. Customer Journey First | PASS — admin-only feature, does not touch the customer purchase flow. |
| II. Mobile-First Development | PASS (with explicit requirement carried into tasks.md) — the `/admin/notifications` page and the YoY widgets MUST be designed/tested at 375px first, per constitution. Existing admin layout already handles mobile (sidebar collapses below `md`), new UI follows the same convention. |
| III. Lean MVP — Scalable by Design | PASS — no new categories/structural rewrite; notification center and YoY widgets are additive to existing admin infrastructure, not a new subsystem. |
| IV. Secure & Local Payments | PASS — no payment integration changes. |
| V. Performance for Conversions | PASS — admin-only; the YoY superset fetch is server-side and bounded (orders table is small, ~1 month of history today). |
| VI. Brand Consistency | PASS — "NEW" badge reuses the existing merchandising pill-badge style (`AdminProductsClient.tsx:88`); archive/delete icons reuse the existing Trash2/Archive/RotateCcw + `confirm()` convention already used in Products/Orders/Payments; YoY charts reuse `recharts` and the existing gold/gray emphasis palette already in `AnalyticsClient.tsx`. |
| VII. E2E Testing Mandate | GATE, not violation — this plan does not itself write tests, but `tasks.md` MUST include Playwright coverage under `store/tests/admin/**` for both the notification center and the YoY widgets before this feature is considered shippable. Flagged as a required task category, not deferred. |

**No violations requiring Complexity Tracking justification.** Both stories reuse existing architecture (Supabase tables + Next.js API routes + React client components); no new frameworks, no new project structure, no multi-project split.

## Project Structure

### Documentation (this feature)

```text
specs/004-post-launch-roadmap/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/             # Phase 1 output
│   └── admin-notifications-api.md
└── tasks.md              # Phase 2 output (/sp.tasks — not created by this command)
```

### Source Code (repository root)

This is an existing single Next.js web application (no new project structure). All changes land under the existing `store/` app:

```text
store/
├── supabase/
│   └── admin-notifications.sql          # NEW — admin_notifications table + RLS policy
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   └── notifications/
│   │   │   │       └── route.ts          # NEW — GET (list + unread count), PATCH (mark read), DELETE (hard delete), PUT (archive)
│   │   │   ├── payments/verify/route.ts   # MODIFIED — insert admin_notifications row after sendOwnerPaymentReceived (line 80)
│   │   │   ├── webhooks/safepay/route.ts  # MODIFIED — same, line 108
│   │   │   └── requests/
│   │   │       ├── cancel/route.ts        # MODIFIED — add `id` to order select (line 27); insert notification after sendOwnerCancellationRequest (line 80)
│   │   │       └── return/route.ts        # MODIFIED — insert notification after sendOwnerReturnRequest/sendOwnerExchangeRequest (lines 127-137)
│   │   └── admin/
│   │       ├── layout.tsx                 # MODIFIED — bell icon, unread-count poll (extends existing check() at lines 26-58)
│   │       ├── notifications/
│   │       │   └── page.tsx               # NEW — notification list page (server component)
│   │       └── analytics/
│   │           └── page.tsx               # MODIFIED — add trailing-24-month superset fetch alongside existing range-filtered fetch (lines 28-43)
│   └── components/
│       └── admin/
│           ├── AnalyticsClient.tsx        # MODIFIED — add YoyWidget to 'revenue' and 'performance' tab branches
│           ├── YoyWidget.tsx               # NEW — shared component, takes a metric key (revenue|units) + the superset orders
│           └── NotificationsClient.tsx     # NEW — list rendering, mark-read, archive, delete actions

store/tests/admin/
└── notifications.spec.ts                 # NEW — Playwright coverage (constitution Principle VII gate)
   (existing analytics.spec.ts, if present, extended for YoY widgets — confirmed during /sp.tasks)
```

**Structure Decision**: Single existing Next.js application, App Router. No new top-level directories. This plan only adds files under `store/src/app/api/admin/notifications/`, `store/src/app/admin/notifications/`, and extends `AnalyticsClient.tsx` — consistent with how every prior admin feature in this repo (Products, Orders, Payments, Settings) is structured.

## Complexity Tracking

*No entries — Constitution Check passed with no violations.*
