---
id: 0003
title: Generate tasks for conversion admin enhancements
stage: tasks
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 006-conversion-admin-enhancements
branch: 006-conversion-admin-enhancements
user: Aiman-17
command: /sp.tasks
labels: ["batch-tasks", "storefront", "admin"]
links:
  spec: specs/006-conversion-admin-enhancements/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/006-conversion-admin-enhancements/tasks.md
tests:
 - none yet — task-authoring tasks throughout
---

## Prompt

> (continuation of /sp.tasks for spec 006, covering all 11 buildable-now user stories)

## Response snapshot

Generated `tasks.md` with 56 tasks across 11 story phases plus Polish, following the exact checklist format (`- [ ] TXXX [P?] [USn] Description with file path`). Sized per-story task counts to actual complexity rather than uniform distribution — US2 (color-matching, a real state-model refactor) and US6 (long-press across 5 surfaces) got 7 tasks each; US10 (pure label rename) got 2. Explicitly sequenced T047 (tab rename) after T036/T037/T039-40 (the other Analytics additions) since those tasks' own descriptions reference the tabs by their pre-rename names for implementation clarity, and flagged US9's consolidation (T042/T045) as landing before US7's inventory table work if both touch related merchandising files in the same session, to avoid rebasing.

Carried forward both real findings from the plan stage into explicit task-level call-outs: T042 documents that the Slow Mover consolidation is a deliberate behavior change (excluding `is_new_arrival` from the average pool), not a preservation of any one existing copy's behavior, and T045 explicitly warns that `sales/[id]/edit/page.tsx`'s classifications will change as a result — a real regression to verify against actual data, not assume away. T051 explicitly invokes the `dataviz` skill for the dark-mode chart palette rather than allowing an automatic color inversion.

## Outcome

- ✅ Impact: all 11 stories have dependency-ordered, immediately-executable tasks; the two real findings from planning (confirmed Slow Mover bug, narrower dark-mode scope) are preserved as explicit task-level guidance, not lost in the transition from plan to tasks.
- 🧪 Tests: none executed — 11 test-authoring tasks (one per story) precede their implementation tasks per TDD convention.
- 📁 Files: specs/006-conversion-admin-enhancements/tasks.md
- 🔁 Next prompts: `/sp.implement`, story by story in priority order, starting with US1.
- 🧠 Reflection: sizing task counts to actual complexity (2 for a rename, 7 for a real refactor) rather than a uniform template kept the task list honest about where the real work is — a uniform "3 tasks per story" would have under-scoped US2/US6 and padded US10.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): n/a — task-generation stage.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
