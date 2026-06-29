# Debugging Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 4 TDD-tested, layer-specific debugging skills for the ZADII'S ecom project, stored at `C:\Users\QC\.claude\skills\ecom\`, ready to invoke whenever a bug fits one of the four known layers.

**Architecture:** Each skill is a `SKILL.md` file with YAML frontmatter. The writing-skills TDD cycle is mandatory — RED (subagent fails without skill) → GREEN (write SKILL.md, subagent now passes) → REFACTOR (close any remaining loopholes). Skills are independent; they can be written in any order and each is self-contained.

**Tech Stack:** Claude Code skills system (`SKILL.md` format), PowerShell for directory creation, git for version control.

## Global Constraints

- Skills root: `C:\Users\QC\.claude\skills\ecom\`
- `name` frontmatter field: letters, numbers, hyphens only — no colons, no underscores
- `description` field: starts with `"Use when..."`, third person, max 500 chars, **never** summarises the skill's workflow
- Each `SKILL.md`: under 400 words total
- TDD is mandatory: RED subagent dispatch BEFORE writing `SKILL.md`; GREEN subagent dispatch AFTER
- Every skill must cite at least one real incident from this repo's git history with commit hash

---

### Task 1: `ecom-supabase-debugging` skill

**Files:**
- Create: `C:\Users\QC\.claude\skills\ecom\supabase-debugging\SKILL.md`

**Interfaces:**
- Produces: skill invokable as `ecom:supabase-debugging` in future sessions

---

- [ ] **Step 1: Create the skills directory**

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\QC\.claude\skills\ecom\supabase-debugging"
```

Expected: directory created, no error.

---

- [ ] **Step 2: Run RED scenario — dispatch subagent WITHOUT the skill**

Dispatch a fresh subagent (Agent tool) with this exact prompt. Do NOT include any skill content in the subagent context. Record what the subagent diagnoses correctly and what it misses or handles poorly.

```
You are debugging a Next.js 14 App Router + Supabase ecommerce app (Pakistani fashion store).

Two bugs have been reported:

Bug 1: A new column `discount_percentage` (integer, nullable, default null) was added to the Supabase `products` table via migration. The product detail page renders `undefined` for discount_percentage even though running `SELECT discount_percentage FROM products LIMIT 5` in Supabase Studio returns real values.

Bug 2: The admin dashboard shows 0 COD (Cash on Delivery) orders even though Supabase Studio shows 14 orders with order_status = 'new' and payment_method = 'cod'. The dashboard query counts orders like this:
  .from('orders')
  .select('id', { count: 'exact' })
  .in('order_status', ['processing', 'shipped', 'delivered'])

Diagnose both bugs. For each bug: name the root cause, explain why it happens, and show the exact code change that fixes it.
```

Expected RED failures to document:
- Agent may miss that the `.select()` string doesn't include `discount_percentage`
- Agent may not notice `'new'` is absent from the status list in Bug 2
- Agent may suggest RLS as the cause when the real cause is simpler

Record verbatim what the agent gets wrong before moving to Step 3.

---

- [ ] **Step 3: Write the GREEN skill — create SKILL.md**

Write the following content exactly to `C:\Users\QC\.claude\skills\ecom\supabase-debugging\SKILL.md`:

```markdown
---
name: ecom-supabase-debugging
description: Use when Supabase returns undefined or null for a field that exists in the database, rows are unexpectedly empty with no error thrown, COD orders are missing from dashboard counts, or after adding a new column its data does not appear in the UI.
---

# Supabase Debugging — ZADII'S Stack

## When to Use
- A field in the DB returns `undefined` in the UI
- Rows come back empty with no Supabase error
- COD orders missing from dashboard counts
- RLS appears to be silently blocking rows
- TypeScript type error on Supabase response shape

## Quick Reference

| Symptom | First thing to check |
|---|---|
| Field is `undefined` in UI | Is the field name in the `.select()` string? |
| Rows empty, no error | Does RLS policy cover this operation + key type? |
| COD orders not counted | Is `'new'` and `'processing'` in the status list? |
| `.single()` throwing | Should this be `.maybeSingle()`? |
| New column not appearing | Grep all `.select()` calls on this table |

## Core Patterns

**Missing field in `.select()`**

Supabase returns `undefined` silently for fields not listed in the `.select()` string — no error is thrown.

```ts
// BAD — is_sale will be undefined even if it exists in DB
const { data } = await supabase.from('products').select('id, name, price')

