---
id: "0004"
title: color-map-swatches-analytics-fixes
stage: general
date: 2026-07-01
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /code-review + manual requests
labels: ["analytics","color-map","product-detail","code-review","bug-fix","ui"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/AnalyticsClient.tsx
  - store/src/components/admin/DashboardCharts.tsx
  - store/src/components/products/AddToCartButton.tsx
tests:
  - npx tsc --noEmit (passed clean after each commit)
---

## Prompt

Session covering multiple sequential requests:
1. Remove Top Colors and Trending Now from Products tab in analytics; add rank-based colors to Inventory category chart
2. Fix gross profit calculation — subtract delivery_charge from profit
3. /sp.analyze — aborted (no spec/plan/tasks artifacts exist in this project)
4. /code-review — high-effort 8-angle review of 5 recent commits
5. Apply all code-review fixes
6. Why is net revenue same as gross revenue (40,130)?
7. How are colors handled in add-product and on the product detail page?
8. Add Pakistani fashion colors to COLOR_MAP (truffle, pista, tea pink, lilac, peach, etc.)
9. Add color name label below each swatch on product detail page

## Response snapshot

**Analytics cleanup (commits a2f17ea, ad3c73b):**
- Removed Trending Now (section 3) and Top Colors (section 6) from Products tab
- Added Cell-based rank colors (#1C1C1C → #A68B6E → #C9956C → #8B7355 → #D4B896) to Inventory "Stock & Sales by Category" bar chart
- Fixed grossProfit to subtract o.delivery_charge per qualifying order

**Code review (commit aba788c) — 5 fixes from 6 CONFIRMED/PLAUSIBLE findings:**
1. profitMarginPct denominator: o.total → o.subtotal (delivery in numerator as cost was also inflating denominator via o.total, understating margin: 21.7% shown instead of correct 25%)
2. Repeat Rate Trend YAxis: [0,'dataMax'] → [0,100] (collapses to [0,0] on stores with zero repeat orders — flat broken chart)
3. Empty-string customer_phone guard before phoneDates push (legacy rows with blank phone grouped unrelated customers as repeats, inflating rate)
4. Dead phoneDates.sort() removed (O(n log n) per customer per render, .some() consumer is linear scan unaffected by sort order)
5. getMerchStockDash deleted, call site replaced with dashStock already in same file (identical body, latent divergence risk)

**Net = Gross explanation:**
No cancelled/returned orders exist in the selected date range — calculation is correct, deduction is zero. Expected behavior.

**Color map expansion (commit 705a82c):**
Added 30+ Pakistani fashion colors to COLOR_MAP in AddToCartButton.tsx: truffle (#917A6B), tea pink (#C98C96), baby pink (#F4C2C2), pista (#ADCF8B), peach (#FFCBA4), peach pink (#F7A8A8), lilac (#C8A2C8), bottle green (#006A4E), burgundy (#800020), rust (#B7410E), mustard (#E3A902), fuchsia (#C71F7E), mauve (#B784A7), rose gold (#B76E79), ivory, champagne, nude, khaki, taupe, emerald, turquoise, plum, orchid, sky blue, powder blue, lemon, orange, rose, copper, tan + pista green alias.

**Color swatch labels (commit f3f3919):**
Redesigned color picker on product detail page — each circle swatch now shows color name label below it. Label is grey when unselected, black + bold when selected. Sold-out colors stay 50% opacity with diagonal slash. Max-width 52px keeps long names (e.g. "Bottle Green") centered under circle.

## Outcome

- ✅ Impact: Profit margin now accurate (uses subtotal not total as denominator); repeat rate chart safe on zero data; 30+ Pakistani fashion colors resolve to correct swatches; product page shows color names below swatches
- 🧪 Tests: tsc --noEmit passed clean after all 5 commits
- 📁 Files: AnalyticsClient.tsx (margin, YAxis, phone guard, dead sort), DashboardCharts.tsx (dashStock dedup), AddToCartButton.tsx (COLOR_MAP + swatch labels)
- 🔁 Next prompts: test color swatches on live product pages; consider color picker UI in admin add-product form instead of free-text
- 🧠 Reflection: Code review caught real financial display bug (margin denominator) that would have consistently understated margin on every order with a delivery charge

## Evaluation notes (flywheel)

- Failure modes observed: margin denominator bug was subtle — delivery subtracted as cost in numerator while o.total in denominator still included it as revenue, creating asymmetric dilution
- Graders run and results (PASS/FAIL): tsc clean on all 5 commits in session
- Prompt variant (if applicable): /code-review high effort — 6 parallel finder agents + 3 parallel verifier agents
- Next experiment (smallest change to try): add color picker UI in admin add-product form instead of comma-separated free text
