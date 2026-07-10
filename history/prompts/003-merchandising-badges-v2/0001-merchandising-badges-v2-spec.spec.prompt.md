---
id: 0001
title: Merchandising badges v2 spec
stage: spec
date: 2026-07-03
surface: agent
model: claude-sonnet-5
feature: 003-merchandising-badges-v2
branch: 003-merchandising-badges-v2
user: Aiman-17
command: /sp.specify merchandising-badges-v2
labels: ["spec", "merchandising", "best-seller", "trending", "just-dropped"]
links:
  spec: specs/003-merchandising-badges-v2/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-merchandising-badges-v2/spec.md
 - specs/003-merchandising-badges-v2/checklists/requirements.md
tests:
 - none (spec stage — no code written)
---

## Prompt

Yes go ahead create specifications of prodcut algorithm and remember a real
calculation and data across all pages admin stores and home

(Full context: this follows a three-round design discussion. Round 1: user
reported Best Seller/Trending/Just Dropped showing different products on
different pages, asked me to investigate before implementing. I traced the
actual code (ProductCard badge threshold, getBestsellerProducts, Analytics
chart filter, homepage section builder) and pulled live data confirming 4
independently-thresholded queries causing the discrepancy, plus a scoring
flaw where a 1-unit sellout outranks a genuine 3-unit repeat seller. Round 2:
user shared a first ChatGPT response proposing category-relative scoring,
restock-based Just Dropped, and removing manual flags in favor of a
"Featured" section — I compared it against the live data, agreed with several
points, pushed back on the fixed minimum-sales threshold (would yield zero
best sellers against real numbers) and fixed top-8/10 counts (impossible with
7 products). Round 3: user shared a second, more elaborate ChatGPT response
proposing a 7-layer "Merchandising Intelligence Engine" (global/category/
collection/season/inventory/trend/lifecycle rankings, multi-arena product
positioning). I verified live catalog data before responding — confirmed
only 2 of 7 products have any category assigned — and gave a "merchandising
architect + brand specialist" critique: the reasoning is sound but sized for
a 375-product multi-year catalog, not a 7-product month-one store; proposed
a phased plan (right-sized Phase 1 now, explicit re-entry-condition-gated
Phase 2 deferrals) rather than building all 7 layers immediately.)

## Response snapshot

Created branch 003-merchandising-badges-v2 (number 3, no conflicts found).
Wrote spec.md with 6 prioritized user stories: P1 single shared computation
across all 4 consuming pages (the actual defect), P2 category-relative Best
Seller with anti-sellout-gaming protection and catalog-size-aware minimum
threshold, P2 fully-automatic category-relative Trending with no manual
override, P2 restock-event-based Just Dropped (reusing the schema's already-
defined but unused 'restock' reason in stock_movements), P3 new manual
"Featured" section as the promotion outlet, P3 retiring the old permanent
is_bestseller/is_trending flags (sequenced after Featured ships). 16
functional requirements including an explicit FR-016 scope boundary listing
the four deferred capabilities. Assumptions section explicitly defers exact
numeric tuning (threshold value, display cap) to planning, keeping the spec
stable as the catalog grows. Zero [NEEDS CLARIFICATION] markers — every real
fork was already resolved across the three-round discussion. Checklist
generated and self-validated: all items pass on first iteration.

## Outcome

- ✅ Impact: Feature 003-merchandising-badges-v2 is spec-ready; encodes a three-round cross-checked design discussion (my own audit + two independently-evaluated AI proposals) into testable requirements, not just prose.
- 🧪 Tests: none — spec stage only.
- 📁 Files: spec.md, checklists/requirements.md.
- 🔁 Next prompts: /sp.plan then /sp.tasks before any implementation.
- 🧠 Reflection: grounding the "compare two AI opinions" exercise in actual live-queried catalog data (not just reasoning about the proposals in the abstract) was what let the spec confidently reject the enterprise-scale parts of both external suggestions without hedging.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): spec quality checklist — PASS (all items, first iteration, zero clarification markers needed).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): none.
