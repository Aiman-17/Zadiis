# Reusable Intelligence: Shipped Fixes Retrospective

**Extracted from**: `store/` (Next.js 16 / Supabase e-commerce app), session of 2026-07-04/05
**Purpose**: Two bug *patterns* — not single bugs — recurred across multiple,
unrelated files during this session. Encoding them here means the next
contributor (human or agent) touching this codebase has something concrete
to check against, instead of rediscovering each pattern from scratch the
hard way (which is what happened here: each pattern was found once by
accident, then found again elsewhere only because someone thought to grep
for it).

---

## Pattern 1: Unawaited Supabase query builder writes never execute

**The bug, exactly as it appeared five times**:

```ts
// Looks like "fire and forget" — it is not. This request is NEVER sent.
void supabaseAdmin.from('orders').update({ delivered_at: new Date().toISOString() }).eq('id', id)
```

**Why this is deceptive**: `void expr` in JavaScript evaluates `expr` and
discards the result — for a normal async function call, the function body
still runs to completion regardless of whether the caller awaits it. But
Supabase's query builder (`PostgrestFilterBuilder`) is a **thenable**, not a
promise — it only actually issues the underlying HTTP request when
something calls `.then()` on it (which `await` does automatically). A bare
`void query` never calls `.then()`, so the network request is never sent at
all. The code compiles, typechecks, and looks like an intentional
performance optimization (skip waiting for a side-effect write) — it is
actually a silent no-op.

**Everywhere this was found in this codebase** (all fixed by changing `void`
to `await`):

- `store/src/app/api/admin/orders/route.ts` — `cancelled_at`/`returned_at`/`delivered_at` stamps
- `store/src/app/api/admin/orders/return/route.ts` — `returned_at`/`cancelled_at` stamp
- `store/src/app/admin/page.tsx` — dashboard lazy sale deactivation
- `store/src/app/admin/sales/page.tsx` — sales-list lazy sale deactivation

**Persona**: You are reviewing or writing a Supabase mutation in a Next.js
server component or API route where the result isn't needed by the current
response (a "fire and forget" side effect).

**Questions to ask before writing `void someQuery...`**:

- Is `someQuery` a Supabase query builder call (`.from(...).update(...)`,
  `.insert(...)`, `.delete(...)`), or a plain async function that itself
  awaits its own internal work?
  - If it's a **query builder call directly**: `void` is unsafe. It will
    never execute. Use `await` (a few hundred milliseconds of added latency
    is virtually always cheaper than a write that silently never happens).
  - If it's a **wrapped async function** (e.g. `sendCustomerOrderCancelled(...)`
    which internally does `await resend.emails.send(...)`), `void` is safe
    for the *outer* call — the function body starts executing immediately
    when called, independent of whether the caller awaits the returned
    promise. The risk here is different: if the serverless function
    terminates before the inner `await` resolves, the effect can still be
    cut off mid-flight. Prefer `await` there too unless response latency is
    the priority and occasional lost sends are acceptable (e.g.
    best-effort notification emails).
- Would a developer reading this code six months from now be able to tell,
  just by looking at it, that the write never happens? (If the answer is
  "no, it looks correct" — that's exactly this bug. It hid in this codebase
  for long enough that `cancelled_at`/`returned_at` were *never once*
  written in production before this fix.)

**Principle**: Never use a bare `void` on a Supabase query builder chain.
If a write's result is genuinely not needed by the response, still `await`
it — `void` does not mean "fire and forget" for a thenable that only fires
on `.then()`.

**Detection heuristic for future audits**: `grep -rn "void supabase" store/src`
— every remaining hit (as of this writing, none) should be scrutinized with
the question above before assuming it's safe.

---

## Pattern 2: Server-rendered admin pages missing `force-dynamic` freeze on a build-time snapshot

**The bug, exactly as it appeared twice**:

A Next.js App Router page (`page.tsx`, no `'use client'` directive) fetches
live data from Supabase on every conceptual "request" — but without
`export const dynamic = 'force-dynamic'`, Next.js has no signal that the
page's output changes between requests, and statically prerenders it once
at build time. In production, that means the page is served from a cached
HTML snapshot **forever** (`Cache-Control: s-maxage=31536000` — a literal
year), never re-executing the Supabase fetch until the next full rebuild
and redeploy.

**Everywhere this was found in this codebase** (both fixed by adding the directive):

- `store/src/app/admin/sales/page.tsx` — discovered because live verification
  showed only 1 of 5 real sales rendering, traced via response headers
  (`x-nextjs-cache: HIT`)
- `store/src/app/admin/products/[id]/edit/page.tsx` — found via a deliberate
  follow-up audit once the first instance was understood as a *pattern*, not
  a one-off

**Confirmed NOT affected** (for reference, so this isn't re-flagged later):
every page under `store/src/app/(store)/` inherits `force-dynamic` from
`store/src/app/(store)/layout.tsx`, which already declares it at the layout
level — a `dynamic` export on a layout forces the whole route subtree
beneath it, regardless of whether each individual page also declares it.
Client components (`'use client'`, e.g. `admin/orders/page.tsx`,
`admin/payments/page.tsx`) are unaffected by this pattern entirely, since
they fetch data at runtime in the browser via `useEffect`/`fetch`, never
through static prerendering.

**Persona**: You are adding or reviewing a new Server Component page under
`store/src/app/admin/` (or any App Router route not already covered by a
parent layout's `force-dynamic`) that reads from Supabase.

**Questions to ask before shipping a new server-rendered data page**:

- Does this page's `<head>`-less parent chain (its own file, or any layout
  above it) already declare `export const dynamic = 'force-dynamic'`? If
  not, and this page fetches anything that changes over time (order status,
  stock, sale state, product edits, settings) — it needs the directive
  itself.
- After building (`npm run build`) and starting (`npm start`) the app
  production-style, does `curl -I` on this route show
  `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`
  (dynamic) or a large `s-maxage` with `x-nextjs-cache: HIT` (frozen
  static)? This is the fastest way to *prove* the answer rather than
  inferring it from reading the code.

**Principle**: Every admin (or any authenticated, data-driven) Server
Component page must be verified dynamic in a production build, not just
assumed dynamic because it "looks like" it fetches live data. `next dev`
does not reproduce this bug — it always re-executes Server Components on
every request in development mode, which is exactly why this class of bug
is invisible until a real production build is checked (consistent with this
project's standing practice of verifying with `npm run build && npm start`,
never `next dev`, for anything data-driven).

**Detection heuristic for future audits**: for every `page.tsx` under
`store/src/app/admin/` without `'use client'`, confirm either the file
itself or an ancestor layout declares `export const dynamic = 'force-dynamic'`.
As of this writing, every admin data page has been audited and confirmed
correct (see `history/prompts/general/084` for the full sweep).

---

## Cross-cutting observation: static analysis did not catch either pattern

Both patterns compiled cleanly, passed `tsc --noEmit`, and passed
`npm run build` with zero warnings — TypeScript has no way to know that a
thenable's side effect depends on `.then()` being called, and Next.js's
build output silently reports a static route as a *success*, not a warning.
Both were only found by live verification against a running production
build with real (or realistically isolated) data, and in the caching case,
specifically by inspecting HTTP response headers rather than trusting that
"the code looks like it fetches live data." This is the concrete argument
for why this project's standing verification practice — build + start +
curl/Playwright against the real thing, not just typecheck — is not
optional overhead; it is the only thing that caught either of these two
bugs.
