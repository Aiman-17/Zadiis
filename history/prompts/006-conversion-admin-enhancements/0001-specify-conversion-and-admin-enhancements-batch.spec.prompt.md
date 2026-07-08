---
id: 0001
title: Specify conversion and admin enhancements batch
stage: spec
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 006-conversion-admin-enhancements
branch: 006-conversion-admin-enhancements
user: Aiman-17
command: /sp.specify
labels: ["batch-spec", "storefront", "admin", "conversion"]
links:
  spec: specs/006-conversion-admin-enhancements/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/006-conversion-admin-enhancements/spec.md
 - specs/006-conversion-admin-enhancements/checklists/requirements.md
tests:
 - spec quality checklist — all items pass, zero NEEDS CLARIFICATION markers
---

## Prompt

> 006-conversion-and-admin-enhancements: A batch of storefront and admin enhancements identified during post-launch work on the ZADII'S store, covering 10 items (an 11th, merchandising revenue click/view attribution, is explicitly deferred with a re-entry trigger, not built now). Full technical design context for all of these already exists in C:\Users\QC\.claude\plans\jolly-mapping-marble.md (Items 1-12, minus items already implemented as US1/US2/US4 of spec 004) — use that as the primary source, verifying file:line references against the current repo state before relying on them, not re-deriving requirements from scratch. [12 items enumerated: swipeable gallery, color-to-image matching, free-delivery toggle, promo popups, analytics visuals, badge lift analytics, slow-mover consolidation, deferred revenue attribution, mobile long-press actions, tab renames, admin dark mode, cancellation toggle]

## Response snapshot

Created branch `006-conversion-admin-enhancements` and `specs/006-conversion-admin-enhancements/spec.md`, translating the implementation-heavy design notes in `jolly-mapping-marble.md` into 12 business-value-focused user stories (WHAT/WHY, no implementation details), ordered by actual business/customer impact rather than the order items were originally raised: customer-facing browsing/conversion (US1 swipeable gallery, US2 color-matching) rank highest; revenue-control levers (US3 free-delivery toggle, US4 cancellation toggle, explicitly given matching priority and a shared "disable it, hide its promotion" design pattern called out in Background) next; marketing (US5 popups); admin safety (US6 mobile long-press); additive reporting (US7 analytics visuals, US8 badge lift); pure internal consistency/labeling (US9 slow-mover consolidation, US10 tab renames); comfort (US11 dark mode); and US12 (merchandising revenue attribution) explicitly deferred with a re-entry trigger, following the FR-016 convention already established in specs 003/004.

Generated the spec quality checklist — all items pass, zero `[NEEDS CLARIFICATION]` markers, since every open design question (free-delivery scope nuance, cancellation both-not-just-link decision, dark-mode full-panel scope, analytics-visuals exact scope) was already resolved during the prior brainstorming/clarification session that produced the source design notes.

## Outcome

- ✅ Impact: 12 previously-scattered implementation ideas are now one formal, `/sp.analyze`-able spec with clear priorities, ready for `/sp.plan`.
- 🧪 Tests: spec quality checklist fully passed on first pass.
- 📁 Files: specs/006-conversion-admin-enhancements/spec.md, specs/006-conversion-admin-enhancements/checklists/requirements.md
- 🔁 Next prompts: `/sp.plan` for the full batch, then `/sp.tasks`, then `/sp.implement`.
- 🧠 Reflection: translating from an implementation-detail-rich source (the plan file, full of file:line citations and component names) into a business-value spec required actively stripping out the HOW at every sentence — the temptation to just restate the plan file's technical framing as the spec was constant, and resisting it is what keeps spec.md and plan.md doing genuinely different jobs.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): spec quality checklist — PASS (all items, zero clarification markers).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
