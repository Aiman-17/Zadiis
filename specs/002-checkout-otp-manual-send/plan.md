# Implementation Plan: Checkout OTP Manual Send

**Branch**: `002-checkout-otp-manual-send` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-checkout-otp-manual-send/spec.md`

## Summary

Replace the checkout page's automatic OTP send (fires on email-field blur) with an
explicit send button next to the field, extend the resend cooldown from 60s to
80s, add spam-folder guidance text, and add regression coverage for BUG-001 and
BUG-002 since this touches the same component those fixes live in. No new
backend surface — reuses the existing `POST /api/otp/send` / `POST /api/otp/verify`
routes unchanged; this is a client-side state-machine change to one component.

## Technical Context

**Language/Version**: TypeScript, Next.js 16.2.7 (App Router), React client component
**Primary Dependencies**: none new — reuses existing `fetch` calls to `/api/otp/send` and `/api/otp/verify`
**Storage**: N/A — no schema change; OTP state is in-memory React state on the checkout page, as today
**Testing**: Playwright (`@playwright/test`), `store` project, mocked OTP routes (existing `helpers/otp.ts`)
**Target Platform**: Web (mobile-first per constitution), same checkout page
**Project Type**: Web (single Next.js app, `store/`)
**Performance Goals**: No change to existing OTP round-trip latency; UI state transitions must feel instant (<100ms) since no network call is involved in enabling/disabling the send button
**Constraints**: Must not regress BUG-001 (OTP send error visibility) or BUG-002 (shop search debounce) — both fixed in the same session, BUG-002 in an unrelated file but re-verified per spec's own risk note
**Scale/Scope**: Single component (`store/src/app/(store)/checkout/page.tsx`) — no new files, no new routes, no new database entities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Customer Journey First** — PASS. This directly improves the checkout journey (removes surprise auto-sends); does not add friction — the customer already had to look at the email field, a click is a small, deliberate addition in exchange for control.
- **II. Mobile-First Development** — PASS, with an action item: the send-arrow button must be tested at 375px viewport (inline with the email input) as part of implementation, not deferred.
- **III. Lean MVP** — PASS. No new categories/features beyond what's specced; reuses all existing OTP infrastructure.
- **IV. Secure & Local Payments** — N/A, no payment code touched.
- **V. Performance for Conversions** — PASS. No new network calls added; cooldown timer is a client-side `setInterval`/countdown, no polling.
- **VI. Brand Consistency** — N/A, no new visual identity decisions; button reuses existing design tokens.
- **VII. End-to-End Testing Mandate** — GATE ITEM. Must add/update `store/tests/store/checkout-otp.spec.ts` covering: no auto-send on blur, manual send triggers exactly one code, 80s cooldown timing, spam-folder hint visible, BUG-001/BUG-002 regression checks still pass. No merge without this.

**Result**: PASS. No violations requiring Complexity Tracking justification.

## Project Structure

### Documentation (this feature)

```text
specs/002-checkout-otp-manual-send/
├── plan.md              # This file
├── spec.md              # Already complete
├── checklists/
│   └── requirements.md  # Already complete, all items pass
└── tasks.md             # Phase 2 output (/sp.tasks — next command)
```

No `research.md`, `data-model.md`, or `contracts/` — this feature introduces no
new technology choices, no new data entities, and no new API contracts. It
rewires existing client-side state and reuses the existing OTP API contract
unchanged (same request/response shape for `/api/otp/send` and `/api/otp/verify`).
Generating those files would be empty ceremony for a change this contained.

### Source Code (repository root)

```text
store/
├── src/app/(store)/checkout/page.tsx   # MODIFIED — otpState machine, send trigger, cooldown, spam hint
└── tests/store/checkout-otp.spec.ts    # MODIFIED — new/updated test cases for manual send + 80s cooldown
```

**Structure Decision**: Single-file client component change plus its existing
Playwright spec file. No new directories, no new routes, no new components
beyond markup already inside `checkout/page.tsx`.

## Complexity Tracking

*No Constitution Check violations — table intentionally omitted.*

## Release Checklist (FR-013)

- [ ] **Production `NEXT_PUBLIC_APP_URL` is set to the live site domain** (e.g. `https://zadiis.com.pk`), not `localhost`, in the production deployment's environment variables. Discovered during live email verification (PHR `history/prompts/001-e2e-test-suite/0010-...`): local `.env.local` correctly points at `localhost:3000` for dev, but this must be independently confirmed for production before this feature — or any feature that emails product/order links — ships. Not a code defect; an environment configuration item only the account owner can verify (Vercel dashboard or equivalent).
