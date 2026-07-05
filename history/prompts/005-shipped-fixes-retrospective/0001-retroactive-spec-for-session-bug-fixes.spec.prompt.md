---
id: 0001
title: Retroactive spec for session bug fixes
stage: spec
date: 2026-07-05
surface: agent
model: claude-sonnet-5
feature: 005-shipped-fixes-retrospective
branch: 005-shipped-fixes-retrospective
user: Aiman-17
command: /sp.reverse-engineer
labels: ["retrospective", "reliability", "sale", "invoice", "cancel-return", "caching"]
links:
  spec: specs/005-shipped-fixes-retrospective/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/005-shipped-fixes-retrospective/spec.md
 - specs/005-shipped-fixes-retrospective/plan.md
 - specs/005-shipped-fixes-retrospective/tasks.md
 - specs/005-shipped-fixes-retrospective/intelligence-object.md
tests:
 - all requirements/tasks in this retrospective trace to live verification already performed and recorded in their source PHRs (072-084); no new tests run as part of documentation-only work
---

## Prompt

> add this in specs we will cahnge this soon base on merchant real tracking endpoint. (so the automatically render that time)All things we change eralier add in specs or create artifacts so we can analyze with sp analyze command. [... 5-item roadmap request, handled separately as specs/004-post-launch-roadmap ...]

(clarifying question and answer:) > How do you want this session's already-shipped bug fixes documented for /sp.analyze? = "1 and 2" (keep the existing PHRs as the record, AND generate one retroactive spec via /sp.reverse-engineer)

## Response snapshot

Adapted the `/sp.reverse-engineer` skill (designed for archaeological analysis of an unfamiliar legacy codebase over several hours) to a much narrower, already-understood situation: retroactively documenting ~12 bug fixes from this session's own PHRs (072-084) as one testable spec/plan/tasks/intelligence artifact set, rather than running the skill's generic multi-hour discovery commands against a codebase already fully known.

Created branch `005-shipped-fixes-retrospective` and four artifacts:

- **spec.md** — organized the 12 fixes into 5 User Stories by theme (payment/invoice/notification identity; sale expiry and cross-sale contamination; cancel/return/exchange policy; merchandising/dashboard accuracy and sale filter; product detail display), each with FR-numbered testable guarantees ("MUST") rather than bug-history narration, per the user's explicit instruction.
- **plan.md** — the actual technical approach taken (no new dependencies, one new DB column, reused existing cascade/email infrastructure throughout), with a real file-by-file project structure map.
- **tasks.md** — all tasks marked complete, each citing its source PHR, organized by user story with a dedicated Phase 1 for the two cross-cutting bug patterns that blocked trusting the rest.
- **intelligence-object.md** — the genuinely new synthesis: the two recurring bug patterns (unawaited Supabase query builder writes that silently never execute; server-rendered admin pages missing `force-dynamic` that freeze on a year-long build-time cache) written up as Persona+Questions+Principle entries with a grep-based detection heuristic for future audits, plus the cross-cutting observation that neither pattern was catchable by typecheck/build — only live verification against a real production build found either one.

## Outcome

- ✅ Impact: twelve previously scattered PHR-only fixes now have one `/sp.analyze`-able spec/plan/tasks triad, plus a reusable intelligence document capturing the two bug patterns so they're checked-for rather than rediscovered next time.
- 🧪 Tests: none new — every claim in the spec traces to live verification already performed and recorded in PHRs 072-084.
- 📁 Files: specs/005-shipped-fixes-retrospective/{spec.md,plan.md,tasks.md,intelligence-object.md}
- 🔁 Next prompts: run `/sp.analyze` across specs 001-005 for cross-artifact consistency; consider a dedicated grep-based lint rule for `void supabase` in CI, per the intelligence artifact's detection heuristic.
- 🧠 Reflection: the reverse-engineer skill's template is built for discovering an unknown system — applying it literally here would have wasted enormous effort re-deriving things already known first-hand. Recognizing when to adapt a skill's *intent* (produce spec/plan/tasks/intelligence) versus follow its *literal procedure* (hours of grep-based reconnaissance) was itself the main judgment call in this task.

## Evaluation notes (flywheel)

- Failure modes observed: none — this was a documentation/synthesis task, not a code change.
- Graders run and results (PASS/FAIL): n/a (no code changed)
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): consider adding an automated grep-based CI check for `void supabase` per the intelligence artifact's detection heuristic, so Pattern 1 can't reappear silently.
