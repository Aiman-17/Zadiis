---
id: 054
title: Admin 401 Console Error — Login Layout Poll Fix
stage: general
date: 2026-06-29
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: aurex707@gmail.com
command: investigate admin 401 error when clicking pages without password
labels: ["admin", "auth", "proxy", "debug", "layout"]
links:
  spec: "null"
  ticket: "null"
  adr: "null"
  pr: "null"
files:
  - store/src/app/admin/layout.tsx
tests:
  - "null"
---

## Prompt

> Test admin with proxy and security If I click dashboard or any other page without password. Why is server returning 401 error already has env in vercel.

## Response snapshot

**Root cause identified:** `admin/layout.tsx` is a client component (`'use client'`) that wraps ALL routes under `/admin/` — including `/admin/login`. Its `useEffect` fires immediately on mount and polls `/api/admin/orders` every 30 seconds to show the new-order badge in the sidebar.

When the user is NOT logged in and visits `/admin/login`:
1. Proxy allows `/admin/login` through (it's in the exclusion list)
2. The layout renders (including the login page content as `children`)
3. The `useEffect` fires → calls `fetch('/api/admin/orders')`
4. Proxy blocks that API call → 401 (correct security behavior)
5. Browser console shows: "Failed to load resource: 401"
6. `layout.tsx:30` already handles `!res.ok` by returning early — no functional impact, only cosmetic console noise

**The proxy and Vercel env var are correct.** The 401 is NOT a sign that login is broken — it's the order-badge poll hitting a protected endpoint while unauthenticated.

**Fix applied:** Added `pathname === '/admin/login'` early-return check at the top of the `useEffect`, and changed the dependency array from `[]` to `[pathname]` so the poll restarts cleanly when navigating between admin pages.

```diff
- useEffect(() => {
+ useEffect(() => {
+   if (pathname === '/admin/login') return
    const check = async () => {
      ...
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
- }, [])
+ }, [pathname])
```

## Outcome

- ✅ Impact: Eliminates spurious 401 in browser console on the login page; security is unchanged — the proxy still blocks all unauthenticated access to `/api/admin/*`
- 🧪 Tests: No automated tests; verified by reading the proxy logic and layout code
- 📁 Files: store/src/app/admin/layout.tsx (1 file, 3-line change)
- 🔁 Next prompts: commit and push; redeploy to Vercel
- 🧠 Reflection: Next.js layouts wrap child pages including the login page itself — always guard any API calls in layout `useEffect` against the login route to avoid false 401 noise

## Evaluation notes (flywheel)

- Failure modes observed: Layout shared with login page fires protected API calls on mount
- Graders run and results (PASS/FAIL): null
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): Move login page to a separate layout segment (`admin/(auth)/login`) to isolate it from the admin sidebar layout entirely