// GOOD
const { data } = await supabase.from('products').select('id, name, price, is_sale')
```

**New column rollout checklist**

After adding a column to any table, run this grep and open every file listed:

```powershell
grep -r "from('products')" store/src --include="*.ts" -l
```

Verify the new column appears in the `.select()` string in every file.

**RLS diagnosis sequence**

1. Is the request using the anon key or the service key?
2. Does the RLS policy cover this operation (SELECT / INSERT / UPDATE)?
3. Does `auth.uid()` match the row owner?
4. Test with service key to bypass RLS — if data appears, RLS is the block.

**Count query — enumerate statuses explicitly**

```ts
// BAD — 'new' orders (most COD orders) are excluded
.in('order_status', ['processing', 'shipped', 'delivered'])

// GOOD — include every status that should count
.in('order_status', ['new', 'processing', 'shipped', 'delivered'])
// Explicitly exclude: 'cancelled', 'returned'
```

**`.single()` vs `.maybeSingle()`**

`.single()` throws on 0 rows. Use `.maybeSingle()` for any lookup that may legitimately return no row (product not found, user not in table).

## Real Incident

`is_sale` was added to the `products` table but omitted from the `.select()` in `verify/route.ts` and `safepay/route.ts`. Sale orders processed as non-sale; sale email logic broke silently. Fix: added `is_sale` to both selects. (commit `66640a4`)
```

---

- [ ] **Step 4: Run GREEN scenario — same subagent prompt, skill now present**

Dispatch a fresh subagent with the SAME prompt from Step 2, but this time include the skill content (copy the SKILL.md body into the subagent context as reference material, or ensure it is loaded via the skills system).

Expected GREEN pass criteria:
- Agent immediately checks `.select()` string for `discount_percentage` in Bug 1
- Agent immediately notices `'new'` is absent from the status list in Bug 2
- Agent provides exact fix for both without diagnosing RLS first

If the agent now passes both criteria, proceed to Step 5. If it still misses something, update SKILL.md and re-run.

---

- [ ] **Step 5: REFACTOR — close any new gaps**

If the GREEN subagent found a workaround or gap not covered by SKILL.md, add an explicit counter. Common additions:
- A "Common Mistakes" table row for whatever rationalization the agent used
- A more specific trigger condition in the `description` frontmatter

Re-dispatch the subagent after each SKILL.md edit until all scenarios pass.

---

- [ ] **Step 6: Commit**

```powershell
git -C "C:\Users\QC\Desktop\ecom-business-project" add docs/superpowers/plans/2026-06-29-debugging-skills.md
git -C "C:\Users\QC\Desktop\ecom-business-project" commit -m "feat: add ecom-supabase-debugging skill (TDD verified)"
```

---

### Task 2: `ecom-webhook-debugging` skill

**Files:**
- Create: `C:\Users\QC\.claude\skills\ecom\webhook-debugging\SKILL.md`

**Interfaces:**
- Produces: skill invokable as `ecom:webhook-debugging` in future sessions

---

- [ ] **Step 1: Create the directory**

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\QC\.claude\skills\ecom\webhook-debugging"
```

---

- [ ] **Step 2: Run RED scenario — dispatch subagent WITHOUT the skill**

```
You are debugging a Next.js 14 App Router + Supabase ecommerce app (Pakistani fashion store) that uses Safepay for card payments.

Two bugs have been reported:

