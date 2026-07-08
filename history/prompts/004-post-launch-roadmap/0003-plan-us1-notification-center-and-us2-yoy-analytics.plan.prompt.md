---
id: 0003
title: Plan US1 notification center and US2 YoY analytics
stage: plan
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 004-post-launch-roadmap
branch: 004-post-launch-roadmap
user: Aiman-17
command: /sp.plan
labels: ["notifications", "analytics", "yoy", "plan"]
links:
  spec: specs/004-post-launch-roadmap/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-post-launch-roadmap/plan.md
 - specs/004-post-launch-roadmap/research.md
 - specs/004-post-launch-roadmap/data-model.md
 - specs/004-post-launch-roadmap/contracts/admin-notifications-api.md
 - specs/004-post-launch-roadmap/quickstart.md
 - CLAUDE.md
tests:
 - none run yet — this is a planning stage; /sp.tasks + /sp.implement will produce Playwright coverage under store/tests/admin/**
---

## Prompt

> Scope to User Story 1 (Admin Notification Center) and User Story 2 (YoY Revenue & Sales Trend) only, from specs/004-post-launch-roadmap/spec.md. User Story 3 and User Story 4 remain deferred and out of scope for this plan. Full technical design context (verified against the actual codebase this session) is in C:\Users\QC\.claude\plans\jolly-mapping-marble.md under the "US1" and "US2" sections — use that as the primary input for architecture/design decisions rather than re-deriving from scratch, but verify each cited file:line reference against the current repo state before relying on it.

## Response snapshot

Ran `/sp.plan` scoped to US1+US2 per the constitution's mandatory workflow. Re-verified every file:line reference from the prior session's design notes directly against the current repo before writing anything down — found one real gap in the process: `store/src/app/api/admin/orders/route.ts` independently calls `sendOwnerPaymentReceived` twice (lines 155, 174, for admin-manual COD-delivered and payment-status-paid actions) — two notification write call sites that hadn't been accounted for anywhere in prior planning. Also re-confirmed a previously-found bug: `cancel/route.ts:27`'s order select is missing `id`, which would otherwise silently break notification linking for cancellation requests.

Produced: `plan.md` (Technical Context, Constitution Check — all 7 principles PASS, E2E testing flagged as a required tasks.md gate not a violation, no Complexity Tracking entries needed), `research.md` (6 decisions, each with rationale and alternatives considered), `data-model.md` (the `admin_notifications` table, all 7 write call sites now including the two newly-found ones, the derived-not-persisted `YoyWidget` model), `contracts/admin-notifications-api.md` (GET/PATCH/PUT/DELETE), and `quickstart.md` (manual + regression verification steps). Ran `update-agent-context.sh claude` to sync `CLAUDE.md`'s Active Technologies section.

## Outcome

- ✅ Impact: US1 and US2 now have a concrete, verified implementation plan ready for `/sp.tasks` — including a real bug (missing `admin_notifications` write on 2 call sites) that would have shipped silently if planning had stopped at the prior session's design notes.
- 🧪 Tests: none run — planning stage only.
- 📁 Files: plan.md, research.md, data-model.md, contracts/admin-notifications-api.md, quickstart.md, CLAUDE.md (agent-context sync)
- 🔁 Next prompts: `/sp.tasks` on 004 to generate tasks.md scoped to US1+US2, then `/sp.implement`.
- 🧠 Reflection: the instruction to "verify each cited file:line reference against the current repo state before relying on it" caught a real gap (the admin/orders/route.ts call sites) that a pure hand-off from the prior session's notes would have missed — re-verification during `/sp.plan` isn't redundant busywork even when the input already looks thorough.

## Evaluation notes (flywheel)

- Failure modes observed: none in this run; the prior session's design notes (jolly-mapping-marble.md) were accurate everywhere they were re-checked except for the incomplete call-site inventory.
- Graders run and results (PASS/FAIL): Constitution Check — PASS, all 7 principles, no violations.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
