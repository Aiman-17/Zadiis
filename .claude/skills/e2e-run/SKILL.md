---
name: e2e-run
description: Use when running, debugging, or setting up the Playwright E2E suite for the ZADIIS store — starting the right server, exporting required env vars, running store/admin projects, and reading failure artifacts. Also use when tests hang, time out universally, or fail with connection errors.
---

# Running the ZADIIS E2E Suite

## The one rule that matters most

**Never run tests against the dev server on this machine.** `next dev`
(Turbopack) hangs on Windows here — it logs "Ready", accepts TCP connections,
then never responds. Every test times out waiting for locators and a full run
wastes an hour. Always use a production build:

```bash
cd store
npm run build          # ~1-2 min
npm start              # serves prebuilt pages on :3000
```

Playwright's `webServer` config has `reuseExistingServer: true`, so it will use
this server instead of spawning its own.

## Verify the server before any run

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000   # expect 200
```

If this prints `000`, the server is hung or down — kill the owning process
(find it: `Get-NetTCPConnection -LocalPort 3000`) and restart with `npm start`.
Note: the server may bind IPv6-only; if IPv4 curl fails but the port shows a
listener, test `http://[::1]:3000` before concluding it's down.

## Env vars (Playwright does NOT read .env.local — only the Next server does)

| Var | Needed by | Effect if missing |
|---|---|---|
| `ADMIN_PASSWORD` | `global.setup.ts` (admin project login) | setup throws, all admin tests fail |
| `SAFEPAY_SECRET_KEY` | 1 signed-webhook test | that test skips (fine) |

Export from `.env.local` without printing values:

```bash
cd store
export $(grep -E '^(ADMIN_PASSWORD|SAFEPAY_SECRET_KEY)=' .env.local | xargs)
```

## Running

```bash
npm run test:e2e            # everything (store + setup + admin)
npm run test:e2e:store      # customer journeys, no auth needed
npm run test:e2e:admin      # runs setup (login) first via project dependency
npx playwright test <file-stem> --project=store --reporter=line   # one file
```

`workers: 1` and `retries: 1` are intentional (shared cart/order state) — do
not parallelize with more workers without isolating state.

## Reading failures

- `store/test-results/<test-dir>/error-context.md` — error + full page
  accessibility snapshot (what was actually on screen). Read this FIRST.
- `store/test-results/<test-dir>/trace.zip` — `npx playwright show-trace <path>`
- The `test-results/` dir only exists when something failed.

## Known truths that stale tests violate

- Cart localStorage key: **`zadiis-cart`** (hyphen). `zadiis_cart` is dead.
- Checkout inputs are **labeled** (use `getByRole('textbox', { name: /email/i })`);
  `getByPlaceholder` finds nothing.
- Checkout calls `POST /api/cart/validate` on load and strips items whose
  product id isn't in the DB — mock it (`helpers/cart.ts → mockCartValidate`)
  when seeding fake items.
- `POST /api/orders` re-validates products server-side — tests placing real
  orders must add a real product through the shop UI
  (`helpers/cart.ts → addRealProductToCart`).
- OTP is inline under the email field (blur auto-sends; input placeholder
  `000000`; typing 6 digits auto-verifies) — not a modal. Mock via
  `helpers/otp.ts → mockOtp`.
- Open product bugs tests must not "fix" by weakening asserts: see
  `specs/001-e2e-test-suite/bugs/` (BUG-001: OTP send errors render nowhere).
