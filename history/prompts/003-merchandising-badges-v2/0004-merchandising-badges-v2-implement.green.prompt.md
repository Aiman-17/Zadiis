---
id: 0004
title: Merchandising badges v2 implementation
stage: green
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: 003-merchandising-badges-v2
branch: 003-merchandising-badges-v2
user: Aiman-17
command: /sp.implement
labels: ["implement", "merchandising", "best-seller", "trending", "just-dropped", "featured", "bugfix"]
links:
  spec: specs/003-merchandising-badges-v2/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - store/src/lib/merchandising.ts
 - store/src/lib/merchandising-server.ts
 - store/src/lib/products.ts
 - store/src/types/index.ts
 - store/src/components/products/ProductCard.tsx
 - store/src/app/(store)/page.tsx
 - store/src/app/(store)/sale/page.tsx
 - store/src/app/(store)/shop/page.tsx
 - store/src/app/(store)/shop/[slug]/page.tsx
 - store/src/components/admin/AdminProductsClient.tsx
 - store/src/components/admin/AnalyticsClient.tsx
 - store/src/components/admin/DashboardCharts.tsx
 - store/src/app/api/admin/products/route.ts
 - store/src/app/admin/products/new/page.tsx
 - store/src/app/admin/products/[id]/edit/EditProductForm.tsx
 - supabase/migrations/2026-07-03-add-featured.sql
 - store/tests/store/merchandising-consistency.spec.ts
 - store/tests/admin/merchandising-scoring.spec.ts
 - store/tests/admin/products.spec.ts
 - specs/003-merchandising-badges-v2/tasks.md
tests:
 - store/tests/store/merchandising-consistency.spec.ts (4 tests, 4 pass)
 - store/tests/admin/merchandising-scoring.spec.ts (16 tests, 15 pass, 1 skip)
 - store/tests/admin/products.spec.ts (11 tests, 11 pass, updated 2 obsolete assertions)
 - full store+admin Playwright regression (157 tests, 144 pass, 11 skip, 0 fail after fixes)
---

## Prompt

/sp.implement (no arguments)

[Note: this PHR consolidates the full implementation session for T001–T051,
resumed across a context-window compaction. The one substantive user message
during this stage, verbatim, was:]

w8 are you not editing the existing files

## Response snapshot

Implemented all 6 user stories (T001–T051). Built store/src/lib/merchandising.ts
as the single source of truth for Best Seller (category-relative, min-sales-gated
at 2, capped at 4, never padded) and Trending (fully automatic, category-relative,
capped at 4) qualification, consumed identically by Shop, Homepage, Admin
Dashboard, Admin Analytics, Admin Products list, Sale page, and product detail
page — replacing ~10 independently-duplicated definitions found by grep sweep
(more than the 4 originally scoped in plan.md). Switched Just Dropped from
created_at to real stock_movements restock events, reusing the admin PUT
handler's existing pre-update stock read. Added the Featured section (US5,
is_featured/featured_start/featured_end) mirroring is_new_arrival's date-window
pattern, and removed the permanent is_bestseller/is_trending admin toggles
(US6, DB columns retained unread).

Verification against the live app (not just tsc/build) surfaced three real bugs
introduced by this implementation, each root-caused and fixed before proceeding:

1. stock_movements RLS restricts all access to service_role — Just Dropped's
   read via the public anon client returned zero rows silently (no error).
   Fixed with supabaseAdmin.
2. That fix crashed every admin page. merchandising.ts is imported by several
   'use client' components (AdminProductsClient, AnalyticsClient,
   DashboardCharts) for its pure ranking functions; adding a supabaseAdmin
   import made createClient() throw at module-eval time in the browser bundle
   (service-role key is undefined client-side) — "This page couldn't load,"
   no server-side error logged, only visible via a screenshot of the actual
   rendered page. Fixed by splitting into merchandising.ts (client-safe,
   public client only) and a new merchandising-server.ts (Just Dropped only,
   imported exclusively by products.ts, never by a client component).
3. GET /api/admin/products had a stale explicit column select list missing
   is_featured/featured_start/featured_end/trending_score — every admin-side
   read of those fields silently returned undefined, indistinguishable from
   the missing-migration symptom until a screenshot proved the homepage was
   actually rendering every section correctly (Featured, Trending, Just
   Dropped, Best Sellers) the whole time.

Also found and fixed a test-authored bug (not a product bug): both new spec
files used `h2:has-text(...).locator('xpath=following-sibling::*[1]')`
assuming the product grid was a sibling of the `<h2>`; the actual homepage
markup nests the heading inside a header-row div, with the grid as a sibling
of that row, not of the heading. Fixed via `getByRole('heading', ...)
.locator('xpath=ancestor::div[2]')` per this repo's locator-priority
convention (tests/CLAUDE.md).

Full regression (T050) surfaced 2 failures in the pre-existing products.spec.ts
asserting the now-intentionally-retired Trending toggle button — not a
regression, but an old test exercising retired UI. Updated both to assert the
Featured toggle (its replacement) instead; reran 11/11 pass. Did the mobile
375px check (T049) with a real Featured product toggled on via reversible
admin PUT — clean single-column layout, no horizontal overflow. Updated
tasks.md marking all 51 tasks [X] with evidence, plus a "Bugs found and fixed"
notes section documenting all four issues above. Committed as 6288333.

## Outcome

- ✅ Impact: Feature 003 fully shipped — every merchandising-badge-showing page in the app now agrees, Best Seller/Trending are algorithmically sound against the audited live-data flaw, Just Dropped reflects real restocks, and merchants have a working Featured promotion tool.
- 🧪 Tests: 2 new spec files (20 tests, 19 pass/1 skip) + 1 existing spec file updated (11/11 pass) + full regression (157 tests, 144 pass/11 skip/0 fail).
- 📁 Files: 20 files changed/added (see files: above), migration applied live by user via Supabase SQL Editor.
- 🔁 Next prompts: none pending — feature complete. If a PR against main is wanted, that's the natural next ask.
- 🧠 Reflection: the most valuable check in this whole implementation wasn't tsc or the build — it was screenshotting the actual rendered homepage. Three of four real bugs (RLS silence, client-bundle crash, stale column select) produced either no error at all or a generic error page with nothing in server logs; only a full-page screenshot distinguished "genuinely broken" from "correctly empty" from "field silently undefined." Trusting green Playwright output without ever looking at a screenshot would have shipped all three.

## Evaluation notes (flywheel)

- Failure modes observed: (1) RLS-restricted table read via wrong Supabase client, silent zero-rows, no error; (2) service-role client import leaking into a client bundle via a shared module used by both server and client callers — createClient() throws at import time with an undefined key; (3) an API route's explicit column allowlist going stale after adding new product fields elsewhere; (4) a test locator assuming DOM sibling structure that didn't match the actual JSX nesting.
- Graders run and results (PASS/FAIL): merchandising-consistency.spec.ts — PASS (4/4). merchandising-scoring.spec.ts — PASS (15/15, 1 skip). products.spec.ts — PASS (11/11) after updating 2 obsolete assertions. Full store+admin regression — PASS (144/144 non-skipped after fix, 0 unexplained failures). tsc --noEmit — PASS (clean) at every intermediate step.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): consider adding an explicit `import 'server-only'` guard to store/src/lib/supabase/server.ts so a future accidental client-side import of supabaseAdmin fails at build time with a clear message, instead of a silent runtime crash discoverable only by screenshot — this repo has no such guard anywhere yet, so it would be a new convention, not a fix to introduce mid-feature.
