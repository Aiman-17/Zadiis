---
id: 055
title: Debugging Skills Design Brainstorm
stage: general
date: 2026-06-29
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /superpowers:writing-skills → /superpowers:brainstorming
labels: ["skills","debugging","brainstorming","supabase","webhooks","nextjs","ui-logic"]
links:
  spec: docs/superpowers/specs/2026-06-29-debugging-skills-design.md
  ticket: null
  adr: null
  pr: null
files:
  - docs/superpowers/specs/2026-06-29-debugging-skills-design.md
tests:
  - null
---

## Prompt

Based on our complete project now we move forward to start debugging issues and fixes. Which skills we need to create and write. Do 1 2 and 3 then give details about 4.

## Response snapshot

Explored 54+ PHR cycles to identify 4 recurring bug layers. Ran full brainstorming process: proposed 3 structural approaches (4 focused skills / triage+deep-dive / unified), recommended Approach A (4 focused layer skills). Designed all 4 skills with trigger conditions, core pattern tables, real incident examples from git history, and a TDD creation process. User approved design. Wrote spec to docs/superpowers/specs/2026-06-29-debugging-skills-design.md.

**Skills designed:**
1. `ecom:supabase-debugging` — missing select fields, RLS, COD count bugs, .single() vs .maybeSingle()
2. `ecom:webhook-debugging` — log-before-parse, idempotency, state machine, local testing
3. `ecom:nextjs-app-router-debugging` — hydration, use client boundary, polling guard, localStorage on server
4. `ecom:ui-logic-debugging` — filter chain trace, sale price source of truth, cart stale state, badge boundaries

## Outcome

- ✅ Impact: Complete design spec for 4 debugging skills tailored to ZADII'S stack and incident history
- 🧪 Tests: TDD cycle defined per skill — RED/GREEN/REFACTOR with subagent pressure scenarios
- 📁 Files: docs/superpowers/specs/2026-06-29-debugging-skills-design.md
- 🔁 Next prompts: Review spec → /sp.plan to write implementation plan → write and test each skill
- 🧠 Reflection: Grounding skill designs in real git incidents (is_sale, 401 badge poll, unstitched+trending combo) makes each pattern concrete and trustworthy

## Evaluation notes (flywheel)

- Failure modes observed: none — user approved design on first pass
- Graders run and results (PASS/FAIL): null
- Prompt variant (if applicable): null
- Next experiment: run RED baseline subagent scenario for skill 1 before writing SKILL.md
