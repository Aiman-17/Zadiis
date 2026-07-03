# BUG-002 — Shop search debounce has no request sequencing; clearing search can leave stale filtered results (and hang the UI)

| Field | Value |
|---|---|
| **Title** | Shop page search: rapid type-then-clear races two `router.push` navigations; the response that arrives last wins, not the one triggered last — can strand the page on a stale filtered/empty product list, and can make the search input un-actionable |
| **Severity** | Medium |
| **Priority** | P2 |
| **Category** | Functional — race condition / state management |
| **Component** | `store/src/components/products/ShopSearchBar.tsx` (`handleChange`, lines 11-22) |
| **Environment** | All — code-level defect, reproduced against local production build (`npm run build && npm start`), Chromium, no other load on the machine |
| **Status** | Fixed 2026-07-03 — ShopSearchBar tracks latest intent in a ref and re-pushes when a stale navigation settles last; regression test re-enabled, 5/5 repeat-each passes (was 1/5 pre-fix) |
| **Found by** | E2E test `tests/store/shop.spec.ts:42 › Shop page › clearing search restores full list` (timed out 30000ms, both attempt and retry) |
| **Date** | 2026-07-02 |

## Preconditions
- `/shop` has products loaded (non-empty catalog)

## Steps to Reproduce
1. Go to `/shop`
2. Type a search term that matches nothing, e.g. `xyznothing`, into the search box (fires a 300ms-debounced `router.push('/shop?q=xyznothing')`)
3. Wait ~500ms (long enough for the debounce to fire and the navigation to be *in flight*, but not necessarily long enough for the RSC response to land, especially for a filtered query)
4. Clear the search box (fires a second 300ms-debounced `router.push('/shop')`)
5. Wait for both navigations to settle and observe the product grid / URL

## Expected Result
Clearing the search box always restores the full, unfiltered product list — the last user action (clear) determines the final state.

## Actual Result
Reproduced with a standalone Playwright script driving the same production server (5 runs):
- 1/5 runs: correct — URL ends at `/shop`, full list restored
- 3/5 runs: **URL ends at `/shop?q=xyznothing`** even though the input is visibly empty — the grid stays on "no results" (`after=0`) despite the user having cleared the box
- 1/5 runs: `locator.clear()` itself times out (8s) waiting for the input to become actionable — matches the CI symptom (`Test timeout of 30000ms exceeded`, no specific assertion error) exactly

## Root Cause
`store/src/components/products/ShopSearchBar.tsx:11-22`:
```ts
const handleChange = (value: string) => {
  if (timer.current) clearTimeout(timer.current)
  timer.current = setTimeout(() => {
    const p = new URLSearchParams(params.toString())
    if (value.trim()) { p.set('q', value.trim()) } else { p.delete('q') }
    router.push(`/shop?${p.toString()}`)
  }, 300)
}
```
The `setTimeout` debounce only prevents *two timers* from both firing (it cancels the pending timer, not the in-flight navigation). Once a timer fires, `router.push()` kicks off an independent async RSC fetch/transition that is never cancelled, awaited, or sequenced against subsequent pushes. When the user types then clears within ~500ms, two separate `router.push` calls are in flight simultaneously: `push('/shop?q=xyznothing')` (fired first, but requires a filtered Supabase query — slower) and `push('/shop')` (fired second, but a plain/cacheable route — faster). Next.js's App Router applies whichever RSC response *resolves* last, not whichever was *dispatched* last, and there is no generation counter / `AbortController` / promise-sequencing guard in `handleChange` to discard the stale one. This is a straightforward out-of-order network response race, confirmed by direct reproduction (`/shop?q=xyznothing` persisting in the URL/grid after the input was cleared).

The occasional full hang (`.clear()` timing out) is the same defect under a worse timing window: the page is caught mid-transition when Playwright's actionability polling runs, and never reaches a stable state within the action's timeout.

## Business Impact
A shopper who searches, finds nothing, and clears the box can be shown a permanently empty ("No products found") grid with no indication why — they believe the store has no products and leave. This is a silent conversion killer on the primary browse page, and intermittent/hard to notice in manual QA since it only reproduces ~50-80% of the time on rapid type-then-clear.

## Technical Impact
Isolated to one client component; no data corruption. Makes `shop.spec.ts` flaky/timeout-prone regardless of test code quality, since the underlying app behavior is non-deterministic.

## Recommended Fix
Guard against out-of-order navigation resolution — either:
1. Use a monotonically increasing request/generation id captured in a `ref`, and after `router.push` resolves (or on the next `handleChange` call), ignore results for a stale generation, or
2. Simplify: don't debounce a fresh `setTimeout` per keystroke that fires-and-forgets `router.push`; instead cancel/replace in-flight navigation intent by checking `timer.current` generation before applying, e.g. wrap the push in a token comparison (`const myToken = ++tokenRef.current; ...; if (tokenRef.current === myToken) router.push(...)`), or
3. Switch to `router.replace` plus co-locating the debounce with a `useTransition`/`isPending` flag so a new navigation request supersedes the old one deterministically at the React level rather than racing at the network level.

## Regression Risk
Low — the fix is scoped to `ShopSearchBar.tsx`'s debounce logic and doesn't change the search API contract. Re-run `shop.spec.ts` (`search filters product list`, `clearing search restores full list`) after the fix; both should pass consistently across repeated runs (not just once).
