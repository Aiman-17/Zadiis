---
id: 0008
title: Implement US4 PDF invoice with react-pdf
stage: green
date: 2026-07-08
surface: agent
model: claude-sonnet-5
feature: 004-post-launch-roadmap
branch: 004-post-launch-roadmap
user: Aiman-17
command: /sp.implement
labels: ["pdf-invoice", "react-pdf", "implementation"]
links:
  spec: specs/004-post-launch-roadmap/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - store/package.json
 - store/src/lib/fonts/Inter-Regular.ttf
 - store/src/lib/fonts/Inter-SemiBold.ttf
 - store/src/lib/fonts/PlayfairDisplay-Bold.ttf
 - store/src/lib/fonts/SOURCE.md
 - store/src/lib/invoice-pdf.tsx
 - store/src/lib/email.ts
 - store/next.config.ts
 - store/scripts/verify-invoice-pdf.mjs
 - specs/004-post-launch-roadmap/tasks.md
tests:
 - store/scripts/verify-invoice-pdf.mjs (via npm run verify:invoice-pdf) — 2/2 checks passed, valid PDF buffers
 - npm run build — clean
 - npm run lint — zero new issues in touched files
---

## Prompt

> (continuation of /sp.implement task execution for US4, tasks T024-T029)

## Response snapshot

Implemented T024-T028: added `@react-pdf/renderer`; sourced real static-weight TTF fonts (after two dead ends — the `google/fonts` source repo only has variable-axis files, `@fontsource/*` npm packages only ship woff/woff2 — resolved via the legacy-User-Agent technique against Google's font CDN, confirmed genuine TrueType via `file`); built `store/src/lib/invoice-pdf.tsx` (a `Document`/`Page` component tree matching `buildInvoiceDocument`'s content, verified `@react-pdf/renderer` v4.5.1's actual API via its installed `.d.ts` files rather than assumption); swapped the attachment block in `email.ts` and deleted the now-dead `buildInvoiceDocument`; added `outputFileTracingIncludes` to `next.config.ts` after checking the project's own bundled Next.js docs (per `store/AGENTS.md`'s explicit warning not to trust training-data assumptions about this Next.js version) — the font files are read via a dynamic `path.join()` at runtime, which Next.js's serverless file-tracer can't always discover statically.

**Hit and root-caused a real bug**: the first automated-test attempt (`store/tests/admin/invoice-pdf.spec.ts`) threw `Cannot read properties of null (reading 'props')` inside `@react-pdf/renderer`'s reconciler when run under Playwright Test. Isolated via a standalone `tsx` script calling the identical function — that produced a correct 17KB PDF. Root cause: Playwright Test's own esbuild bundler mishandles this library's custom React reconciler when a `.tsx` file importing it is pulled into its transform pipeline — a test-infrastructure incompatibility, not a bug in the production code path (which runs through Next.js's SWC bundler, not Playwright's). Fixed by moving the check to a plain script (`store/scripts/verify-invoice-pdf.mjs`, run via `npm run verify:invoice-pdf`) outside Playwright's transform entirely.

## Outcome

- ✅ Impact: US4 fully implemented — online payment-confirmation emails now attach a real, brand-styled PDF instead of an HTML file. Build and lint clean.
- 🧪 Tests: `npm run verify:invoice-pdf` — 2/2 passing (with and without transaction_id); `npm run build` clean; `npm run lint` — zero new issues.
- 📁 Files: see files list above.
- 🔁 Next prompts: manual verification (T029, a real emailed PDF opened by the user); then `/sp.specify` for spec `006-conversion-and-admin-enhancements` covering the remaining 10 items.
- 🧠 Reflection: two separate "verify before trusting" moments paid off this session — checking the installed library's actual `.d.ts` files instead of assuming its API, and checking this project's own bundled Next.js docs instead of assuming `outputFileTracingIncludes` syntax/availability. Both would have been plausible-sounding guesses that could have been subtly wrong.

## Evaluation notes (flywheel)

- Failure modes observed: two font-sourcing dead ends (variable fonts, woff-only packages) before finding a working source; one test-infrastructure incompatibility (Playwright bundler vs. react-pdf reconciler) requiring root-cause isolation before the real fix.
- Graders run and results (PASS/FAIL): build — PASS; lint — PASS; verify:invoice-pdf — PASS (2/2).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
