---
id: 083
title: Sale cross-integration silent failures audit and fix
stage: green
date: 2026-07-05
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: none
labels: ["sale", "caching", "reliability", "silent-failure"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/src/app/admin/page.tsx
 - store/src/app/admin/sales/page.tsx
 - store/src/app/api/admin/sales/route.ts
 - store/src/app/api/admin/sales/[id]/analytics/route.ts
 - store/src/app/api/sale/route.ts
 - store/src/app/api/admin/orders/return/route.ts
 - store/src/app/(store)/sale/page.tsx
 - store/src/app/(store)/shop/page.tsx
 - store/src/app/(store)/shop/[slug]/page.tsx
tests:
 - typecheck: npx tsc --noEmit (clean, twice)
 - build: npm run build (clean, twice) — confirmed /admin/sales flipped from static (○) to dynamic (ƒ) in the route output after adding force-dynamic
 - manual (live, real production data — no test data needed): found the store's actual "Flash Sale📌" already reproducing the exact reported bug (ends_at ~2h in the past, is_active still true in the DB). After the fix: /api/sale returns null, /api/admin/sales and the analytics route both report it inactive, and the DB row itself is now permanently corrected (confirmed via direct Supabase query) — not just a read-time patch
 - manual: confirmed via response headers that /admin/sales was being served from a year-long static prerender cache (Cache-Control: s-maxage=31536000, x-nextjs-cache: HIT) showing only 1 of 5 real sales; after adding force-dynamic, all 5 render live with Cache-Control: no-cache
 - manual: confirmed "Eid SALE" (which shares product "Elegant dress" with "Flash Sale") correctly shows its own 1 order and Analytics link after the getSaleRevenue date-window-scoping fix, no longer misattributed to the newer sale
---

## Prompt

> on sale page the old sale analytics is not showing after adding new sale also the sale ends before the time of flash sale (you can check it) but sale status is still running. there are bugs bypassing. check all sale cross integration with silent failures mode and fallback

> yes

## Response snapshot

Dispatched a research pass across every place in the codebase that determines "is a sale active" or computes per-sale analytics, then verified each finding directly before fixing anything.

**Bug 1 — expired sale still shows "running"**: two compounding causes, both fixed:
1. The lazy-deactivation pattern (auto-flip `is_active=false` once `ends_at` passes) used `void supabaseAdmin.from('sales').update(...)` in `admin/page.tsx` and `admin/sales/page.tsx` — same non-executing fire-and-forget bug class already fixed once this session in a different file (Supabase query builders are thenable; an unawaited bare `void query` never sends the request). Fixed both to `await`, and added the same missing check to `api/admin/sales/route.ts` (had none at all) and `api/sale/route.ts` (which also lacked an `ends_at` filter entirely, trusting `is_active` alone).
2. `api/admin/sales/[id]/analytics/route.ts` returned the raw `is_active` column with no expiry recheck — now re-derives it from `ends_at`.

Verified against real production data, not synthetic test data: the store's actual "Flash Sale📌" was already `ends_at` ~2 hours in the past with `is_active` still `true` — the live reproduction of exactly what was reported. After the fix, all four surfaces (`/api/sale`, `/api/admin/sales`, the analytics route, and the sales list page's "Completed"/"Running" badge) agree it's inactive, and the DB row itself is now permanently `is_active=false`.

**Bug 2 — old sale's analytics disappearing after a new sale is added**: also two causes:
1. `getSaleRevenue` (admin sales list) used a global "last sale wins" product→sale_id map, so a product shared between two sales had all its historical revenue reassigned to whichever sale most recently claimed it — since the "Analytics" link only renders when `orders > 0`, an older sale's link could vanish despite having real historical orders. Rewrote to scope by each sale's own `starts_at`/`ends_at` window, matching the already-correct per-sale analytics detail route from earlier this session.
2. The bigger root cause, found while investigating: `admin/sales/page.tsx` was the only server-rendered admin data page missing `export const dynamic = 'force-dynamic'` — it was statically prerendered at build time (`Cache-Control: s-maxage=31536000`) and never reflected any sale created or changed after the last deploy. Confirmed live: before the fix, the cached page showed only 1 of 5 real sales; after adding the directive, all 5 render with live, no-cache headers.

Also fixed the same unawaited-write bug in `api/admin/orders/return/route.ts`, and added `console.error` logging (server-side only — confirmed none of the touched files are client components, so nothing technical is ever shown to shoppers) to five previously-silent `catch` blocks across the sale-determination code paths in the storefront (`sale/page.tsx`, `shop/page.tsx`, `shop/[slug]/page.tsx`) and admin dashboard.

## Outcome

- ✅ Impact: an expired sale can no longer show as "running" anywhere in the app (customer-facing or admin); a sale's Analytics link and revenue no longer disappear or misattribute when a shared product moves to a newer sale; the admin sales list now reflects live data instead of a year-old build-time snapshot; five silent failure points now log server-side instead of masking real Supabase errors as "no sale today."
- 🧪 Tests: typecheck + build clean; live verification against real (not synthetic) production data reproducing both reported bugs, confirmed fixed end-to-end including the underlying DB row state.
- 📁 Files: store/src/app/admin/page.tsx, store/src/app/admin/sales/page.tsx, store/src/app/api/admin/sales/route.ts, store/src/app/api/admin/sales/[id]/analytics/route.ts, store/src/app/api/sale/route.ts, store/src/app/api/admin/orders/return/route.ts, store/src/app/(store)/sale/page.tsx, store/src/app/(store)/shop/page.tsx, store/src/app/(store)/shop/[slug]/page.tsx
- 🔁 Next prompts: worth a dedicated pass auditing every server-rendered page for a missing `force-dynamic` directive, now that one real instance has been found causing a year-long stale cache in production
- 🧠 Reflection: the most valuable finding here (`admin/sales/page.tsx` missing `force-dynamic`) wasn't in the original bug report or even the research agent's brief — it surfaced only because I checked real HTTP response headers (`x-nextjs-cache: HIT`) while trying to verify a different, already-understood fix. Worth defaulting to checking response headers whenever a live verification shows fewer/different results than the database actually contains.

## Evaluation notes (flywheel)

- Failure modes observed: static rendering silently freezing an admin data page is a much bigger and quieter failure mode than any of the individual data-computation bugs — it wouldn't show up in code review or typecheck at all, only in live behavior under production build conditions (which is exactly why `npm run build && npm start` verification, not `next dev`, has been the standing practice this session).
- Graders run and results (PASS/FAIL): live verification against real Flash Sale/Eid Sale data — PASS for both reported bugs.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): grep all `store/src/app/**/page.tsx` server components for Supabase calls without a matching `force-dynamic` export.
