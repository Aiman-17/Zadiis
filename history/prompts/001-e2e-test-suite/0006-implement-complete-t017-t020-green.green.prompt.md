---
id: 0006
title: Implement complete T017-T020 green
stage: green
date: 2026-07-03
surface: agent
model: claude-fable-5
feature: 001-e2e-test-suite
branch: 001-e2e-test-suite
user: Aiman-17
command: /sp.implement (verification phase) + "chech the tests results" + "kill that task if you dont need"
labels: ["e2e", "playwright", "implement", "verification", "triage", "session-fork"]
links:
  spec: specs/001-e2e-test-suite/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - store/tests/store/home.spec.ts
 - store/tests/store/shop.spec.ts
 - store/tests/store/product.spec.ts
 - store/tests/store/cart.spec.ts
 - store/tests/admin/auth.spec.ts
 - store/tests/admin/orders.spec.ts
 - store/tests/admin/products.spec.ts
 - store/tests/admin/inventory.spec.ts
 - store/tests/admin/invoices.spec.ts
 - store/tests/admin/settings.spec.ts
 - specs/001-e2e-test-suite/tasks.md
 - history/prompts/general/069-e2e-test-coverage-status-report-final.general.prompt.md
tests:
 - store project full run: 65 passed / 6 conditional skips (7.2m, exit 0)
 - admin project full run: 58 passed / 6 conditional skips (3.5m, exit 0)
 - shop.spec.ts re-verify after wait fixes: 9 passed / 2 skips (47s)
---

## Prompt

conitnue / first see where we left off / dont you have 71 tasks tests result /
whats that window id / kill that task if you dont need
(continuation of /sp.implement verification tasks T017–T020 across session
restarts and a compaction)

## Response snapshot

Closed out T017–T020:

**T017 (store)** — first 71-test run: 48P/15F, but 12 failures were stale
(run raced the legacy-spec repairs; log line numbers matched pre-repair file
versions). Real failures triaged as 4 test bugs and fixed: footer brand is
ZADII'S not ZADIIS; product cart-count test never selected a color (color must
be picked FIRST — it resets size); shop clearing-search lost a debounce race
(fixed sleep → toHaveCount polling; parallel session filed BUG-002 for the
underlying debounce navigation race); city-delivery-charge locator tripped
strict mode (5 elements matched /Delivery|Shipping/). Clean full run: 65P/6S.

**Session-fork incident** — discovered a still-alive forked session
(c1a660c5, --fork-session --resume of this transcript, permission-mode auto,
PID 8044) editing the same specs and running tests in parallel; it wiped
test-results mid-triage. Identified via transcript mtimes + Win32_Process;
killed on user instruction. Rule: parallel writers to one repo → stop one.

**T019 audit** (playwright-test-reviewer agent) — skip hygiene clean (zero
permanent skips; 2 fixmes reference filed bugs). 15 unjustified waitForTimeout
calls found and ALL replaced with polling/URL waits. 4 CSS icon-class locators
(svg.lucide-*) + missing aria-label on cart remove button need app-code
consent — deferred to user.

**T018 (admin)** — first run 44P/14F; all 14 were legacy test bugs vs real UI:
auth guard appends ?from= (exact URL asserts), orders page has counted tabs
Active/Pending Shipment/Completed/Returns/Cancellations/Archived (no "All"),
product form uses badge toggle buttons "↑ Trending"/"✦ New Arrival" with a
conditional settings panel (not labeled checkboxes), Price label collides with
Cost Price (spinbutton role fix), invoice print link is target=_blank (popup
wait), #stock is a read-only div under variant tracking, Settings heading
needs exact:true. Toggle-save test flips trending twice → zero data mutation.
Clean run: 58P/6S.

**T020** — /sp.test-status: every implemented Stage-11/12 journey covered;
all ❌ map to deferred stories. Verdict ✅ Approve. PHR general/069.

## Outcome

- ✅ Impact: Feature 001-e2e-test-suite implementation COMPLETE — all 20 tasks [X]; both Playwright projects exit 0; 135 tests across 19 files.
- 🧪 Tests: store 65P/6S, admin 58P/6S, all skips conditional and documented; 18 legacy test bugs fixed this session (4 store + 14 admin).
- 📁 Files: 10 spec files repaired, tasks.md closed out, 2 PHRs.
- 🔁 Next prompts: /sp.git.commit_pr; user decisions on BUG-001 fix, BUG-002 fix, data-testid/aria-label app edits, ZADIIS-vs-ZADII'S brand inconsistency (emails vs site UI).
- 🧠 Reflection: Most "failures" were tests encoding an imagined UI. The reliable loop was: read the failure artifact → read the component source → assert what the app actually renders.

## Evaluation notes (flywheel)

- Failure modes observed: stale-run race (edits landing mid-run invalidate failure logs); forked session as invisible concurrent writer; .or() with .first() on each side still tripping strict mode.
- Graders run and results (PASS/FAIL): store PASS, admin PASS, shop re-verify PASS, skip audit PASS (conditional).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): add the 5 data-testid/aria-label app attributes to retire the last CSS-class locators.
