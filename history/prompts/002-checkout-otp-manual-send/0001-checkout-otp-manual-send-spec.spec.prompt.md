---
id: 0001
title: Checkout OTP manual send spec
stage: spec
date: 2026-07-03
surface: agent
model: claude-sonnet-5
feature: 002-checkout-otp-manual-send
branch: 002-checkout-otp-manual-send
user: Aiman-17
command: /sp.specify checkout-otp-manual-send
labels: ["spec", "checkout", "otp", "email-verification", "regression"]
links:
  spec: specs/002-checkout-otp-manual-send/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-checkout-otp-manual-send/spec.md
 - specs/002-checkout-otp-manual-send/checklists/requirements.md
tests:
 - none (spec stage — no code written)
---

## Prompt

add a send arrow and small btn in email placeholder on checkout email fires when
cutomer clicks on it also make a time of 80 seconds if email goes into spam they
need to close the winodw go spam folder then return.
Dont implemet anything There are several bugs and issueswe use add workflow for
both testing

(Clarified via AskUserQuestion before drafting: (1) send button is a manual
trigger that REPLACES auto-send-on-blur, not an addition alongside it; (2) the
80 seconds replaces the existing 60s resend cooldown, same mechanism; (3) scope
is one spec covering this feature plus known bugs — BUG-001, BUG-002, and the
NEXT_PUBLIC_APP_URL production email-link gap found during live verification —
folded in as regression/release-checklist requirements, nothing implemented
until spec+plan+tasks are approved.)

## Response snapshot

Created feature branch `002-checkout-otp-manual-send` (from current branch
state, since PR #2 for 001-e2e-test-suite is still open) via
create-new-feature.sh --number 2. Wrote spec.md with 4 prioritized user
stories: P1 manual send-button replacing auto-send, P2 80s cooldown, P3 spam-
folder guidance + checkout-state persistence across tab switches, P2 existing-
fix regression coverage (BUG-001 error visibility, BUG-002 search-clear
race, plus a release-checklist requirement for the NEXT_PUBLIC_APP_URL
production config gap — framed as an environment check, not a code defect).
13 functional requirements, 2 key entities, 5 measurable success criteria — all
technology-agnostic, no [NEEDS CLARIFICATION] markers (all three resolved
pre-draft). Quality checklist generated and self-validated: all items pass on
first pass, no spec revisions needed.

## Outcome

- ✅ Impact: Feature 002-checkout-otp-manual-send is spec-ready; no code changed per explicit "don't implement anything" instruction.
- 🧪 Tests: none — spec stage only.
- 📁 Files: spec.md, checklists/requirements.md.
- 🔁 Next prompts: /sp.clarify (optional, already pre-clarified) or /sp.plan to produce the architecture/design artifact; then /sp.tasks before any implementation.
- 🧠 Reflection: asking 3 targeted questions before drafting (button behavior, timer purpose, bug-scope) avoided a spec that would need a rewrite — the raw request was ambiguous on exactly those three axes.

## Evaluation notes (flywheel)

- Failure modes observed: create-phr.sh emits an unfilled template (all {{PLACEHOLDER}} tokens) — same recurring bug noted in project memory; PHR content filled in manually per the CLAUDE.md fallback instructions.
- Graders run and results (PASS/FAIL): spec quality checklist — PASS (all items, first iteration).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): none.
