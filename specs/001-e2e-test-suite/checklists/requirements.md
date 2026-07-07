# Requirements Quality Checklist: E2E Test Suite — ZADIIS Store

**Purpose**: Unit tests for the requirements writing in `spec.md` — validates completeness, clarity, consistency, and measurability of the E2E test suite spec before `/sp.implement` begins. This does NOT verify test implementation; it verifies the spec itself is well-written.
**Created**: 2026-07-02
**Feature**: `specs/001-e2e-test-suite/spec.md`
**Depth**: Standard | **Audience**: Quality Guardian / reviewer, pre-implementation gate

---

## Requirement Completeness

- [ ] CHK001 Is the minimum Supabase test dataset (how many products, orders, in which statuses) explicitly specified, given multiple tests are data-dependent? [Gap, Spec §3 Assumptions]
- [ ] CHK002 Are requirements defined for what the OTP tests validate when both send and verify endpoints are mocked — i.e., is the boundary between "UI flow tested" and "API behavior untested" documented in the spec (not just research.md)? [Gap, Spec §FR-013–016]
- [ ] CHK003 Are requirements specified for cleaning up orders created by tests (Story 3 places real COD orders into the shared database)? [Gap, Spec §Constraints]
- [ ] CHK004 Is the mechanism for testing OTP expiry (>10 min) in an E2E context defined, or is BR-001/SEC-002 delegated to another test level? [Gap, Spec §BR-001, §SEC-002]
- [ ] CHK005 Are requirements defined for the admin invoices journey, which appears in plan.md/tasks.md (T016) but has no story or FR in spec.md? [Gap, Traceability]
- [ ] CHK006 Are the shared helper utilities (cart, otp, orders — tasks T001–T003) covered by any FR in the spec, or do they exist only in plan/tasks? [Gap, Traceability]

## Requirement Clarity

- [ ] CHK007 Is "clean local environment" (Success Metrics) defined — which env vars present, which data seeded, which services running? [Clarity, Spec §2 Success Metrics]
- [ ] CHK008 Is the flakiness rate target "< 5%" defined with a measurement method (over how many runs, measured how)? [Measurability, Spec §7 NFR]
- [ ] CHK009 Are the runtime targets (< 8 min suite) tied to specified hardware/conditions, or could they pass on one machine and fail on another? [Clarity, Spec §7 NFR]
- [ ] CHK010 Is "Must pass on Windows and Unix" actionable given CI/CD is explicitly out of scope — who runs the Unix verification and when? [Clarity, Conflict, Spec §7 NFR vs §2 Out of Scope]
- [ ] CHK011 Does FR-004's phrase "required data absent" define how each test detects absence (empty state selector, API count, etc.)? [Clarity, Spec §FR-004]
- [ ] CHK012 Is "sandbox/mock at boundary only" (Constraints) precise enough to adjudicate whether mocking `/api/payments/tracker` responses (Story 1 test 3) complies? [Clarity, Spec §3 Constraints]

## Requirement Consistency

- [x] CHK013 Do FR-037 (Categories) and FR-038 (Customers) conflict with Stories 9/10 now being marked ⏸ DEFERRED? [Conflict, Spec §6 FR-037/038 vs §5 Stories 9/10] — ✅ Fixed 2026-07-02: both FRs now carry ⏸ DEFERRED marker
- [x] CHK014 Does AC-003 ("✅ for ALL Stage 11 and Stage 12 journeys") conflict with the deferral decision? [Conflict, Spec §29 AC-003 vs Clarifications] — ✅ Fixed 2026-07-02: AC-003 now scoped to journeys whose pages exist; deferred journeys report ⏸
- [ ] CHK015 Does the Permissions Matrix row "Order tracking (by #)" still use the pre-clarification terminology and route model, inconsistent with the corrected `/order/[id]` UUID route? [Consistency, Spec §12 vs §5 Story 3]
- [ ] CHK016 Does FR-040 ("delivery charge updates reflected at checkout") still promise a checkout-side assertion that the merged Story 12/13 no longer includes (settings-side save only)? [Conflict, Spec §FR-040 vs §5 Story 12/13]
- [ ] CHK017 Does FR-011 ("order confirmation after sandbox payment success") match the plan's actual approach (direct webhook call, no full sandbox round-trip)? [Consistency, Spec §FR-011 vs plan.md Phase A1]
- [ ] CHK018 Do FR-017/FR-018 (order confirmation) still map to a story file named consistently across spec (order-confirmation.spec.ts), plan, and tasks? [Consistency, Traceability]
- [ ] CHK019 Are the Estimated Complexity ("20 missing journeys") and Scope ("10 active + 5 deferred stories") figures reconciled after Stories 14/15 were added? [Consistency, Spec §1 vs §2 Scope]
- [ ] CHK020 Is the state machine section (§11 — order/return/payment transitions) referenced by any FR or story, or is it orphaned scope the tests never exercise? [Traceability, Spec §11]

