---
id: "0001"
title: E2E Test Suite Tasks Generated
stage: tasks
date: 2026-07-01
surface: agent
model: claude-sonnet-4-6
feature: 001-e2e-test-suite
branch: 001-e2e-test-suite
user: Aiman-17
command: sp.tasks
labels: ["e2e","playwright","tasks","testing","quality-guardian"]
links:
  spec: specs/001-e2e-test-suite/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/001-e2e-test-suite/tasks.md
  - specs/001-e2e-test-suite/plan.md
  - specs/001-e2e-test-suite/research.md
tests:
  - 20 tasks covering 11 user stories → 10 new spec files + 1 extended
---

## Prompt

/sp.tasks (no arguments — generate tasks for active feature 001-e2e-test-suite)

## Response snapshot

Generated `specs/001-e2e-test-suite/tasks.md` with 20 tasks across 14 phases.

Phase 1 (Setup): T001–T003 — create `tests/helpers/` directory with cart, OTP, and order
helper utilities shared by all stories.

Phase 2 (Foundational): T004–T005 — verify admin.json storageState exists, confirm
playwright.config.ts is correct.

Phase 3–13 (11 User Stories, P1→P2→P3):
- US1 T006: `checkout-safepay.spec.ts` — 5 tests (redirect, webhook, invalid sig)
- US2 T007: `checkout-otp.spec.ts` — 5 tests (modal, correct/wrong code, resend, rate limit)
- US3 T008: `order-confirmation.spec.ts` — 5 tests (/order/[id], not-found, WhatsApp)
- US4 T009: `returns.spec.ts` — 5 tests (/returns + /cancel-order both covered)
- US5 T010: `analytics.spec.ts` — 6 tests (tabs, KPI cards, chart, date range)
- US6 T011: `payments.spec.ts` — 6 tests (filter, archive, trend chart)
- US7 T012: extend `orders.spec.ts` — 3 tests (returns section)
- US8 T013: `sales.spec.ts` — 5 tests (create, list, deactivate)
- US9 T014: `settings.spec.ts` — 6 tests (settings + delivery zones)
- US10 T015: `inventory.spec.ts` — 4 tests (variant stock edit)
- US11 T016: `invoices.spec.ts` — 3 tests (smoke)

Phase 14 (Polish): T017–T020 — run full suite, audit skips, run /sp.test-status.

Research findings incorporated: `/order/[id]` (not `/order-confirmation`); OTP mocked via
`page.route()`; Safepay tested via webhook direct call + HMAC; no categories/customers admin
pages exist (removed from scope).

## Outcome

- ✅ Impact: Complete, immediately executable task list for the E2E test suite. Each task
  specifies exact file path and test structure detailed enough for an LLM to implement without
  additional context. 11 user stories organized as independent increments.
- 🧪 Tests: 20 implementation tasks → 53 individual test cases across 10 new spec files.
- 📁 Files: specs/001-e2e-test-suite/tasks.md created (new).
- 🔁 Next prompts: /sp.implement to begin writing spec files starting with T001 helpers,
  then T006 checkout-safepay.spec.ts (P1 MVP). Or run /sp.tasks to re-read and pick up.
- 🧠 Reflection: Research phase was critical — discovered 5 admin routes from spec don't
  exist (/admin/categories, /admin/customers, etc.), adjusted scope before task generation.
  OTP mock strategy (route intercept vs real DB) resolved cleanly. Webhook direct-call
  approach for Safepay is the right pattern for E2E without sandbox dependency.

## Evaluation notes (flywheel)

- Failure modes observed: check-prerequisites.sh only returned research.md in AVAILABLE_DOCS
  despite plan.md and spec.md existing — script may have a detection bug. Worked around by
  reading all three docs directly.
- Graders run and results (PASS/FAIL): n/a — tasks generation, not test run
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): begin T001 implementation (create helpers/)
  and T006 (checkout-safepay.spec.ts) to validate the task descriptions are detailed enough
