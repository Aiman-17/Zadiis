# Tasks: Checkout OTP Manual Send

**Input**: Design documents from `specs/002-checkout-otp-manual-send/`
**Prerequisites**: plan.md, spec.md

**Tests**: Included — the constitution's E2E Testing Mandate (Principle VII) requires
Playwright coverage for every critical journey before merge, and this spec's own
"Independent Test" criteria for every user story describe test scenarios directly.

**Organization**: Tasks are grouped by user story (US1–US4) per spec.md priorities.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files/regions, no dependency on an incomplete task)
- **[Story]**: Maps to spec.md's US1–US4
- All work is confined to two files: `store/src/app/(store)/checkout/page.tsx` and
  `store/tests/store/checkout-otp.spec.ts` (plus one unrelated re-verification of
  `store/tests/store/shop.spec.ts` for US4's BUG-002 check) — most tasks touch the
  same file and are therefore sequential, not parallel, despite the template's
  general guidance favoring [P].

## Phase 1: Setup

- [X] T001 Confirm `store/` production build is current and server is running per `.claude/skills/e2e-run` — DONE: rebuilt (`npm run build`), restarted, `curl localhost:3000` returned 200

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T002 Removed the `onBlur`-triggered call to `sendOtp()` on the email field in `checkout/page.tsx` — `handleEmailBlur` is now validation-only

**Checkpoint**: reached — auto-send removed, manual trigger added in the same pass (T006) so OTP was never left non-functional in a shipped state.

---

## Phase 3: User Story 1 - Customer explicitly sends the verification code (Priority: P1) 🎯 MVP

### Tests for User Story 1

- [X] T003 [US1] `checkout-otp.spec.ts`: blur-alone-sends-nothing + click-sends-exactly-one-code tests added
- [X] T004 [US1] `checkout-otp.spec.ts`: empty/invalid email → validation message, zero sends — test added
- [X] T005 [US1] `checkout-otp.spec.ts`: rapid repeated clicks → exactly one `/api/otp/send` call — test added

### Implementation for User Story 1

- [X] T006 [US1] Send-arrow icon button added inside the email field, wired to `handleSendClick()` → `sendOtp(form.email)`
- [X] T007 [US1] Button `disabled={otpState === 'sending'}`; `sendOtp()` also guards `if (otpState === 'sending') return` (defense in depth)
- [X] T008 [US1] `handleSendClick()` validates email first via existing `validateEmail()`, sets `fieldErrors`, and returns without a network call when invalid
- [X] T009 [US1] `npx playwright test checkout-otp.spec.ts --project=store` — 13/13 passed

**Checkpoint**: reached — MVP shippable.

---

## Phase 4: User Story 2 - 80-second cooldown (Priority: P2)

### Tests for User Story 2

- [X] T010 [US2] `checkout-otp.spec.ts` resend-cooldown test updated to assert 80s

### Implementation for User Story 2

- [X] T011 [US2] `RESEND_COOLDOWN_SECONDS = 80` constant added; `setResendCooldown(60)` → `setResendCooldown(RESEND_COOLDOWN_SECONDS)`
- [X] T012 [US2] Confirmed cooldown already starts only on a *successful* send (post-`data.error` check) — no trigger-point change needed, only the duration
- [X] T013 [US2] Re-ran `checkout-otp.spec.ts` — passed (included in the 13/13 above)

**Checkpoint**: reached.

---

## Phase 5: User Story 3 - Spam-folder guidance + tab-switch persistence (Priority: P3)

### Tests for User Story 3

- [X] T014 [US3] `checkout-otp.spec.ts`: spam/junk-folder guidance visibility test added
- [X] T015 [US3] `checkout-otp.spec.ts`: tab-switch-and-return preserves cart/form/cooldown test added

### Implementation for User Story 3

- [X] T016 [US3] Added "Don't see it? Check your spam or junk folder." line under the code-sent message, visible whenever `otpState` is `'sent'` or `'verifying'`
- [X] T017 [US3] Re-ran `checkout-otp.spec.ts` — T014/T015 passed with zero code changes needed for persistence (existing cart/localStorage + React state already covered it, as anticipated)

**Checkpoint**: reached — all three functional stories work together (verified: 13/13 in one run).

---

## Phase 6: User Story 4 - Existing fixes remain in effect (Priority: P2)

### Tests for User Story 4

- [X] T018 [US4] Full `checkout-otp.spec.ts` run — BUG-001 regression test ("server rate-limit error ... is surfaced") passed
- [X] T019 [US4] Full `store` project run (77 tests) — BUG-002 regression test (`shop.spec.ts` "clearing search restores full list") passed; **71 passed / 6 skipped, zero failures across the entire store project**, confirming no cross-file regression from the shared `helpers/otp.ts` / `helpers/cart.ts` changes

### Implementation for User Story 4

- [X] T020 [US4] Release-checklist note added to `plan.md` (`## Release Checklist (FR-013)`) — production `NEXT_PUBLIC_APP_URL` must be confirmed before ship; left as an open checkbox for the account owner, not auto-resolved

**Checkpoint**: reached — no regressions; operational gap stays tracked, not silently dropped.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T021 Mobile-viewport check (375px) — screenshot-verified: send button and OTP box both fit with no overflow; spam-folder hint renders correctly
- [X] T022 Full `store` Playwright project run — 71 passed / 6 skipped (see T019, same run)
- [X] T023 Checklist reconciliation — not needed; implementation matched spec.md's acceptance criteria as written, no scope drift

---

## Dependencies & Execution Order

*(unchanged from planning — see git history if needed; all phases executed in the documented order)*

## Notes

All 23 tasks complete. Total new/changed test coverage: `checkout-otp.spec.ts` grew
from 7 tests to 13 (6 new: no-auto-send, click-sends-one, invalid-email-guard,
duplicate-click-guard, email-change-mid-send reset, spam-hint visibility,
tab-switch persistence — one more than originally scoped, since FR-009's
"code already sent, then email changed" case needed its own test distinct from
the pre-existing "already verified, then email changed" one). Full store
project: 71/77 passed, 6 conditional skips, zero failures.
