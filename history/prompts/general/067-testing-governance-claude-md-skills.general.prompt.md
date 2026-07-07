---
id: "067"
title: Testing Governance CLAUDE.md and Skills Created
stage: general
date: 2026-07-01
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: sp.constitution
labels: ["testing","quality-guardian","playwright","claude-md","skills","governance"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/tests/CLAUDE.md
  - .claude/commands/sp.quality-review.md
  - .claude/commands/sp.bug-report.md
  - .claude/commands/sp.test-status.md
tests:
  - none — governance files only
---

## Prompt

yes but tell me can you write a separate claude.md for governance base on this constitution
and testings. Also which agents skills and plugins useful and need to create and add

yes all three

## Response snapshot

Created 4 files to support the E2E testing SDD workflow:

1. `store/tests/CLAUDE.md` — Testing governance file loaded automatically when working
   in the tests directory. Contains: Quality Guardian role, Playwright test structure,
   locator conventions, test data patterns, assertion timeouts, Stage coverage checklist,
   bug reporting instructions, final verdict criteria, command reference, and MCP tools.

2. `.claude/commands/sp.quality-review.md` — 19-stage Quality Guardian review command.
   Covers all stages from Requirement Analysis through SEO. Produces all 23 review
   output sections and concludes with a Final Verdict (Reject / Conditionally Approve /
   Approve / Enterprise Grade). Has handoffs to sp.bug-report and sp.test-status.

3. `.claude/commands/sp.bug-report.md` — Structured 15-field bug report command.
   Includes severity/priority guides, root cause requirement, business + technical
   impact fields. Asks user to generate a regression test after filing.

4. `.claude/commands/sp.test-status.md` — Coverage audit command. Reads all spec files,
   maps tests to Stage 11 (Admin) and Stage 12 (Customer) journey checklists, reports
   ✅ Covered / ⏭ Skipped / ❌ Missing per journey, and gives a Quality Guardian verdict
   on overall suite health.

Also assessed existing agents/plugins: Playwright MCP and Supabase MCP are already
installed and directly useful for debugging tests live. feature-dev:code-reviewer
agent available for reviewing test code.

## Outcome

- ✅ Impact: Full testing governance infrastructure in place. Three slash commands
  available immediately: /sp.quality-review, /sp.bug-report, /sp.test-status.
- 🧪 Tests: No tests — these are command/governance files.
- 📁 Files: 4 new files created.
- 🔁 Next prompts: /sp.test-status to see current coverage; then /sp.specify for
  E2E testing feature to begin the SDD workflow.
- 🧠 Reflection: The sp.* command format (markdown in .claude/commands/) is the right
  pattern for project-specific workflow skills — avoids global plugin pollution while
  staying discoverable via the Skill tool.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): run /sp.test-status to baseline coverage
