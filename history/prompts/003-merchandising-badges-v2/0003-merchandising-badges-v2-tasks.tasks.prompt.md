---
id: 0003
title: Merchandising badges v2 tasks
stage: tasks
date: 2026-07-03
surface: agent
model: claude-sonnet-5
feature: 003-merchandising-badges-v2
branch: 003-merchandising-badges-v2
user: Aiman-17
command: /sp.tasks
labels: ["tasks", "merchandising", "best-seller", "trending", "just-dropped", "featured"]
links:
  spec: specs/003-merchandising-badges-v2/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-merchandising-badges-v2/tasks.md
tests:
 - none (tasks stage)
---

## Prompt

/sp.tasks (no arguments)

## Response snapshot

Generated 51 tasks across 9 phases, mapped to spec.md's 6 user stories.
Foundational phase (T002) is deliberately a no-op pass-through — creates
merchandising.ts with functions that initially just delegate to the existing
logic in products.ts, so User Story 1 (Phase 3) is what actually delivers the
consistency fix by redirecting all 4 duplicated consumers (products.ts,
ProductCard.tsx, AnalyticsClient.tsx, DashboardCharts.tsx) through that seam
— explicitly noted in tasks.md Notes that the feature isn't "started" from a
user-value perspective until Phase 3 ships, not Phase 2.

Dependency structure: US2 (category-relative Best Seller), US3 (automatic
Trending), and US4 (restock-based Just Dropped) are all independent of each
other once US1 lands — different concerns within the same merchandising.ts
file (documented as a merge-conflict risk, not a logical dependency) — so
tasks.md's Parallel Opportunities section calls out they can proceed
concurrently. US6 (retire old flags) has a hard dependency on US5 (Featured)
shipping first, matching spec.md's own stated sequencing rationale, plus a
dependency on US1-US3 landing so removing the flags doesn't regress badges
that should still show via genuine qualification.

Tests included per constitution Principle VII, organized into 2 new spec
files (merchandising-consistency.spec.ts for cross-page identity checks,
merchandising-scoring.spec.ts for the algorithm-level scenarios) rather than
one per user story, since most stories share the same underlying spec file
and describe blocks. Every task cites the exact file and, where relevant,
line range (e.g. T030 cites the admin route's existing stock-read at lines
~43-64) established during planning.

## Outcome

- ✅ Impact: Feature 003 has an executable, dependency-ordered task breakdown; MVP (US1) is clearly isolated as the first shippable increment.
- 🧪 Tests: none — tasks stage.
- 📁 Files: tasks.md.
- 🔁 Next prompts: implement T001–T051 in order, starting with Setup/Foundational/US1 as the MVP slice.
- 🧠 Reflection: making the Foundational phase an explicit no-op (rather than smuggling the real consolidation work into "foundational, no story label") keeps the MVP claim honest — US1 is genuinely where the user-visible fix happens, matching how the spec's own "Independent Test" for US1 is phrased.

## Evaluation notes (flywheel)

- Failure modes observed: check-prerequisites.sh again omitted spec.md/plan.md from AVAILABLE_DOCS despite both existing (same recurring bug noted in project memory) — proceeded using content already read earlier in this session.
- Graders run and results (PASS/FAIL): task format validation — PASS (all 51 tasks follow the required checklist format).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): none.
