---
id: 0004
title: Generate tasks for US1 US2 with bug fixes
stage: tasks
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 004-post-launch-roadmap
branch: 004-post-launch-roadmap
user: Aiman-17
command: /sp.tasks
labels: ["notifications", "analytics", "yoy", "tasks", "bugfix"]
links:
  spec: specs/004-post-launch-roadmap/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-post-launch-roadmap/tasks.md
tests:
 - none run yet — task T001 and T014 are Playwright test-authoring tasks, not yet executed
---

## Prompt

> /sp.tasks also resolve bugs

## Response snapshot

Ran `.specify/scripts/bash/check-prerequisites.sh --json` (confirmed research.md, data-model.md, contracts/, quickstart.md all available), read `tasks-template.md`, and generated `specs/004-post-launch-roadmap/tasks.md` with 23 tasks across US1 (13 tasks) and US2 (6 tasks) plus a 4-task Polish phase. No Setup/Foundational phase was needed since US1 and US2 are fully file-disjoint (documented explicitly rather than manufacturing filler tasks).

Per the "also resolve bugs" instruction, folded in the three concrete bugs found during `/sp.plan`'s verification pass as explicit, individually-tracked tasks rather than leaving them implicit: T004 (missing `id` in `cancel/route.ts:27`'s order select), T009 (the two previously-missed `admin_notifications` write call sites in `admin/orders/route.ts:155,174`), and T021 (a proactive Polish-phase sweep for this project's two documented recurring bug classes — unawaited Supabase writes, missing `force-dynamic` — across every file this feature touches, not just the two already-known bugs).

Tests are marked required, not optional, per constitution Principle VII (E2E Testing Mandate) — T001 and T014 are Playwright test-authoring tasks for `store/tests/admin/notifications.spec.ts` and `store/tests/admin/analytics.spec.ts`, written before implementation per the template's TDD note.

## Outcome

- ✅ Impact: US1 and US2 have a concrete, dependency-ordered, immediately-executable task list; three real bugs (one previously found, two newly found during planning) are now tracked as first-class tasks instead of footnotes that could get lost before `/sp.implement`.
- 🧪 Tests: none executed — T001/T014 are test-authoring tasks, to run and confirm-failing before implementation per TDD convention.
- 📁 Files: specs/004-post-launch-roadmap/tasks.md
- 🔁 Next prompts: `/sp.implement` to execute the task list, starting with US1 (T001-T013) as the suggested MVP scope.
- 🧠 Reflection: treating "also resolve bugs" as "make the already-found bugs explicit, individually-numbered tasks with their own dependency edges" (rather than a vague blanket instruction) kept the bug fixes from being silently absorbed into larger tasks where they could be skipped or forgotten during implementation.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): n/a — task-generation stage, no code executed yet.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
