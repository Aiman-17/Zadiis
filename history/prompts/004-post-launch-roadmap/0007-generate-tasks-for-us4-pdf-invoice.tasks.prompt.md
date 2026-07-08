---
id: 0007
title: Generate tasks for US4 PDF invoice
stage: tasks
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 004-post-launch-roadmap
branch: 004-post-launch-roadmap
user: Aiman-17
command: /sp.tasks
labels: ["pdf-invoice", "react-pdf", "tasks"]
links:
  spec: specs/004-post-launch-roadmap/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-post-launch-roadmap/tasks.md
tests:
 - none run yet — T028 is a test-authoring task
---

## Prompt

> Scope to User Story 4 (PDF Invoice) only, from specs/004-post-launch-roadmap. US1/US2 tasks (T001-T023) already exist in tasks.md and are complete — append new US4 tasks continuing the numbering (T024+), do not regenerate or overwrite the existing file. Design context: plan.md's "Addendum: User Story 4" section, research.md Decisions 7-9, data-model.md's US4 section, quickstart.md's US4 section.

## Response snapshot

Appended a new "Phase 3: User Story 4" section to `tasks.md` (T024-T029) between the existing US2 phase and the Polish phase, which was renumbered from Phase 3 to Phase 4 (T020-T023 → T030-T033) to make room. Updated Dependencies, Parallel Opportunities, a new Parallel Example block, Implementation Strategy, and Summary sections to reflect the insertion rather than regenerating the file.

Tasks cover: adding the `@react-pdf/renderer` dependency (T024), bundling local TTF fonts instead of Google Fonts URLs per the font-handling risk found during `/sp.plan` (T025), building the PDF component tree + `renderInvoicePdf()` helper (T026), swapping the attachment block in `email.ts` and removing the now-dead `buildInvoiceDocument` (T027), a lightweight automated Buffer/magic-bytes check since Playwright can't inspect email attachments directly (T028), and manual end-to-end verification (T029).

## Outcome

- ✅ Impact: US4 now has 6 concrete, dependency-ordered tasks ready for `/sp.implement`, appended cleanly without disturbing the completed US1/US2 task history.
- 🧪 Tests: none executed — T028 is a test-authoring task.
- 📁 Files: specs/004-post-launch-roadmap/tasks.md
- 🔁 Next prompts: `/sp.implement` for T024-T029; separately, the full spec 006 SDD cycle (specify/plan/tasks/implement) for the remaining 10 items from this session's broader plan.
- 🧠 Reflection: appending to an existing tasks.md (renumbering only the trailing Polish phase) instead of regenerating kept the T001-T023 history/checkmarks intact — regenerating from scratch would have silently lost the record of what was already verified.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): n/a — task-generation stage.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
