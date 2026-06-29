# Debugging Skills — Design Spec
**Date:** 2026-06-29
**Status:** Approved
**Scope:** Four layer-specific debugging skills for the ZADII'S ecom project (Supabase data, webhooks, Next.js App Router, UI/logic)

---

## 1. Problem Statement

After 54+ development cycles, four recurring bug categories consume the most debugging time with no documented playbook:

1. **Data layer** — Supabase `.select()` missing fields cause silent `undefined` returns; RLS silently blocks rows; COD orders excluded from counts due to wrong status enumeration.
2. **API/Webhook layer** — Payment webhooks (Safepay/JazzCash) process without DB changes; duplicate order creation; missing field extraction from webhook payload.
3. **Next.js App Router layer** — Hydration mismatches; polling hooks firing on wrong pages (401 console errors); `use client` boundary misplacement; `localStorage` crashes on server.
4. **UI/Logic layer** — Filter/tab regressions; sale price computed from wrong source of truth; cart state stale vs DB; client state persisting across navigations; badge count boundary bugs.

Without documented patterns, each recurrence requires re-diagnosing from scratch.

---

## 2. Approach Decision

**Approach chosen: 4 focused layer skills (Approach A)**

One skill per layer, each invoked when the layer is already known.

**Rejected alternatives:**
- *Approach B (triage + 4 deep-dive):* Adds a 5th triage skill with overhead; session history shows the layer is almost always obvious from the symptom.
- *Approach C (1 unified skill):* Grows beyond 500 words quickly; harder to scan; one layer update touches the whole file.

**Naming convention:** `ecom:<layer>-debugging` — the `ecom:` namespace scopes these to this project's stack (Next.js + Supabase + Vercel).

---

## 3. Skill Designs

### Skill 1 — `ecom:supabase-debugging`

**File:** `~/.claude/skills/ecom/supabase-debugging/SKILL.md`

**Trigger conditions:**
- Missing data after a fetch that should return rows
- `null` / `undefined` on a field that exists in the DB
- COD orders absent from dashboard counts
- RLS silently blocking rows (no error, just empty result)
- TypeScript type error from Supabase response shape

**Core patterns:**

| Pattern | Rule |
|---|---|
| Missing `.select()` field | If a field is used in code but absent from `.select()`, Supabase returns `undefined` silently — no error thrown. Always grep every `.select()` call on a table when adding a new column. |
| RLS diagnosis | Check: anon key vs service key in use? Policy covers this operation (SELECT/INSERT/UPDATE)? `auth.uid()` matches the row owner? |
| Count query status list | Enumerate every status that counts (`new,processing,shipped,delivered`). Explicitly exclude `cancelled,returned`. COD bugs often trace to status not being in the list. |
| `.single()` vs `.maybeSingle()` | `.single()` throws on 0 rows. Use `.maybeSingle()` for optional lookups (product not found, user not in table). |
| New column rollout | After adding a column: grep all `.select()` strings on that table, grep all insert/update calls, verify column appears in each. |

**Real incident:** `is_sale` was added to the `products` table but not to the `.select()` in `verify/route.ts` and `safepay/route.ts` — sale orders processed as non-sale, breaking sale email logic. Fix: added `is_sale` to both selects (commit `66640a4`).

---

### Skill 2 — `ecom:webhook-debugging`

**File:** `~/.claude/skills/ecom/webhook-debugging/SKILL.md`

**Trigger conditions:**
- Payment completed by customer but order not updating in DB
- Webhook returns 200 but no DB change visible
- Duplicate orders created from single payment
- Safepay or JazzCash webhook silent failure
- Order status not transitioning after payment event

**Core patterns:**

| Pattern | Rule |
|---|---|
| Log before parse | Log raw request body first, then parse. Never discard the raw payload — it's the only record of what the provider actually sent. |
| Idempotency guard | Before creating or updating an order from a webhook, check if that `order_id` / `transaction_id` has already been processed. Duplicate webhook deliveries are normal. |
| Status state machine | Only allow forward transitions: `new → processing → shipped → delivered`. Reject backwards transitions. A webhook that tries to move `delivered → processing` is either a replay or a bug. |
| Missing field extraction | Destructure webhook payload with explicit named variables + log what was received vs what was expected. Catch missing fields before they reach DB calls. |
| Local testing | Use Vercel preview URL or ngrok to expose the endpoint. Never rely solely on hardcoded mock payloads — the provider's actual shape is the ground truth. |

**Diagnosis sequence:**
1. Check Vercel function logs for the webhook route — did it receive the request?
2. Check raw body log — does the payload have the expected fields?
3. Check idempotency guard — was this `transaction_id` already processed?
4. Check DB call — did the Supabase update/insert succeed or return an error?

---

### Skill 3 — `ecom:nextjs-app-router-debugging`

**File:** `~/.claude/skills/ecom/nextjs-app-router-debugging/SKILL.md`