Bug 1: A customer paid successfully via Safepay (the Safepay merchant dashboard shows the transaction as completed). However, the order's status in Supabase is still 'new' — it was not updated to 'processing'. The webhook route at /api/webhooks/safepay returns HTTP 200 for every request.

Bug 2: Some orders appear twice in the Supabase orders table. Each duplicate pair has identical customer info, products, and total amount, and both rows were created within 2 seconds of each other.

The webhook handler currently looks like this:
  export async function POST(req: Request) {
    const body = await req.json()
    const { order_id, status, transaction_id } = body
    await supabase.from('orders').update({ order_status: 'processing' }).eq('id', order_id)
    return Response.json({ ok: true })
  }

Diagnose both bugs. For each bug: name the root cause and show the exact code fix.
```

Expected RED failures to document:
- Agent may not notice the missing `await req.text()` log-before-parse pattern
- Agent may miss idempotency as the cause of duplicates
- Agent may suggest complex solutions before checking the simple ones

---

- [ ] **Step 3: Write the GREEN skill — create SKILL.md**

Write the following content exactly to `C:\Users\QC\.claude\skills\ecom\webhook-debugging\SKILL.md`:

```markdown
---
name: ecom-webhook-debugging
description: Use when a payment webhook returns 200 but the Supabase order is not updating, duplicate orders appear from a single payment, or a Safepay or JazzCash webhook processes silently with no visible database change.
---

# Webhook Debugging — ZADII'S Stack

## When to Use
- Payment completed in Safepay/JazzCash but order status not updating in DB
- Webhook returns 200 but no DB change
- Duplicate orders from a single payment
- Order status not transitioning after payment event

## Quick Reference

| Symptom | First thing to check |
|---|---|
| Webhook 200 but no DB change | Did Vercel function logs receive the request? |
| Duplicate orders | Is there an idempotency guard on `transaction_id`? |
| Missing field from payload | Is raw body logged before parsing? |
| Wrong status after payment | Does the state machine allow this transition? |

## Diagnosis Sequence

1. Check Vercel function logs — did the webhook route receive the request?
2. Check raw body log — does the payload have the expected fields?
3. Check idempotency guard — was this `transaction_id` already processed?
4. Check the Supabase call result — did `update()` return an error?

## Core Patterns

**Log before parse**

```ts
export async function POST(req: Request) {
  const raw = await req.text()
  console.log('[webhook] raw body:', raw)   // log FIRST
  const body = JSON.parse(raw)              // then parse
  const { order_id, status, transaction_id } = body
  console.log('[webhook] parsed:', { order_id, status, transaction_id })
}
```

**Idempotency guard — prevents duplicate orders**

Safepay and JazzCash can deliver the same webhook more than once.

```ts
const { data: existing } = await supabase
  .from('orders')
  .select('id, order_status')
  .eq('transaction_id', transaction_id)
  .maybeSingle()

if (existing?.order_status === 'processing') {
  return Response.json({ ok: true })  // already processed, skip
}
```

**Status state machine — only forward transitions**

```ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['processing'],
  processing: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
}

if (!VALID_TRANSITIONS[current]?.includes(next)) {
  console.error(`[webhook] invalid transition ${current} → ${next}`)
  return Response.json({ error: 'invalid transition' }, { status: 400 })
}
```

**Local testing**

Use a Vercel preview deployment URL as the webhook endpoint — never test with only hardcoded mock payloads. The provider's actual payload shape is the ground truth; mocks drift.

## Real Incident

