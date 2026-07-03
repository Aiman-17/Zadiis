---
id: "0002"
title: Spec Clarified — Deferred Stories and Route Corrections
stage: spec
date: 2026-07-02
surface: agent
model: claude-sonnet-4-6
feature: 001-e2e-test-suite
branch: 001-e2e-test-suite
user: Aiman-17
command: sp.clarify
labels: ["spec","clarification","e2e","scope","deferred","routes"]
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

/sp.clarify (no arguments — scan active spec for ambiguities)

User clarification on Q1: "Since we do not implemented those features but in future we might need that so dont remove skip and marks not implemented or future need etc."

## Response snapshot

Ambiguity scan found 3 Partial-status categories from spec vs research divergence:
1. Functional Scope — spec said "13 new spec files" but research confirmed only 10 active pages exist
2. UX Flow / Routes — Story 3 used wrong route `/order-tracking?order=ZD-XXXX`; actual is `/order/[id]` (UUID)
3. Edge Cases — Store P3 listed Profile and Wishlist which do not exist as pages yet

Q1 asked (scope reduction decision): User chose to KEEP deferred stories, mark as ⏸ DEFERRED — NOT YET IMPLEMENTED for future sprint use.

Applied all corrections to spec.md:
- Scope section: "13 new spec files" → "10 active + 3 deferred"
- Story 3 renamed to "Order Confirmation Page"; file → `order-confirmation.spec.ts`; route → `/order/[id]`
- Story 7: noted returns handled within `/admin/orders`, not a separate route
- Stories 9 + 10 (Categories, Customers): marked ⏸ DEFERRED with "page not built" note
- Stories 4b + 4c (Profile, Wishlist): stub entries added, marked ⏸ DEFERRED
- Story 11: file corrected to `sales.spec.ts`
- Stories 12 + 13: merged — `/admin/shipping` does not exist, delivery zones are in `/admin/settings`
- FR-017/FR-018, SEC-003, AC-006, DoD: all updated to reflect correct route and file count

## Outcome

- ✅ Impact: Spec now accurately reflects the codebase. Deferred stories preserved with clear status. Spec is implementation-ready with no contradictions.
- 🧪 Tests: n/a — spec update only
- 📁 Files: specs/001-e2e-test-suite/spec.md updated (12 targeted edits)
- 🔁 Next prompts: /sp.implement — begin T001 (helpers), then T006 (checkout-safepay.spec.ts)
- 🧠 Reflection: Running clarify after plan+tasks is useful for spec-vs-reality sync rather than architecture decisions. Recording user intent for deferred stories in the Clarifications section prevents future agents from removing them without context.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): /sp.implement T001 then T006
