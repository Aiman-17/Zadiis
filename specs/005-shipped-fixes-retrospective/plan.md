# Implementation Plan: Shipped Fixes Retrospective (Order/Sale/Admin Reliability)

**Branch**: `005-shipped-fixes-retrospective` | **Date**: 2026-07-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/005-shipped-fixes-retrospective/spec.md`

**Note**: This plan is retroactive — it documents the approach actually taken
for already-shipped work (on `003-merchandising-badges-v2`), not a plan for
future work. It exists so `/sp.analyze` has a real triad to check the
codebase against, and so the two recurring bug patterns found along the way
are documented as reusable knowledge rather than one-off patches.

## Summary

Twelve independent reliability/correctness fixes across the order,
sale, and admin-notification surfaces of an existing Next.js/Supabase
e-commerce store, delivered incrementally in one session. No new
dependencies, no new services — every fix reused existing infrastructure
(the shared `generateInvoice`/email helpers, the existing admin
order-status cascade, the existing merchandising/analytics query layer) and
corrected either a data-scoping bug (cross-sale contamination, unbounded
time windows) or a reliability bug (unawaited database writes, statically
cached pages that should be dynamic).

## Technical Context

**Language/Version**: TypeScript, Next.js 16.2.7 (App Router) — same stack as the rest of `store/`, no new dependency introduced by any of these fixes.
**Primary Dependencies**: Existing Supabase client (`@supabase/supabase-js`), Resend (email), Recharts (analytics charts) — all pre-existing.
**Storage**: Supabase (PostgreSQL) — one new column (`orders.delivered_at`, migration `supabase/migrations/2026-07-04-add-delivered-at.sql`); no other schema changes.
**Testing**: Playwright E2E suite (`store/tests/`) for regression coverage; live manual verification against isolated test data (inserted and cleaned up via direct Supabase REST calls) for the specific bugs being fixed, since several of these are timing/caching/network-level bugs that unit tests alone would not have caught.
**Target Platform**: Existing Vercel/Next.js production deployment target — no change.
**Project Type**: Web (single Next.js app, `store/` — no separate backend/frontend split).
**Performance Goals**: N/A — these are correctness fixes, not performance work.
**Constraints**: Every fix had to be a minimal, targeted change to already-shipped, already-live code — no broad refactors, no unrelated cleanup, consistent with the project's "smallest viable diff" default policy.
**Scale/Scope**: 12 fixes across ~25 files total; two of the fixes are the *same underlying bug pattern* recognized and corrected in multiple locations once found (see Intelligence artifact).

## Constitution Check

*Reference: `.specify/memory/constitution.md`, "Customer Journey First" and
Quality Guardian review principles.*

- **Customer Journey First**: All customer-facing fixes (sale discount badges, sale filter, cancel/return policy, product detail stock line) directly support or correct the browse → product detail → checkout → post-purchase journey; none introduce friction.
- **Engineering Review / Reliability**: Every fix was verified live against real or isolated-test data before being considered complete — not just typecheck/build — per the Quality Guardian principle of evidence over assertion. Two fixes (unawaited writes, missing `force-dynamic`) were found specifically *because* live verification was used instead of static-analysis-only confidence.
- No constitution violations requiring justification — no new project/service was introduced, no principle was bypassed.

## Project Structure

### Documentation (this feature)

```text
specs/005-shipped-fixes-retrospective/
├── spec.md                    # Requirements this retrospective covers
├── plan.md                    # This file
├── tasks.md                   # Retroactive task list, each mapped to its PHR
└── intelligence-object.md     # The two recurring bug patterns, extracted as reusable checks
```

### Source Code (repository root, `store/`)

```text
store/src/
├── lib/
│   ├── email.ts                          # Invoice attachment, admin email SKU/customer fields, try/catch hardening
│   └── invoice.ts                        # (unchanged — reused as-is by both COD and online-payment paths)
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   ├── orders/
│   │   │   │   ├── route.ts              # Awaited delivered_at/cancelled_at/returned_at stamps, email field passthrough
│   │   │   │   └── return/route.ts       # Awaited returned_at/cancelled_at stamp
│   │   │   └── sales/
│   │   │       ├── route.ts              # Lazy deactivation now awaited + present at all
│   │   │       └── [id]/analytics/route.ts  # is_active re-derived from ends_at, date-window-scoped order attribution
│   │   ├── requests/
│   │   │   ├── cancel/route.ts           # 24h + identity policy (new)
│   │   │   └── return/route.ts           # 3-day-from-delivery + identity policy, legacy fallback
│   │   ├── sale/route.ts                 # ends_at filter added, maybeSingle
│   │   ├── webhooks/safepay/route.ts     # Owner email now gets items/customer_email
│   │   └── payments/verify/route.ts      # Owner email now gets items/customer_email/transaction_id
│   ├── admin/
│   │   ├── page.tsx                      # Awaited lazy deactivation, logged catch
│   │   ├── sales/page.tsx                # force-dynamic added; getSaleRevenue rewritten to date-window scoping; Analytics link no longer gated on orders>0
│   │   └── products/[id]/edit/page.tsx   # force-dynamic added
│   ├── (store)/
│   │   ├── sale/page.tsx                 # logged catch
│   │   ├── shop/page.tsx                 # sale filter fixed via tab system, logged catch
│   │   ├── shop/[slug]/page.tsx          # discount badge fix for related products, duplicate stock line fix, centered heading, logged catch
│   │   └── cancel-order/page.tsx, returns/page.tsx  # policy copy + required name field
│   └── (admin dashboard components)
│       └── components/admin/DashboardCharts.tsx     # COD KPI visibility gate, 30-day donut window
├── components/
│   ├── products/AddToCartButton.tsx      # Per-variant stock line gating fix
│   ├── products/ProductSlider.tsx        # salePriceMap passthrough
│   └── layout/Header.tsx                 # Home nav link
└── types/index.ts                        # delivered_at field added to Order type

supabase/migrations/2026-07-04-add-delivered-at.sql   # New column, source of truth for the return-window policy
```

**Structure Decision**: No new top-level structure — every fix lives inside
the existing `store/src/app` (Next.js App Router) and `store/src/lib`/`components`
layout already established by the project. This retrospective spec's own
artifacts live under `specs/005-shipped-fixes-retrospective/`, following the
same numbered-feature convention as `001`–`004`.

## Complexity Tracking

*No constitution violations — this section intentionally left empty.*