Safepay webhook was missing `is_sale` field extraction from the payload. Sale orders were processed without the sale flag, causing revenue inflation and broken sale analytics. Fix: destructured `is_sale` from payload and added it to the `.select()` in the verify route. (commit `66640a4`)
```

---

- [ ] **Step 4: Run GREEN scenario — same prompt, skill present**

Dispatch the same subagent prompt from Step 2 with the SKILL.md content available.

Expected GREEN pass criteria:
- Agent adds `await req.text()` + log as the first fix in Bug 1
- Agent identifies missing idempotency guard as the root cause of Bug 2
- Agent adds `transaction_id` check before the DB update

---

- [ ] **Step 5: REFACTOR — close any new gaps**

Identify any new rationalization the subagent used and add an explicit counter to SKILL.md. Re-dispatch until passing.

---

- [ ] **Step 6: Commit**

```powershell
git -C "C:\Users\QC\Desktop\ecom-business-project" commit -m "feat: add ecom-webhook-debugging skill (TDD verified)"
```

---

### Task 3: `ecom-nextjs-app-router-debugging` skill

**Files:**
- Create: `C:\Users\QC\.claude\skills\ecom\nextjs-app-router-debugging\SKILL.md`

**Interfaces:**
- Produces: skill invokable as `ecom:nextjs-app-router-debugging` in future sessions

---

- [ ] **Step 1: Create the directory**

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\QC\.claude\skills\ecom\nextjs-app-router-debugging"
```

---

- [ ] **Step 2: Run RED scenario — dispatch subagent WITHOUT the skill**

```
You are debugging a Next.js 14 App Router + Supabase ecommerce app (Pakistani fashion store).

Two bugs have been reported:

Bug 1: A developer added this line to the global header component (which is a Server Component):
  <span>Last updated: {new Date().toLocaleDateString()}</span>
Now the browser console shows: "Error: Text content did not match. Server: '6/28/2026' Client: '6/29/2026'"

Bug 2: After deploying, the browser console shows dozens of these errors on the /admin/login page:
  GET /api/admin/orders/count 401 (Unauthorized)
The /api/admin/orders/count route correctly returns 401 for unauthenticated requests. The errors appear immediately on page load and repeat every 30 seconds. No errors appear on other admin pages after login.

Diagnose both bugs. For each: name the root cause and show the exact code fix.
```

Expected RED failures:
- Agent may not mention `mounted` boolean or `useEffect` guard for Bug 1
- Agent may try to "fix" the date format instead of guarding with client-only render
- Agent may miss that a polling hook runs on all pages including the login page

---

- [ ] **Step 3: Write the GREEN skill — create SKILL.md**

Write the following content exactly to `C:\Users\QC\.claude\skills\ecom\nextjs-app-router-debugging\SKILL.md`:

```markdown
---
name: ecom-nextjs-app-router-debugging
description: Use when the browser console shows a hydration mismatch error, a polling or fetch hook causes 401 errors on pages where auth does not apply, localStorage crashes on the server, or a use client component behaves unexpectedly.
---

# Next.js App Router Debugging — ZADII'S Stack

## When to Use
- `Text content did not match` hydration error in console
- 401 console errors from a polling hook on the wrong page
- `localStorage is not defined` crash (server-side)
- `use client` present but component still renders differently on server vs client
- `cookies()` or `headers()` not accessible where expected

## Quick Reference

| Symptom | Root cause |
|---|---|
| Hydration mismatch | Value differs between server render and client first paint |
| 401 on wrong page | Polling hook runs before pathname guard |
| `localStorage` crash | Accessed outside `useEffect` or `typeof window` guard |
| `use client` not helping | Marked on too large a boundary (whole page, not component) |
| Stale server data | No revalidation after mutation |

## Core Patterns

**Hydration guard — any value that differs server vs client**

```tsx
// Values that always cause hydration mismatch if rendered on server:
// Date.now(), new Date(), Math.random(), localStorage, window, navigator

const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return <span className="invisible">placeholder</span>

// Safe to render now:
return <span>Last updated: {new Date().toLocaleDateString()}</span>
```

**Pathname guard for polling hooks**

Any hook that polls (order badge, cart count) must skip pages where auth doesn't apply.

```ts
const pathname = usePathname()
useEffect(() => {
  if (pathname === '/admin/login') return   // no auth here — skip
  const id = setInterval(fetchOrderCount, 30_000)
  return () => clearInterval(id)
}, [pathname])
```

**`use client` boundary — mark the smallest component**

```
// BAD: marks the whole route as client — disables all server fetching
// app/admin/orders/page.tsx  ← 'use client' here

