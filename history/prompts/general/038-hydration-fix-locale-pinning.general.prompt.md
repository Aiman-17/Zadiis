---
id: 038
title: Hydration Error Fix Locale Pinning
stage: green
date: 2026-06-24
surface: agent
model: claude-sonnet-4-6
feature: dashboard
branch: main
user: Aiman-17
command: inline implementation
labels: ["bug","hydration","ssr","locale","dashboard"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/components/admin/DashboardCharts.tsx
tests:
  - manual: dashboard loads on localhost without hydration error in console
  - manual: PKR numbers render consistently between server and client
  - manual: sales trend day labels render consistently
---

## Prompt

how to add bot security settings in cloudflare

[Separate issue] This error on localhost — Hydration failed because the server rendered text didn't match the client.

[Follow-up] tell me

[Follow-up] make phr and deploy it also tell what is total inventory value in analytics inventory card

## Response snapshot

Root cause identified: `toLocaleString()` and `toLocaleDateString()` without an explicit locale argument use the environment's default locale. Node.js server and the user's browser have different locale defaults, so React saw mismatched HTML on hydration and threw the error.

Fixed 4 instances in DashboardCharts.tsx by pinning all calls to `'en-US'`:
1. `pkr()` helper: `Number(n).toLocaleString()` → `Number(n).toLocaleString('en-US')`
2. Sales trend label: `toLocaleDateString('default', ...)` → `toLocaleDateString('en-US', ...)`
3. Total stock sub-count: `totalStock.toLocaleString()` → `totalStock.toLocaleString('en-US')`
4. Recent orders date cell: `toLocaleDateString()` → `toLocaleDateString('en-US')`

Also answered Cloudflare bot questions: Bot Fight Mode at Security → Bots, AI Scrapers toggle to block GPTBot/ClaudeBot/etc.

## Outcome

- ✅ Impact: Hydration error eliminated — server and client now always produce identical locale-formatted strings
- 🧪 Tests: Manual — no hydration warning in dev console, dashboard renders cleanly
- 📁 Files: 1 file modified (DashboardCharts.tsx)
- 🔁 Next prompts: n/a
- 🧠 Reflection: Classic SSR/hydration pitfall. Always pin locale in components that run on both server and client. `'en-US'` is safe for this codebase since PKR formatting is handled by the `PKR` prefix string anyway.

## Evaluation notes (flywheel)

- Failure modes observed: locale-dependent formatting in SSR client components
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
