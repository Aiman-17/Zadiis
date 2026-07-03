---
description: File a structured 15-field bug report when a test fails or a defect is discovered.
handoffs:
  - label: Quality Review
    agent: sp.quality-review
    prompt: Run full quality review on the affected feature
  - label: Check Test Coverage
    agent: sp.test-status
    prompt: Show test coverage after bug is filed
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).
If empty, ask: "Describe the bug: what happened, what you expected, and where it occurred."

---

## Your Role

You are filing a structured bug report following the Quality Guardian Bug Reporting
Standard. Every field is mandatory. Vague reports ("it doesn't work") are not acceptable.
Every bug MUST include a root cause — not a symptom.

---

## Bug Report Template

Produce a complete report using ALL 15 fields below. No field may be left blank
or marked "N/A" without a written justification.

---

### Bug Report

**Title:** `[component] — [symptom in imperative form]`
*(e.g., "Checkout — COD order fails silently when city is not selected")*

| Field | Value |
|---|---|
| **Severity** | Critical / High / Medium / Low |
| **Priority** | P1 / P2 / P3 / P4 |
| **Category** | Functional / UI / UX / Security / Performance / Integration / Data / Regression |
| **Component** | e.g., Checkout, Admin Orders, Product Page, Auth, Payment |
| **Environment** | Local dev / Staging / Production — browser + OS |

---

**Preconditions:**
> State required setup before reproducing (e.g., "Cart contains 1 item", "Admin logged in")

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Result:**
> What should happen

**Actual Result:**
> What actually happens (exact error message, screenshot reference, or log output)

---

**Root Cause:**
> The specific code path, data condition, or configuration that causes this behavior.
> Must be a cause, not a symptom. Example: "The city field defaults to `undefined`
> and the delivery charge API returns 400 when city is undefined — the error is
> swallowed in the catch block at checkout.tsx:142."

**Business Impact:**
> Revenue / customer trust / operational effect. Example: "Orders placed without
> a city cannot be fulfilled — estimated PKR X lost per day during peak hours."

**Technical Impact:**
> Effect on system integrity, data, or other components.

**Recommended Fix:**
> Specific, actionable fix with file path and line reference where known.

**Regression Risk:**
> Which other areas could be affected by the fix. List test files to re-run.

---

## Severity Guide

| Severity | Meaning |
|---|---|
| **Critical** | Production down, data loss, security breach, checkout broken |
| **High** | Key feature broken for subset of users, payment errors, auth failures |
| **Medium** | Feature degraded, workaround exists, UX significantly impaired |
| **Low** | Cosmetic issue, minor UX inconvenience, edge case with no revenue impact |

## Priority Guide

| Priority | Meaning |
|---|---|
| **P1** | Fix immediately — blocks release or causes active revenue loss |
| **P2** | Fix before next release |
| **P3** | Fix in current sprint if time allows |
| **P4** | Backlog — fix when convenient |

---

## Output Format

After filling the template, output:

```
🐛 Bug Report Filed
Title: <title>
Severity: <severity> | Priority: <priority>
Component: <component>
Root Cause: <one-line summary>
```

Then ask: "Should I also write a Playwright regression test for this scenario?"

---

## PHR

After filing, create a PHR at `history/prompts/general/` with stage `general`,
title "bug report <component> <short-symptom>".
