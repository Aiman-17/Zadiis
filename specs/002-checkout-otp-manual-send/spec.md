# Feature Specification: Checkout OTP Manual Send

**Feature Branch**: `002-checkout-otp-manual-send`
**Created**: 2026-07-03
**Status**: Draft
**Input**: User description: "checkout-otp-manual-send — Replace auto-send-on-blur OTP with a manual send-arrow button next to the checkout email field; extend the resend cooldown from 60s to 80s; document spam-folder guidance for the 80s wait; capture regression coverage for BUG-001 (OTP send error visibility, fixed) and BUG-002 (shop search debounce race, fixed) plus the NEXT_PUBLIC_APP_URL production email-link gap discovered during live verification (env config item, not a code bug) as known issues this feature's test plan must account for."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer explicitly sends the verification code (Priority: P1)

Today, the checkout page automatically sends a one-time verification code the instant a customer clicks away from the email field (on blur) — even if they're still typing, correcting a typo, or not ready to receive a code yet. Customers need control over when that email actually goes out.

Instead, a small send button (arrow icon) sits next to the email field. The code is only sent when the customer deliberately clicks it.

**Why this priority**: This is the core behavior change and the prerequisite for everything else in this feature — the 80-second cooldown and spam guidance only make sense once sending is a deliberate customer action.

**Independent Test**: Can be fully tested by entering an email at checkout, confirming no code is sent on blur, then clicking the send button and confirming exactly one code is sent. Delivers value on its own: customers stop receiving surprise emails for addresses they were still editing.

**Acceptance Scenarios**:

1. **Given** a customer is on the checkout page with an empty email field, **When** they type a valid email and click away from the field (blur), **Then** no verification code is sent and no code entry box appears.
2. **Given** a customer has typed a valid email into the checkout field, **When** they click the send button next to the field, **Then** a verification code is sent to that address and the code entry box appears.
3. **Given** a customer has typed an invalid or empty email, **When** they click the send button, **Then** no code is sent and the customer sees a clear message telling them to enter a valid email first.
4. **Given** a customer clicks the send button while a send is already in progress, **When** they click again before the first request completes, **Then** only one code is sent (no duplicate sends).

---

### User Story 2 - Customer waits an appropriate amount of time before requesting another code (Priority: P2)

After a code is sent, the customer must wait before they're allowed to request a new one. The wait is being extended from 60 to 80 seconds to give customers realistic time to notice the email hasn't arrived, check whether it landed in spam, and come back — without the resend option reappearing before they've had a fair chance to look.

**Why this priority**: Directly requested change; depends on User Story 1 existing (there must be a deliberate "send" action to attach a cooldown to).

**Independent Test**: Can be fully tested by sending a code and confirming the "resend" control stays disabled for 80 seconds, then becomes available.

**Acceptance Scenarios**:

1. **Given** a customer has just sent a verification code, **When** they look at the send/resend control, **Then** it shows a visible countdown starting at 80 seconds and is disabled.
2. **Given** the countdown is in progress, **When** fewer than 80 seconds have passed, **Then** clicking the disabled control has no effect and no second code is sent.
3. **Given** 80 seconds have elapsed since the last send, **When** the customer looks at the control, **Then** it is enabled again and a new code can be requested.

---

### User Story 3 - Customer who can't find the code checks their spam folder without losing checkout progress (Priority: P3)

Verification emails sometimes land in spam. A customer needs to be able to leave the checkout tab to check their spam folder and come back without losing their cart, their entered checkout details, or having to start the verification process over.

**Why this priority**: Supporting guidance and safety net for the primary flow — valuable, but the checkout already needs to survive a tab switch for other reasons, so this is confirmation/messaging rather than new mechanics.

**Independent Test**: Can be fully tested by sending a code, switching away from the tab (simulating checking another mail folder) for up to 80 seconds, returning, and confirming the checkout form, cart contents, and cooldown countdown are unchanged.

**Acceptance Scenarios**:

1. **Given** a customer has sent a verification code, **When** they see the waiting state, **Then** they see a visible hint telling them to check their spam or junk folder if the email doesn't arrive shortly.
2. **Given** a customer has sent a code and switches away from the checkout tab to check their email, **When** they return within 80 seconds, **Then** their cart, entered checkout details, and the remaining cooldown are exactly as they left them.
3. **Given** the 80-second wait has elapsed with no code entered, **When** the customer returns to the tab, **Then** they can request a new code via the now-enabled resend control.

---

### User Story 4 - Existing fixes remain in effect (Priority: P2)

Two defects were previously found and fixed in adjacent checkout/shop code: an OTP send-error message that was rendered but never visible to the customer (BUG-001), and a shop search race condition where clearing a search could leave a stale, empty product list (BUG-002). Because this feature rewrites the OTP send flow in the same file as BUG-001's fix, there is real risk of silently reintroducing it. A known but out-of-scope operational gap — production emails linking back to `localhost` instead of the live site when `NEXT_PUBLIC_APP_URL` isn't set correctly in the deployment environment — must also stay visible so it isn't lost track of.