// GOOD: only the interactive table is a client component
// app/admin/orders/OrderTableClient.tsx  ← 'use client' here
// app/admin/orders/page.tsx  ← server component, passes data as props
```

**`localStorage` guard**

```ts
const getCart = (): CartItem[] => {
  if (typeof window === 'undefined') return []
  return JSON.parse(localStorage.getItem('cart') ?? '[]')
}
```

**Server vs client data fetching**

Server Components: `await` at the top level.
Client Components: `useEffect` + loading state. Never `await` at the top level of a client component.

## Real Incident

Order badge hook polled `/api/admin/orders/count` on every page, including `/admin/login`. The anon session returned 401 on every page load and every 30-second interval. Fix: added `pathname` guard to skip polling on the login route. (commit `0a6e6d0`)
```

---

- [ ] **Step 4: Run GREEN scenario — same prompt, skill present**

Expected GREEN pass criteria:
- Agent immediately prescribes `mounted` + `useEffect` guard for Bug 1
- Agent identifies the pathname guard as the missing piece for Bug 2
- Agent shows exact code for both fixes without alternative diagnoses first

---

- [ ] **Step 5: REFACTOR — close any new gaps**

Add counters for any remaining rationalizations. Re-dispatch until passing.

---

- [ ] **Step 6: Commit**

```powershell
git -C "C:\Users\QC\Desktop\ecom-business-project" commit -m "feat: add ecom-nextjs-app-router-debugging skill (TDD verified)"
```

---

### Task 4: `ecom-ui-logic-debugging` skill

**Files:**
- Create: `C:\Users\QC\.claude\skills\ecom\ui-logic-debugging\SKILL.md`

**Interfaces:**
- Produces: skill invokable as `ecom:ui-logic-debugging` in future sessions

---

- [ ] **Step 1: Create the directory**

```powershell
New-Item -ItemType Directory -Force -Path "C:\Users\QC\.claude\skills\ecom\ui-logic-debugging"
```

---

- [ ] **Step 2: Run RED scenario — dispatch subagent WITHOUT the skill**

```
You are debugging a Next.js 14 App Router + Supabase ecommerce app (Pakistani fashion store).

Two bugs have been reported:

Bug 1: The Women's Collection page has three tabs: "All", "Stitched", and "Unstitched". A "Trending" tab was added last week. After that deploy, the "Unstitched" tab now shows 0 products even though there are 12 unstitched products in Supabase. The "Stitched" tab works fine. The "Trending" tab works fine.

The current filter logic (simplified):
  const filtered = products.filter(p => {
    if (activeTab === 'trending') return p.is_trending
    if (activeTab === 'unstitched') return p.category === 'unstitched'
    if (activeTab === 'stitched') return p.category === 'stitched'
    return true  // 'all'
  })

Bug 2: A product has is_sale = false in Supabase. Its price is 2500 PKR and sale_price is 2000 PKR. On the product card it shows "2000 PKR" (the sale price) with a red badge. The ProductCard component renders price like this:
  const displayPrice = product.sale_price ?? product.price

Diagnose both bugs. For each: name the root cause and show the exact code fix.
```

Expected RED failures:
- Agent may not trace the full chain (URL param → state var → filter predicate) for Bug 1
- Agent may not immediately spot that `sale_price ?? product.price` uses nullish coalescing on a field that has a value even when `is_sale` is false
- Agent may suggest complex solutions before checking the `is_sale` flag

---

- [ ] **Step 3: Write the GREEN skill — create SKILL.md**

Write the following content exactly to `C:\Users\QC\.claude\skills\ecom\ui-logic-debugging\SKILL.md`:

