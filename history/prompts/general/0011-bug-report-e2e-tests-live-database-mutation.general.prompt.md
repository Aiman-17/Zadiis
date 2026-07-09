---
id: 0011
title: Bug report E2E tests live database mutation
stage: general
date: 2026-07-09
surface: agent
model: claude-sonnet-5
feature: 006-conversion-admin-enhancements
branch: 006-conversion-admin-enhancements
user: Aiman-17
command: /sp.bug-report
labels: ["bug-report", "e2e", "test-isolation", "data-integrity"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - store/tests/admin/store-policy-toggles.spec.ts
 - store/tests/admin/notifications.spec.ts
tests:
 - store-policy-toggles.spec.ts — 4/4 passing after afterEach cleanup fix
 - notifications.spec.ts — 8/8 passing after try/finally archive-restore fix
---

## Prompt

> File a bug report for the open, unresolved finding from today's quality review: admin E2E tests mutate live/production Supabase settings data with no test isolation, and several test files only restore state at the very end of the test body... [full text in conversation]

Followed by: "yes" (confirming the notifications.spec.ts fix should be applied now, not just queued).

## Response snapshot

Filed a full 15-field bug report (High/P2) after first auditing all 7 admin spec files with toggle/mutation patterns, rather than assuming "several files" were affected as originally described. Concrete audit result: only 2 files genuinely at risk out of 7 candidates — `merchandising-scoring.spec.ts` was already safe (proper `try/finally`), `products.spec.ts`/`payments.spec.ts`/`slow-mover-consistency.spec.ts`/`dark-mode.spec.ts` don't have the risk pattern at all (read-only, net-zero-within-one-test, or client-only localStorage). Confirmed one further live instance in `notifications.spec.ts:61` (archives a real notification, no restore).

Applied the fix on "yes": wrapped the archive assertion in `try/finally`, capturing the archived notification's real ID via `page.waitForRequest` on the outgoing PUT (rather than assuming test data), restoring it in `finally` regardless of assertion outcome. Re-ran — 8/8 passing.

Verified the fix's actual live-database effect, not just the test's green checkmark: queried `admin_notifications` post-run and found **one notification still archived** — a `return_request` type, timestamped during today's session, confirming it was leaked by an *earlier* (pre-fix) run of this same test, not the fixed run (which passed cleanly with proper archive→assert→restore). Restored it directly. This is a second, real confirmed instance of exactly the bug being reported — found via verification, not assumed away by a passing test.

## Outcome

- ✅ Impact: Both confirmed at-risk admin spec files hardened against leaving live data mutated on test failure. One real leaked notification (a genuine customer return request, temporarily hidden from the admin's active view) restored.
- 🧪 Tests: store-policy-toggles.spec.ts 4/4, notifications.spec.ts 8/8 — both re-verified after their respective fixes, not just typechecked.
- 📁 Files: store/tests/admin/store-policy-toggles.spec.ts, store/tests/admin/notifications.spec.ts.
- 🔁 Next prompts: the report's longer-term recommendation (an isolated Supabase project/schema for E2E runs) remains open — not attempted this session, flagged for a future dedicated pass.
- 🧠 Reflection: verifying "did the fix actually work" by querying the live table directly — rather than trusting the test's own pass/fail signal — is what caught the second leaked notification. A green test after a fix proves the fix's *logic* works; it doesn't prove *prior* damage was cleaned up. Both checks are necessary.

## Evaluation notes (flywheel)

- Failure modes observed: an initial bug description assumed a broader "several files" scope than was actually true — grounding it in a real audit (7 files checked, 2 confirmed) prevented over-scoping the fix.
- Graders run and results (PASS/FAIL): both re-run spec files — PASS; live-data restoration — confirmed via direct query, PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): provision an isolated Supabase project for E2E runs, closing this class of bug structurally rather than per-file.