## Acceptance Criteria Quality

- [x] CHK021 Are AC-001/AC-002 npm scripts (`test:e2e:store`, `test:e2e:admin`) verified to exist in `store/package.json`? [Measurability, Spec §29 AC-001/002] — ✅ Verified 2026-07-02: both scripts exist, plus `test:e2e` and `test:e2e:ui`
- [ ] CHK022 Is AC-005 ("≥1 happy-path and ≥1 negative-path per spec file") objectively checkable against a stated definition of "negative-path"? [Measurability, Spec §29 AC-005]
- [ ] CHK023 Is AC-006's deadline ("before first ad campaign") tied to a date or trigger event that a reviewer can verify? [Measurability, Spec §29 AC-006]
- [x] CHK024 Does the Definition of Done item "All FR-001 through FR-041 satisfied" account for FRs belonging to deferred stories (FR-037, FR-038)? [Conflict, Spec §30 vs deferred stories] — ✅ Fixed 2026-07-02: DoD now says "All active FR" and excludes FR-037/038

## Scenario & Edge Case Coverage

- [ ] CHK025 Is the edge case "Concurrent OTP submissions → only first accepted" mapped to any FR or story test — and is it testable at the E2E level at all? [Coverage, Gap, Spec §5 Edge Cases]
- [ ] CHK026 Is the edge case "Inventory set to 0 → Sold Out on store front" assigned to a spec file (inventory.spec.ts tests admin side only)? [Coverage, Gap, Spec §5 Edge Cases]
- [ ] CHK027 Are BR-003 (order data leak) and BR-008 (duplicate webhook idempotency) each traceable to a specific acceptance scenario in a story? [Traceability, Spec §9 BR-003/008]
- [ ] CHK028 Is the return-window rule (BR-004, 7 days) testable without time manipulation, and does any story scenario actually exercise the "outside window" rejection path with defined test data? [Coverage, Spec §BR-004 vs Story 4]
- [ ] CHK029 Are recovery/rollback requirements defined for tests that mutate admin state (settings save, stock change, sale deactivation) — i.e., must tests restore original values? [Gap, Recovery, plan.md Risk table vs spec]

## Dependencies & Assumptions

- [ ] CHK030 Is the assumption "Safepay sandbox credentials available in `.env.local`" reconciled with the skip-if-absent strategy — is the suite considered DONE if Safepay tests never ran? [Assumption, Conflict, Spec §3 vs §29 AC-001]
- [ ] CHK031 Is the `ADMIN_PASSWORD` dependency's failure mode specified in the spec (global.setup throws) rather than only in the risks table? [Dependency, Spec §1 vs §27]
- [ ] CHK032 Are the deferred stories' re-activation triggers explicit and consistent (Story 14 names `/sp.specify courier-tracking`; Stories 4b/4c/9/10 name no trigger)? [Consistency, Clarity, Spec §5 deferred stories]

---

## Notes

- Check items off as resolved: `[x]` — resolve by editing `spec.md`, not by arguing the item away
- Items marked [Conflict] are known drift from the 2026-07-02 clarification session and should be fixed before `/sp.implement`
- Highest-priority fixes: CHK013, CHK014, CHK024 (deferred-story drift breaks the Definition of Done)
