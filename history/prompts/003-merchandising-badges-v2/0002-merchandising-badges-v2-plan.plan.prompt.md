---
id: 0002
title: Merchandising badges v2 plan
stage: plan
date: 2026-07-03
surface: agent
model: claude-sonnet-5
feature: 003-merchandising-badges-v2
branch: 003-merchandising-badges-v2
user: Aiman-17
command: /sp.plan
labels: ["plan", "merchandising", "research", "data-model"]
links:
  spec: specs/003-merchandising-badges-v2/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-merchandising-badges-v2/plan.md
 - specs/003-merchandising-badges-v2/research.md
 - specs/003-merchandising-badges-v2/data-model.md
 - specs/003-merchandising-badges-v2/quickstart.md
 - CLAUDE.md
tests:
 - none (plan stage)
---

## Prompt

/sp.plan (no arguments)

## Response snapshot

Read the actual admin product PUT handler (store/src/app/api/admin/products/route.ts:43-64)
before writing research.md — found it already reads a product's old
stock_quantity before every update (currently used only to trigger back-in-
stock waitlist emails on a 0→positive transition). Reused this exact hook
point for restock-event detection rather than inventing a new one: broadened
the condition to any stock increase, insert a stock_movements row with
reason='restock' (a value the schema has defined since stock-ledger.sql but
no code has ever written).

Wrote research.md with 7 concrete decisions, each with rationale and
alternatives-considered, directly resolving the "exact numeric tuning" the
spec's Assumptions deliberately deferred: category-relative normalization
via score-divided-by-category-max (not full per-category leaderboards, which
stays out of scope per FR-016), minimum sales floor of 2 units (verified
against live data — excludes the exact 1-unit-sellout the audit found while
including the real 3-unit best seller), display cap of 4 (matches existing
homepage section size, no layout change forced). Wrote data-model.md: 3 new
columns on products (is_featured + start/end, mirroring is_new_arrival's
already-proven pattern), no new tables, stock_movements gets its first actual
restock writer. Skipped contracts/ — no new external API surface, only an
internal shared lib module and changes to what the existing admin products
endpoint accepts/returns. Constitution Check passed all 7 principles, with
Principle III (Lean MVP) noted as the discipline that directly shaped this
plan's scope (explicitly smaller than two external proposals reviewed
earlier in the conversation). Ran update-agent-context.sh — appended a small
Active Technologies section to CLAUDE.md, verified via diff before accepting.

## Outcome

- ✅ Impact: Feature 003 is plan-ready with every "revisit at planning stage" item from spec.md's Assumptions now given a concrete, justified value.
- 🧪 Tests: none — plan stage.
- 📁 Files: plan.md, research.md, data-model.md, quickstart.md, CLAUDE.md (small append).
- 🔁 Next prompts: /sp.tasks, then implementation.
- 🧠 Reflection: reading the actual admin route before writing the restock-detection research entry (rather than assuming a new column/table was needed) found a cheaper implementation path than either external proposal discussed — the schema already half-supports this.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): Constitution Check — PASS (0 violations); agent-context script diff reviewed before trusting its output.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): none.