**Trigger conditions:**
- Hydration mismatch error in browser console
- `use client` directive present but component still acts like server component
- 401 console errors from a fetch/poll on a page that doesn't require auth
- `localStorage` / `sessionStorage` crash on server (ReferenceError)
- Server component returning stale data after mutation
- Cookies or headers not accessible where expected

**Core patterns:**

| Pattern | Rule |
|---|---|
| Hydration mismatch | Any value that differs between server render and client first paint causes mismatch. Guard `Date.now()`, `Math.random()`, `localStorage`, browser-only APIs behind `useEffect` or a `mounted` boolean state. |
| `use client` boundary | Mark the *smallest* component that needs interactivity as `use client`, not the whole page. Marking a page as client disables all server-side data fetching for that route. |
| Polling on wrong page | Any hook that polls (order badge, cart count) must check `pathname` before firing. Polling on `/admin/login` with an anon session causes 401s. Guard: `if (pathname.startsWith('/admin/login')) return`. |
| Server vs client data fetch | Server components: `await` directly at the top level. Client components: `useEffect` + loading state. Never mix — a client component cannot `await` at the top level. |
| `cookies()` / `headers()` | Only callable inside Server Components and Route Handlers. Cannot be called inside client components or shared utility files imported by both. |
| localStorage on server | Wrap every `localStorage` / `sessionStorage` access in `typeof window !== 'undefined'` or inside `useEffect`. |

**Real incident:** Order badge hook polled on every page including `/admin/login`, firing with anon session and returning 401 on every page load. Fix: added `pathname` guard to skip polling on the login route (commit `0a6e6d0`).

---

### Skill 4 — `ecom:ui-logic-debugging`

**File:** `~/.claude/skills/ecom/ui-logic-debugging/SKILL.md`

**Trigger conditions:**
- A tab or filter stops returning correct results after a nearby code change
- Sale price showing on a non-sale product, or not showing on a sale product
- Cart shows a price that differs from checkout total
- A count (cart badge, order badge) shows wrong number, especially at 0→1 or 1→0
- State from a previous page visit leaks into the current page

**Core patterns:**

| Pattern | Rule |
|---|---|
| Filter regression trace | Trace the full chain: URL param → filter state variable → query predicate → SQL `WHERE` clause. A break anywhere in the chain produces wrong results silently. Test each link in isolation. |
| Sale price source of truth | `is_sale` on the product row is the canonical truth. Any component that computes sale price independently without checking `is_sale` is a latent bug. All sale price derivation must read from one place. |
| Cart stale state | Cart lives in `localStorage`. Product prices and stock change in Supabase. Revalidate cart items against current DB state at *checkout time*, not at add-to-cart time. |
| Client state across navigation | Next.js App Router does not reset `useState` on soft navigation. State that should be fresh per-page must either key off `pathname` or derive from `searchParams` as source of truth. |
| Badge/count boundary | Always test the 0→1 transition (first item added) and 1→0 transition (last item removed) explicitly. These boundary conditions fail most often. |
| Tab/filter combo regression | When two filters interact (e.g. tab + category), test all combinations, not just each filter alone. The `unstitched` + trending incident (commit `10f413c`) was a combo interaction bug. |

**Diagnosis sequence:**
1. Reproduce with the exact URL params / state that triggers the bug.
2. `console.log` the filter state variable immediately before the query.
3. Log the raw Supabase response — is the data correct at the DB level?
4. If data is correct but display is wrong, the bug is in the render logic.
5. If data is wrong, trace back up to the query predicate.

---

## 4. Skill Creation Process (TDD)

Each skill follows the writing-skills TDD cycle before it is deployed:

1. **RED:** Run a pressure scenario with a subagent *without* the skill present. Document what they diagnose incorrectly or skip.
2. **GREEN:** Write the skill addressing exactly those gaps. Run the same scenario — agent must now diagnose correctly.
3. **REFACTOR:** Find new rationalizations or gaps, add explicit counters, re-test until bulletproof.

Skills are not deployed until all three phases complete.

---

## 5. File Layout

```
~/.claude/skills/
  ecom/
    supabase-debugging/
      SKILL.md
    webhook-debugging/
      SKILL.md
    nextjs-app-router-debugging/
      SKILL.md
    ui-logic-debugging/
      SKILL.md
```

---

## 6. Acceptance Criteria

- [ ] Each skill has YAML frontmatter with `name` and `description` (description starts with "Use when...")
- [ ] Each skill is under 400 words
- [ ] Each skill has a quick-reference table
- [ ] Each skill has at least one real incident example from this project's git history
- [ ] Each skill passes a RED-GREEN-REFACTOR test cycle before deployment
- [ ] Skills are registered in the skills index so they appear in the available skills list

---

## 7. Out of Scope

- Generic Next.js or Supabase documentation (covered by context7 MCP)
- Infrastructure/Vercel deployment debugging (covered by `vercel:deployment-expert`)
- Performance debugging (covered by `vercel:performance-optimizer`)
- A triage skill to route between layers (deferred — add if needed after using the 4 focused skills)
