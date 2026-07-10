---
id: 0006
title: Chart glow rollout, script-tag fix, and sale page layout fixes
stage: green
date: 2026-07-10
surface: agent
model: claude-sonnet-5
feature: 006-conversion-admin-enhancements
branch: 006-conversion-admin-enhancements
user: Aiman-17
command: none
labels: ["dark-mode", "glow", "chart", "playwright", "layout-width", "bugfix"]
links:
  spec: specs/006-conversion-admin-enhancements/spec.md
  ticket: null
  adr: null
  pr: 7
files:
 - store/src/app/layout.tsx
 - store/src/app/admin/layout.tsx
 - store/src/app/admin/orders/page.tsx
 - store/src/app/admin/sales/[id]/analytics/page.tsx
 - store/src/app/admin/sales/[id]/edit/page.tsx
 - store/src/components/admin/AnalyticsClient.tsx
 - store/src/components/admin/DashboardCharts.tsx
 - store/src/components/admin/YoyWidget.tsx
 - store/src/lib/adminColors.ts
tests:
 - npx tsc --noEmit — pass (run after every edit batch)
 - npm run build — pass (production build, all 43 routes, repeated ~6 times across this session)
 - npm run test:e2e (full suite) — 160 passed, 1 failed, 23 skipped; the 1 failure (product-gallery.spec.ts, net::ERR_NETWORK_IO_SUSPENDED) is a storefront network-level flake unrelated to this session's admin-only changes; all admin tests passed including dark-mode.spec.ts
---

## Prompt

> "now restart and build sever for errors"

> "now for glow on other remaining charts across all analytics tabs and dashboard top prodcuts and sales trend also on sale page analytics and other yoy on revenue tab and sales performance tab (hidden beacuse of no rendering current data) and merchandising and inventory section charts. First make an articats of every ssections.and not implement when I do not confirm"

> "yes but what about different colors white etc(dont change colors) if we add glow how would the looked make artifact"

> "yes do if I dont like it I revert and skip them too. But dont change an exsiting color only bright halo"

> "what about amber gold violet and terracota there is only glow on cream color with extra shadow [screenshot] on every where and the violet color of sizes is not matching with theme or add somewhere else in analytics section. Yes you question about 'No orders through this sale yet' is not adopting fix it also the order page return section proceed to return badge also not adapting dark mode."

> "in merchandising tab glow is not applied except a shadow without any glow"

> "shadow is overflowing on merchandising tab charts"

> "also check sales analytics and on sale edit page (there is a space when click on edit sale sale open on the right side of analytics section not on other page.only on desktop large screens)"

> "okay now start e2e on all changes you made then make phr only"

## Response snapshot

Six pieces of work, each verified with a real rebuild + Playwright screenshot before moving to the next:

1. **React "script tag" console warning** — the FOUC-prevention `<script>` in `admin/layout.tsx` was a raw tag rendered by a `'use client'` component; since it re-rendered on every dark-mode/collapse toggle, React (correctly) warned that client-rendered `<script>` tags never execute. Moved it to `next/script` `strategy="beforeInteractive"` in the root `layout.tsx`, gated by `location.pathname.startsWith('/admin')` (the old version unconditionally added `.dark` to `<html>`, which also redefines `--brand-bg`/`--brand-text` — a latent risk of leaking dark mode onto the storefront). First attempt still warned because the script was wrapped in a manually-authored `<head>` element, which the App Router doesn't support (Next.js auto-hoists `beforeInteractive` scripts into `<head>` regardless of placement) — fixed by making `<Script>` a direct child of `<body>`, matching the documented pattern exactly.

