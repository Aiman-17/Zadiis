---
id: "0003"
title: Spec — Deferred Courier Tracking and Email Product Links
stage: spec
date: 2026-07-02
surface: agent
model: claude-sonnet-4-6
feature: 001-e2e-test-suite
branch: 001-e2e-test-suite
user: Aiman-17
command: sp.clarify (continued)
labels: ["spec","deferred","courier","tracking","email","leopards","postex"]
links:
  spec: specs/001-e2e-test-suite/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-e2e-test-suite/spec.md
tests:
  - n/a — spec update only
---

## Prompt

User raised two gaps discovered during the SDD process:
1. Orders have an internal order number (ZD-XXXX) but no courier tracking number is stored or shown — no Leopards/PostEx/TCS integration exists.
2. Transactional emails (OTP, order confirmation) do not include product links back to the store.

User confirmed: courier service not yet decided (Leopards, PostEx, TCS all candidates). Add as deferred stories, do not spec in detail until service is chosen.

## Response snapshot

Added two deferred stories to specs/001-e2e-test-suite/spec.md:

Story 14 — Courier Shipment Tracking (P2) ⏸ DEFERRED — SERVICE NOT YET DECIDED
- Courier service undecided (Leopards, PostEx, TCS candidates)
- Known service-agnostic requirements documented: tracking_number field in orders table,
  admin books shipment → stores tracking number, /order/[id] displays it, shipment email includes it
- Note in story: run /sp.specify courier-tracking once service and API/policy confirmed
- Acceptance scenarios written as future placeholders only

Story 15 — Product Links in Transactional Emails (P3) ⏸ DEFERRED
- Deferred alongside Story 14 (both touch email templates)
- Small change: wrap product names in order confirmation emails with /shop/[slug] links

Also updated:
- Scope section: "Deferred" list expanded from 3 to 5 stories
- Clarifications section: new bullet recording this decision with courier candidates named

## Outcome

- ✅ Impact: Both gaps formally captured in spec with correct deferred status. Service-agnostic requirements preserved so no context is lost when courier is chosen. Clear trigger documented: run /sp.specify courier-tracking when ready.
- 🧪 Tests: n/a — spec update only
- 📁 Files: specs/001-e2e-test-suite/spec.md updated (3 edits)
- 🔁 Next prompts: /sp.implement — begin T001 (helpers) then T006 (checkout-safepay.spec.ts)
- 🧠 Reflection: Capturing deferred features with service-agnostic requirements is better than a blank placeholder — future agent has enough to write the spec without re-interviewing the user about basics.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): /sp.implement T001
