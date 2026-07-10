---
id: 0002
title: Plan conversion and admin enhancements batch
stage: plan
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 006-conversion-admin-enhancements
branch: 006-conversion-admin-enhancements
user: Aiman-17
command: /sp.plan
labels: ["batch-plan", "storefront", "admin", "verification"]
links:
  spec: specs/006-conversion-admin-enhancements/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/006-conversion-admin-enhancements/plan.md
 - specs/006-conversion-admin-enhancements/research.md
 - specs/006-conversion-admin-enhancements/data-model.md
 - specs/006-conversion-admin-enhancements/quickstart.md
 - CLAUDE.md
tests:
 - none yet — planning stage
---

## Prompt

> (continuation of /sp.plan for spec 006, covering all 11 buildable-now user stories)

## Response snapshot

Before writing plan.md, ran 4 parallel Explore agents to re-verify every file:line reference from the source design notes (`jolly-mapping-marble.md`) against the current repo state, since spec 004's US1/US2/US4 implementation work landed in the interim and could have shifted line numbers or invalidated assumptions. This surfaced two genuine discrepancies, not just stale line numbers:

1. **US5 (popups)**: an unused Radix Dialog primitive (`store/src/components/ui/dialog.tsx`) already exists in the codebase with zero current importers — the earlier "no popup/modal component exists" claim was one level too broad. Now planned as the build-on point instead of a bespoke overlay.
2. **US9 (Slow Mover)**: upgraded from "future drift risk" to "confirmed live bug" — the three existing `isSlowMover` copies don't just risk disagreeing, they **already disagree today**: `sales/new/page.tsx`'s average-sell-through baseline excludes `is_new_arrival` products while the other two copies include them, meaning the same product can already be classified differently depending on which admin screen shows it. Documented the resolution (exclude `is_new_arrival` from the shared baseline, matching `sales/new/page.tsx`) as a deliberate product decision requiring verification against real data, not a mechanical refactor.
3. **US11 (dark mode)**: found Tailwind v4's class-based dark mode is already fully configured (`@custom-variant dark`, a complete `.dark {}` shadcn-token block) — significantly narrowing scope to just adding brand-var dark counterparts, a toggle + persistence, and a dataviz-skill-validated chart palette, rather than building dark-mode infrastructure from scratch.

Produced `plan.md` (Constitution Check — 2 GATE items requiring explicit tasks.md follow-through: mobile-first design for US1/US6, and brand-derived dark palette for US11), `research.md` (10 decisions), `data-model.md` (1 new column, 2 new settings keys, explicit "no new entity" call-outs for 6 of the 11 stories), and `quickstart.md` (per-story manual verification steps).

## Outcome

- ✅ Impact: all 11 stories have a verified, current-state-accurate implementation plan — including one confirmed live bug (US9) and one scope reduction (US11) that wouldn't have surfaced without re-verification.
- 🧪 Tests: none run — planning stage only.
- 📁 Files: plan.md, research.md, data-model.md, quickstart.md, CLAUDE.md (agent-context sync).
- 🔁 Next prompts: `/sp.tasks` for the full batch, then `/sp.implement` story by story.
- 🧠 Reflection: re-verifying an entire design doc's file:line references before planning — rather than trusting it because it "looked thorough" when written — paid off a third time this session (after the admin/orders.ts notification gap and the react-pdf font-handling correction). A design doc's accuracy has a shelf life measured in commits, not sessions.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): Constitution Check — PASS with 2 flagged GATEs requiring task-level follow-through (not violations).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
