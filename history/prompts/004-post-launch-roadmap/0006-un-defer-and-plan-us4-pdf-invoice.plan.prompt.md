---
id: 0006
title: Un-defer and plan US4 PDF invoice
stage: plan
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 004-post-launch-roadmap
branch: 004-post-launch-roadmap
user: Aiman-17
command: /sp.plan
labels: ["pdf-invoice", "react-pdf", "plan", "un-defer"]
links:
  spec: specs/004-post-launch-roadmap/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-post-launch-roadmap/spec.md
 - specs/004-post-launch-roadmap/checklists/requirements.md
 - specs/004-post-launch-roadmap/plan.md
 - specs/004-post-launch-roadmap/research.md
 - specs/004-post-launch-roadmap/data-model.md
 - specs/004-post-launch-roadmap/quickstart.md
tests:
 - none yet — planning stage
---

## Prompt

> Scope to User Story 4 (Professional, branded PDF invoices) only, from specs/004-post-launch-roadmap/spec.md. This story was just un-deferred this session (business-maturity trigger judged met) — US1 and US2 are already implemented (PR #5), US3 remains deferred and out of scope. Full design context is in the spec's "Session 2" Clarifications: scope is the payment-confirmation email attachment ONLY for online (non-COD) orders, using @react-pdf/renderer, replacing buildInvoiceDocument's HTML generation in store/src/lib/email.ts. The admin's browser-based print view at /admin/invoices/[id]/print is explicitly untouched — no shared code path required. Reuse existing invoice content/data already assembled for the HTML version and existing brand fonts/colors (Playfair Display/Inter, gold #A68B6E/black #1C1C1C/cream #FAF8F5) for visual consistency. Verify all file:line references against the current repo state before relying on them.

## Response snapshot

Un-deferred spec 004's User Story 4: added a "Session 2" Clarifications block recording the business-maturity trigger as met, rewrote the user story from "explicitly out of scope" to buildable-now (Priority P3, bumping the still-deferred User Story 3 to P4), rewrote FR-009/FR-010 from prohibition language to build requirements, added a PDF Invoice key entity, split SC-003 (now only covers the one remaining deferred item) and added SC-006 for the PDF outcome. Updated the checklist notes to match.

Skipped `setup-plan.sh` deliberately — it unconditionally overwrites `plan.md` from the template, which would have destroyed the existing US1/US2 plan content. Instead appended a new "Addendum: User Story 4" section directly to the existing `plan.md`, `research.md`, `data-model.md`, and `quickstart.md`.

Verified `buildInvoiceDocument` (`email.ts:189-255`) and its attachment call site (`email.ts:313-333`, the `Buffer.from(...).toString('base64')` pattern) directly against the repo before designing around them. Chose `@react-pdf/renderer` + `renderToBuffer()` to match that existing attachment pattern.

**Caught and corrected a real design mistake via verification**: the first draft planned to register the brand fonts (Playfair Display, Inter) via Google Fonts CDN URLs. A web search (Context7 wasn't authenticated in this environment) surfaced that this is a documented reliability risk for this specific library — Google Fonts serves WOFF2, which `@react-pdf/renderer` handles poorly (prefers TTF/OTF), and `Font.register()`'s async download can race with `renderToBuffer()` with no built-in await mechanism (a real reported GitHub issue, not theoretical). Corrected the plan to bundle local TTF font files in the repo instead, registered via local file paths — explicitly supported server-side in Node.js, no network fetch, no race condition.

## Outcome

- ✅ Impact: US4 has a verified, risk-corrected implementation plan ready for `/sp.tasks` — including a font-handling mistake caught before it could become a flaky-in-production bug.
- 🧪 Tests: none run — planning stage only.
- 📁 Files: spec.md, checklists/requirements.md, plan.md, research.md, data-model.md, quickstart.md (all appended/updated, not overwritten).
- 🔁 Next prompts: `/sp.tasks` scoped to US4; separately, `/sp.specify` → `/sp.plan` → `/sp.tasks` → `/sp.implement` for the new spec `006-conversion-and-admin-enhancements` covering the remaining 10 items from this session's broader plan.
- 🧠 Reflection: verifying a third-party library's actual current behavior (not just trusting training-data familiarity with "how PDF libraries usually handle fonts") caught a real bug before any code was written — the instruction to verify file:line references applies just as much to library API assumptions.

## Evaluation notes (flywheel)

- Failure modes observed: Context7 MCP server returned "Invalid API key" (not authenticated in this environment) — fell back to WebSearch successfully, no blocker.
- Graders run and results (PASS/FAIL): n/a — planning stage.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
