---
id: 056
title: Admin Auth Cookie and Logout Fix
stage: general
date: 2026-06-29
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: fix admin cookie auth and logout
labels: ["admin", "auth", "cookie", "security", "next.js"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/api/admin/auth/route.ts
  - store/src/proxy.ts
  - store/src/app/admin/layout.tsx
  - store/src/app/admin/login/page.tsx
tests:
  - store/tests/admin-auth-full.mjs (Playwright — 11/11 pass)
---

## Prompt

What settings do you add after one time login than logout the proxy not working on same device. Without entering password second time the admin pages redirecting successfully.

## Response snapshot

Identified three bugs:
1. Logout used `router.push('/admin/login')` — soft RSC navigation did not wait for the Set-Cookie (maxAge=0) to clear the cookie, so the browser kept sending the old cookie on the next request, bypassing the proxy.
2. Cookie value stored the raw `ADMIN_PASSWORD` — visible in DevTools → Application → Cookies.
3. `cookies.delete()` is less reliable than setting `maxAge: 0` explicitly.

Fixes applied:
- `auth/route.ts` POST: cookie value changed to static session token `zadiis-admin-session-v1` with `secure: true`, `sameSite: lax`, `maxAge: 7d`.
- `auth/route.ts` DELETE: uses `maxAge: 0` explicit expiry instead of `cookies.delete()`.
- `proxy.ts`: checks `cookie.value === 'zadiis-admin-session-v1'` instead of `ADMIN_PASSWORD`.
- `layout.tsx` logout: changed to `window.location.href = '/admin/login'` (full reload commits cookie deletion before next request).

Also fixed in previous part of session:
- `login/page.tsx`: wrapped `useSearchParams()` in `<Suspense>` to fix prerender build error (commit `fabae90`).

## Outcome

- ✅ Impact: Admin login and logout work correctly end-to-end. Logout actually clears the session. Password no longer exposed in cookie store.
- 🧪 Tests: Playwright full auth test — 11/11 pass (unauthenticated redirect, login, protected pages, logout, post-logout block)
- 📁 Files: 4 files modified, 3 commits pushed (fabae90, ed68937, and prior 0a6e6d0)
- 🔁 Next prompts: none pending on admin auth
- 🧠 Reflection: The root cause pattern (router.push vs window.location.href for cookie-dependent navigation) applies to both login and logout. Both were fixed. Cookie security hardened simultaneously.

## Evaluation notes (flywheel)

- Failure modes observed: router.push() missing cookie on RSC navigation — same root cause for login and logout
- Graders run and results (PASS/FAIL): Playwright admin-auth-full.mjs — PASS 11/11
- Prompt variant (if applicable): null
- Next experiment: null