**Why this priority**: Not new functionality, but this feature's test plan is the natural place to prove no regression occurred, since it touches the exact code BUG-001 lives in.

**Independent Test**: Re-run the existing regression checks for BUG-001 (a failed send shows a visible error message to the customer) and BUG-002 (clearing a shop search reliably restores the full product list) and confirm both still pass after this feature's changes. Separately, confirm (via documentation/checklist, not code) that the production deployment's site-URL configuration is checked before this feature ships.

**Acceptance Scenarios**:

1. **Given** a verification code send fails (e.g. rate limit), **When** the customer is looking at the checkout email field, **Then** they see a visible error message near the field — not silence.
2. **Given** a customer searches the shop and then clears the search, **When** the clear completes, **Then** the full, unfiltered product list reliably reappears.
3. **Given** this feature is ready to ship, **When** the release checklist is reviewed, **Then** it includes an explicit confirmation that the production environment's site URL is correctly configured (so email links point to the live site, not a local address).

---

### Edge Cases

- What happens if the customer changes the email address after a code was already sent for a different address? The cooldown and any in-progress code entry must reset — the code was issued for the old address and is no longer valid for the new one.
- What happens if the customer clicks the send button multiple times in rapid succession before the button visibly disables? Only one code may be sent per successful click; duplicate near-simultaneous clicks must not produce duplicate sends.
- What happens if the customer already verified their email, then edits it again? The verified state must clear and require a fresh manual send + verification for the new address (existing behavior, unaffected by this feature).
- What happens if the browser tab is closed and reopened (not just backgrounded) during the 80-second wait? Cart contents must persist per existing checkout behavior; the cooldown timer resets since it isn't tied to persisted state — the customer would see the send control available again and can request a new code.
- What happens if the send button is clicked with no cart items or on an otherwise invalid checkout state? Existing checkout validation continues to apply; this feature only changes when the send is triggered, not the surrounding validation rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The checkout page MUST NOT send a verification code automatically when the customer leaves the email field (on blur, focus loss, or similar passive triggers).
- **FR-002**: The checkout page MUST display a send control (button/icon) adjacent to the email field that, when activated, sends a verification code to the currently entered email address.
- **FR-003**: The system MUST reject a send attempt with a clear customer-facing message when the email field is empty or not a validly formatted address, without contacting the email service.
- **FR-004**: The system MUST prevent more than one code being sent per single customer-initiated send action, even under rapid repeated activation of the send control.
- **FR-005**: After a code is successfully sent, the system MUST disable the send control and display a visible countdown of 80 seconds before allowing another send.
- **FR-006**: The system MUST NOT allow a new code to be requested before the 80-second cooldown has elapsed following the most recent successful send.
- **FR-007**: The system MUST display guidance near the code-entry area advising the customer to check their spam or junk folder if the code has not arrived.
- **FR-008**: The system MUST preserve cart contents and all entered checkout field values if the customer navigates away from and back to the checkout tab during the cooldown period.
- **FR-009**: The system MUST reset the verification state (clear any prior code, reset the cooldown) if the customer changes the email address after a code has already been sent for a different address.
- **FR-010**: The system MUST continue to visibly display any error returned by a failed send attempt (e.g. server-side rate limiting) to the customer, regardless of which UI state the send control is in — this is the previously-fixed behavior (BUG-001) and must not regress.
- **FR-011**: The shop search MUST continue to reliably restore the full, unfiltered product list when a search is cleared — this is the previously-fixed behavior (BUG-002) and must not regress.
- **FR-012**: The order submission process MUST continue to require a successfully verified email before allowing the order to be placed (existing behavior, unaffected by this feature).
- **FR-013**: The release process for this feature MUST include an explicit check that the production deployment's site-URL configuration is correct, so that links inside order and verification emails point to the live site rather than a local development address.

### Key Entities

- **Verification Send Attempt**: A single customer-initiated request to send a one-time code to an email address; has a timestamp, the target email address, and a result (sent / rejected / failed).
- **Cooldown State**: The 80-second window following a successful send during which a new send cannot be initiated; tracked per checkout session, reset when the email address changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero verification codes are sent without an explicit customer click on the send control (down from today's automatic send on every blur event).
- **SC-002**: 100% of failed send attempts show a visible error message to the customer within the same page state, with no silent failures.
- **SC-003**: The resend control remains disabled for no less than 80 seconds and no more than 82 seconds after each successful send, across repeated testing.
- **SC-004**: Customers who leave and return to the checkout tab during the cooldown retain their cart and entered details 100% of the time.
- **SC-005**: The existing shop-search-clear and OTP-error-visibility regression checks continue to pass with zero failures after this feature ships.
