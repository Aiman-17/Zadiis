---
id: 0001
title: Post-launch roadmap deferred features spec
stage: spec
date: 2026-07-05
surface: agent
model: claude-sonnet-5
feature: 004-post-launch-roadmap
branch: 004-post-launch-roadmap
user: Aiman-17
command: /sp.specify
labels: ["roadmap", "deferred", "courier-tracking", "analytics", "notifications", "invoicing"]
links:
  spec: specs/004-post-launch-roadmap/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-post-launch-roadmap/spec.md
 - specs/004-post-launch-roadmap/checklists/requirements.md
tests:
 - spec quality checklist: all items pass, zero [NEEDS CLARIFICATION] markers
---

## Prompt

> add this in specs we will cahnge this soon base on merchant real tracking endpoint. (so the automatically render that time)All things we change eralier add in specs or create artifacts so we can analyze with sp analyze command.
> 1.A react library with real pdf professional invoice.(later when store goes well not when a order tracking number).
> 2.returns and cancel auto render.(when tracking number available)
> 3.deliver status auto (so I dont need to change manually status deliver).with all fires events invoice pending for cod etc.
> 4.notification center with all emails payment recieve cancel exchange and return requests. so I dont need to chack email everytime when I opened window and recieve new order notification on adminpanel.
> 5.A yearly revenue trend or a time filter in analytics. so I can track previous year of sales revenue repeate rate to comapare only a graph charts.

## Response snapshot

Created feature branch `004-post-launch-roadmap` and `specs/004-post-launch-roadmap/spec.md` via `/sp.specify`, documenting the user's 5 items as 4 User Stories (items 2 and 3 combined into one story since they share the same courier-tracking dependency):

- **User Story 1 (P1, buildable now)**: in-admin-panel notification center for new order/payment received/cancellation/return/exchange events — no external dependency, addresses the "don't want to check email every time" friction directly.
- **User Story 2 (P2, buildable now)**: year-over-year revenue trend + repeat-rate comparison in Admin Analytics — no external dependency.
- **User Story 3 (P3, explicitly deferred)**: automatic delivery-status transition + automatic return/cancel eligibility, both driven by real courier tracking data, reusing the exact cascade (`delivered_at`, COD payment flip, invoice, customer email) already built for the manual "mark delivered" flow. Re-entry trigger: a courier tracking number/API becomes available per order (Leopards Courier merchant account not yet opened).
- **User Story 4 (P4, explicitly deferred)**: real PDF invoice via a React PDF-rendering library, replacing the current HTML-file attachment. Re-entry trigger: business-maturity judgment call ("when store goes well"), explicitly independent of the courier-tracking trigger.

Followed the project's established FR-016-style convention (specs/003-merchandising-badges-v2) for documenting deferred capabilities: each deferred item states explicitly that it MUST NOT be built now, names its concrete re-entry trigger, and requires the current manual workflow / HTML invoice to keep working unchanged until that trigger is met — so this spec creates a record rather than silently dropping the ideas.

Generated the spec quality checklist (`checklists/requirements.md`) — all items pass, zero `[NEEDS CLARIFICATION]` markers, since every open question had a reasonable default groundable in this session's own work (existing cascade logic, existing policy windows, existing analytics time-filter pattern).

## Outcome

- ✅ Impact: five previously-only-verbal future-feature ideas are now a formal, `/sp.analyze`-able spec with explicit priorities and re-entry conditions, so they're revisited deliberately later instead of forgotten.
- 🧪 Tests: spec quality checklist fully passed on first pass.
- 📁 Files: specs/004-post-launch-roadmap/spec.md, specs/004-post-launch-roadmap/checklists/requirements.md
- 🔁 Next prompts: `/sp.plan` for User Story 1 and/or User Story 2 (both buildable now, no external gate) whenever prioritized; revisit User Story 3 once a courier tracking integration exists, and User Story 4 whenever business maturity is judged sufficient.
- 🧠 Reflection: grouping items 2+3 into one User Story (rather than two separate ones) was the right call since they share one re-entry trigger and one underlying cascade — keeping them separate would have duplicated the "why deferred" reasoning for no benefit.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): spec quality checklist — PASS (all items, zero clarification markers)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
