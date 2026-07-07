---
id: "002"
title: E2E Testing Principle Added to Constitution
stage: constitution
date: 2026-07-01
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: sp.constitution
labels: ["e2e-testing","playwright","constitution","sdd","v1.1.0"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - .specify/memory/constitution.md
tests:
  - none yet — E2E spec to follow
---

## Prompt

now ne move to e2e testing using spec driven ssd workflow start from constitution

## Response snapshot

Updated constitution from v1.0.0 → v1.1.0 (MINOR) by adding:
- Principle VII: End-to-End Testing Mandate — Playwright E2E tests required for
  every critical user journey before merge; two surfaces (store + admin);
  real server, no mocking happy paths, no prod data.
- Development Workflow step 7: E2E gate before merge.
- Technology Constraints: added Playwright entry.

Playwright is already installed (`@playwright/test ^1.61.1`) with `playwright.config.ts`
defining `store` and `admin` projects. No test files exist yet (`tests/` is empty).

## Outcome

- ✅ Impact: Constitution now mandates E2E coverage as a shipping gate; SDD workflow
  for E2E feature can proceed (spec → plan → tasks → implement).
- 🧪 Tests: No tests yet — this is the constitution step; tests are the output of the workflow.
- 📁 Files: .specify/memory/constitution.md updated.
- 🔁 Next prompts: User to provide constitution prompt; then sp.specify for E2E feature.
- 🧠 Reflection: Playwright infra exists but zero tests written — the SDD workflow
  will scaffold the full test suite systematically.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): proceed to /sp.specify for e2e-testing feature