```markdown
---
name: ecom-ui-logic-debugging
description: Use when a tab or filter stops returning correct results after a nearby code change, sale price appears on a non-sale product or is missing from a sale product, cart total differs from checkout total, a badge count is wrong especially at zero or one, or client state leaks from a previous page.
---

# UI & Logic Debugging — ZADII'S Stack

## When to Use
- Tab / filter returns wrong or empty results after a related change
- Sale price showing on non-sale product (or missing on sale product)
- Cart price differs from checkout total
- Order badge or cart count shows wrong number at 0 or 1
- State from a previous page visit leaks into the current page

## Quick Reference

| Symptom | Where to look first |
|---|---|
| Filter returns wrong results | Trace: URL param → state var → filter predicate |
| Sale price wrong | Does the component check `is_sale` or just `sale_price`? |
| Cart total ≠ checkout | Cart item is stale vs current DB price |
| Badge count off at 0 or 1 | Test the 0→1 and 1→0 transitions specifically |
| State leaks between pages | `useState` not keyed on `pathname` or `searchParams` |

## Core Patterns

**Filter regression — trace the full chain**

A break anywhere in this chain produces wrong results silently:

```
URL param → state variable → filter predicate → (optional) SQL WHERE
```

Instrument each link before assuming anything:

```ts
console.log('[filter] param:', searchParams.get('tab'))
console.log('[filter] activeTab state:', activeTab)
console.log('[filter] filtered count:', filtered.length)
```

**Sale price source of truth — always check `is_sale` first**

```ts
// BAD — shows sale_price even when is_sale is false
const displayPrice = product.sale_price ?? product.price

// GOOD — is_sale is the canonical source of truth
const displayPrice = product.is_sale ? product.sale_price : product.price
```

Never derive sale price independently of `is_sale`. Any component that reads `sale_price` without checking `is_sale` is a latent bug.

**Cart stale state — revalidate at checkout, not at add-to-cart**

Cart lives in localStorage. Prices and stock change in Supabase. Revalidate at checkout:

```ts
const { data: currentProducts } = await supabase
  .from('products')
  .select('id, price, is_sale, sale_price, stock')
  .in('id', cartItems.map(i => i.id))
// Then cross-check cartItems against currentProducts before showing order total
```

**Client state across navigation**

Next.js App Router does not reset `useState` on soft navigation. Derive state from `searchParams` instead:

```tsx
// BAD — activeFilter persists when user navigates
const [activeFilter, setActiveFilter] = useState('all')

// GOOD — resets automatically on navigation
const activeFilter = searchParams.get('filter') ?? 'all'
```

**Tab/filter combo regression**

When two filters interact, test every combination — not each in isolation. Single-filter tests pass while the combo fails silently.

## Real Incident

Unstitched tab + Trending tab combo: each worked alone but the Trending filter's `is_trending` check was applied as an additional condition to all tabs after a refactor, making Unstitched always return 0. Fix: rewrote the filter predicate with explicit `if/else` branches per tab. (commit `10f413c`)
```

---

- [ ] **Step 4: Run GREEN scenario — same prompt, skill present**

Expected GREEN pass criteria:
- Agent immediately traces the filter chain for Bug 1 and identifies the predicate logic as the issue
- Agent immediately spots that `sale_price ?? product.price` ignores `is_sale` for Bug 2 and provides the `is_sale` check fix

---

- [ ] **Step 5: REFACTOR — close any new gaps**

Add counters for any remaining rationalizations. Re-dispatch until passing.

---

- [ ] **Step 6: Final commit**

```powershell
git -C "C:\Users\QC\Desktop\ecom-business-project" commit -m "feat: add ecom-ui-logic-debugging skill (TDD verified)"
```

---

## Self-Review Checklist

- [x] Spec coverage: all 4 layers from spec section 3 have a task
- [x] Acceptance criteria from spec section 6: each skill has frontmatter, quick-reference table, real incident with commit hash, under 400 words
- [x] No placeholders — all SKILL.md content is complete and inline
- [x] Type consistency — no cross-task references to types or functions
- [x] TDD cycle: every task has explicit RED dispatch → GREEN write → GREEN verify → REFACTOR sequence
- [x] Skill directory path consistent across all 4 tasks: `C:\Users\QC\.claude\skills\ecom\`