2. **Glow rollout, artifact-first** — built an HTML Artifact previewing the proposed hero-element glow treatment (leading bar/point only, never the whole chart) across every remaining ungloweed chart, plus a color-by-color swatch comparison after a follow-up question, before touching any code. Once confirmed, implemented glow on ~15 charts across Dashboard, all 5 Analytics tabs, and the sale detail page (Repeat Rate Trend, Sales Over Time, Cities, Featured/New Arrival Sales, Product Performance, Best Sellers, Category Performance, Top Colors, Stock & Sales by Category, Size Sell-Through, Cancel/Return reason charts, YoY lines, sale detail's peak-day bar). Also swapped Top Sizes off violet onto terracotta to match the warm palette the rest of Merchandising uses.

3. **Two glow-quality bug reports, same root cause each time** — (a) near-white "highest step" bars were showing a harsh bright halo ("extra shadow") while gold/terracotta/violet leading bars barely showed any glow at all: luminance-contrast physics — the same opacity reads as a blinding bloom against a near-white fill and as nearly invisible against a mid-tone warm fill. Fixed by switching the near-white cases to a fixed warm-gold tint (matching the already-shipped "today" bar pattern) and bumping opacity/blur for the accent-color cases. (b) "shadow without any glow" in the Merchandising tab turned out to be `color-mix()` silently failing as an argument inside `filter: drop-shadow(...)` — it works fine as a plain `background`/`border` color elsewhere in the app, just not nested inside that specific filter function. Root-caused via direct comparison against the Orders page, then added a `glowFilter()`/`glowShadow()` helper to `adminColors.ts` that resolves hex → literal `rgba()` in JS, and migrated every remaining `color-mix()`-inside-drop-shadow instance to it.

4. **Two separate dark-mode contrast bugs**, found by the user, fixed in the same pass: the sale detail page's "No orders through this sale yet" banner (hardcoded light-yellow regardless of theme) and the Orders page's "Process Return"/"Cancel Order"/"Mark Delivered" request-card badges (same hardcoded-light-color pattern).

5. **Sale analytics/edit page width** — both pages were capped at `max-w-3xl`/`max-w-2xl`, leaving a large unused gap on desktop screens that no other admin data page has. Confirmed against the Orders page baseline (which fills 1920px edge-to-edge) via a direct screenshot comparison, then removed the cap entirely on the analytics page (a data/chart page, same category as Orders/Products/main-Analytics) and widened the edit page from `max-w-2xl` to `max-w-3xl` (kept it form-width on purpose, matching Product Edit/New — only widened enough to stop crowding the "Products in this Sale" row list).

6. **Full E2E suite** (184 tests, `workers: 1`) — 160 passed, 1 failed (a storefront network-suspension flake unrelated to any of this session's changes), 23 skipped. Every admin test passed, including `dark-mode.spec.ts` specifically.

Every fix in this batch was verified with an actual rebuild (`npm run build`) + fresh `npm start` + real Playwright screenshots — including two rounds that caught the verifier's own mistakes (a full-page screenshot taken before bar-entrance animation finished, misread as a rendering bug; and the first width fix, `max-w-5xl`, screenshotted and found still short of the Orders-page baseline before going all the way to no cap).

## Outcome

- ✅ Impact: console warning eliminated app-wide; ~15 charts now carry a consistent, correctly-visible hero-element glow across Dashboard and all 5 Analytics tabs; a real cross-browser CSS bug (`color-mix()` inside `drop-shadow()`) found and fixed with a reusable JS helper instead of a one-off patch; two more dark-mode contrast gaps closed; sale analytics/edit pages now use screen width consistently with sibling admin pages.
- 🧪 Tests: `tsc --noEmit` clean; `npm run build` clean (repeated ~6 times); full E2E 160 passed / 1 unrelated flake / 23 skipped, 0 admin failures.
- 📁 Files: `app/layout.tsx`, `admin/layout.tsx`, `admin/orders/page.tsx`, `admin/sales/[id]/analytics/page.tsx`, `admin/sales/[id]/edit/page.tsx`, `AnalyticsClient.tsx`, `DashboardCharts.tsx`, `YoyWidget.tsx`, new helpers in `lib/adminColors.ts`.
- 🔁 Next prompts: none currently planned; large uncommitted batch (this PHR + PHR 0005's scope) still needs a commit/push decision from the user before PR #7 reflects it.
- 🧠 Reflection: two bug reports this session ("extra shadow on cream" and "shadow without glow") looked like separate issues but traced to the same underlying fact — CSS glow effects are not opacity-portable across fill luminance, and `color-mix()` support inside `filter:` functions can't be assumed just because it works as a plain color property. Both were only caught by comparing real rendered screenshots against a stated baseline (the "today" bar pattern; the Orders page width), not by reasoning about the CSS in the abstract.

## Evaluation notes (flywheel)

- Failure modes observed: assumed `color-mix()` support was uniform across CSS contexts without testing the specific `drop-shadow()` nesting; assumed a single glow opacity value would look equally visible across all fill colors without accounting for the fill's own luminance; first width fix (`max-w-5xl`) was a guess not checked against a concrete baseline until the user's original complaint pattern ("not on other page") prompted an actual side-by-side screenshot comparison.
- Graders run and results (PASS/FAIL): visual screenshot verification for every fix in this batch — PASS after 2 iterations on glow color, 1 iteration on the color-mix bug, 2 iterations on page width; full E2E — PASS (0 admin failures, 1 unrelated storefront flake).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): when a user says "not on other page" as evidence a symptom is page-specific, screenshot the named comparison page FIRST to get a concrete target, rather than picking an intermediate fix value and waiting for the next round of feedback to correct it.
