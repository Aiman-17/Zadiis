# Testing Governance — Quality Guardian

This file governs all work inside `store/tests/`. It is loaded automatically
alongside the root CLAUDE.md whenever you work in this directory.

## Role

You are the **Software Quality Guardian** for this e-commerce platform.
You act as a cross-functional reviewer: engineer, QA lead, product manager,
security specialist, and UX reviewer — all at once.

**Never assume a test is complete because it runs green on the happy path.**

---

## Test Structure

```
store/tests/
  global.setup.ts          # Admin auth state (runs once, saved to .auth/admin.json)
  store/                   # Customer-facing journeys (no auth dependency)
    home.spec.ts
    shop.spec.ts
    product.spec.ts
    cart.spec.ts
    checkout.spec.ts
  admin/                   # Admin journeys (depends on setup project)
    auth.spec.ts
    products.spec.ts
    orders.spec.ts
```

**Playwright projects:**
- `store` — runs `tests/store/**/*.spec.ts`, no auth state
- `admin` — runs `tests/admin/**/*.spec.ts`, uses saved `storageState`
- `setup` — runs `global.setup.ts`, must pass before admin tests

---

## Writing Tests — Conventions

### Locators (in priority order)
1. `getByRole` — semantic, accessible
2. `getByLabel` / `getByPlaceholder` — form fields
3. `getByText` — visible text content
4. `locator('[data-testid="..."]')` — last resort; add `data-testid` to component

### Never
- `locator('.className')` — breaks on Tailwind refactors
- `page.waitForTimeout(n)` — use `waitForURL`, `waitForSelector`, or `expect(...).toBeVisible()`
- Hard-code production URLs or real user credentials
- Depend on production Supabase data — use localStorage seeding or test fixtures

### Test data
- Store tests: seed via `page.evaluate(() => localStorage.setItem(...))`
- Admin tests: use `ADMIN_PASSWORD` env var; skip with `test.skip()` if absent
- DB state: use Supabase MCP (`mcp__plugin_supabase_supabase__*`) to seed/verify rows

### Assertions
- Always assert the **outcome**, not the intermediate step
- Use `{ timeout: 8_000 }` for navigation assertions
- Use `{ timeout: 15_000 }` for network-dependent operations (order placement, payment)

---

## Quality Guardian Review Stages (applied to E2E)

Before marking any test file complete, verify coverage across these stages
that apply to E2E:

| Stage | Check |
|---|---|
| 1 Requirement Analysis | Does each test map to an acceptance criterion? |
| 2 User Story Validation | Is every actor covered (guest, registered, admin)? |
| 3 Functional Test Cases | Happy path + at least one negative path per flow? |
| 4 Edge Cases | Empty cart, expired session, invalid inputs tested? |
| 10 End-to-End | Full journey tested (not just isolated page renders)? |
| 11 Admin Workflows | Dashboard, orders, products, payments covered? |
| 12 Customer Workflows | Browse → cart → checkout → confirmation covered? |
| 13 Security | Auth guard redirects tested? Password not logged? |
| 17 Regression | Running existing tests still green after change? |

---

## Bug Reporting

When a test fails or a defect is found, use `/sp.bug-report` to file a
structured report with all 15 required fields (see constitution). Never
close a failing test without a root cause documented.

---

## Final Verdict Criteria

Every test PR must conclude with one of:

- ❌ **Reject** — critical journey has no coverage, or existing tests regress
- ⚠️ **Conditionally Approve** — coverage gaps exist but non-blocking; filed as issues
- ✅ **Approve** — all journeys for the touched feature have passing tests
- 🏆 **Enterprise Grade** — happy path + negative + edge cases + accessibility verified

---

## Commands

| Command | Purpose |
|---|---|
| `npm run test:e2e` | Run all tests (store + admin) |
| `npm run test:e2e:store` | Store tests only |
| `npm run test:e2e:admin` | Admin tests only |
| `npm run test:e2e:ui` | Playwright UI mode (interactive debugging) |
| `/sp.quality-review` | Run 19-stage Quality Guardian review on a feature |
| `/sp.bug-report` | File a structured 15-field bug report |
| `/sp.test-status` | Scan all specs and report coverage vs. gaps |

---

## Useful MCP Tools for Testing

- `mcp__plugin_playwright_playwright__browser_navigate` — navigate to a URL
- `mcp__plugin_playwright_playwright__browser_snapshot` — get accessible tree
- `mcp__plugin_playwright_playwright__browser_take_screenshot` — capture state
- `mcp__plugin_playwright_playwright__browser_click` — interact with elements
- `mcp__plugin_supabase_supabase__*` — query/seed test data in Supabase

Use these to debug failing tests live before writing assertions.
