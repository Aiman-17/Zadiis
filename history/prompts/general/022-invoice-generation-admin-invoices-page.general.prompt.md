---
id: "022"
title: Invoice Generation Admin Invoices Page
stage: general
date: 2026-06-21
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /sp.phr
labels: ["invoice", "sprint3", "task12", "admin", "print-pdf", "supabase", "next.js"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/lib/invoice.ts
  - store/src/app/api/admin/invoices/route.ts
  - store/src/app/api/admin/invoices/[id]/route.ts
  - store/src/app/admin/invoices/page.tsx
  - store/src/app/admin/invoices/[id]/print/page.tsx
  - store/src/app/admin/invoices/[id]/print/PrintButton.tsx
  - store/src/app/api/webhooks/safepay/route.ts
  - store/src/app/api/admin/orders/route.ts
  - store/src/app/admin/layout.tsx
tests:
  - npx tsc --noEmit (0 errors)
---

## Prompt

You are implementing Task 12 of Sprint 3 for the ZADIIS Pakistani women's fashion ecommerce store. This is the final task.
Working directory: C:\Users\QC\Desktop\ecom-business-project (store code in `store/` subdirectory).

**Read your requirements first:** `C:\Users\QC\Desktop\ecom-business-project\.git\sdd\task-12-brief.md`

The brief has everything: complete code for every file to create/modify, exact insertion points, and the commit command.

Key constraints:
- `export const dynamic = 'force-dynamic'` MUST be the VERY FIRST line in the print page (before ALL imports)
- No arbitrary Tailwind color classes — brand colors via `style={{}}`
- `supabaseAdmin` from `@/lib/supabase/server` on all server routes
- Next.js 16 App Router: `params` is a Promise — always `const { id } = await params`
- `generateInvoice` is idempotent: checks for existing invoice before creating (safe to call multiple times)

After completing the work, run `cd store; npx tsc --noEmit` and write your full report to:
`C:\Users\QC\Desktop\ecom-business-project\.git\sdd\task-12-report.md`

Return only: STATUS, files created/modified, commit hash, one-line TypeScript check result, concerns (if any).

## Response snapshot

Implemented Task 12 in full: created `generateInvoice()` utility (idempotent, INV-XXXX sequencing), GET/DELETE API routes for invoices, admin invoices list page with time filters, print-to-PDF server page (with `dynamic = 'force-dynamic'` as line 1), and `PrintButton` client component. Modified safepay webhook and admin orders PUT handler to call `generateInvoice` after payment, and added Invoices nav entry to admin layout. One TypeScript fix was needed: cast `inv.orders as unknown as {...}` in the print page because Supabase infers FK joins as arrays. TypeScript check passed with 0 errors. Committed as `3d2f860`.

## Outcome

- ✅ Impact: Sprint 3 Task 12 (final task) complete — auto-invoice generation on payment, admin /invoices list with time filters + delete, print/PDF view that opens in new tab
- 🧪 Tests: `npx tsc --noEmit` — 0 errors (exit 0)
- 📁 Files: 6 created, 3 modified — all under store/src
- 🔁 Next prompts: Sprint 3 wrap-up / sprint review; database migration validation against sprint3.sql; end-to-end test of invoice flow (place order → pay → verify INV-XXXX generated)
- 🧠 Reflection: Supabase typed client infers foreign-key joins as arrays even for `.single()` queries; the fix is to cast through `unknown` rather than directly — a recurring pattern worth noting in the project constitution

## Evaluation notes (flywheel)

- Failure modes observed: Minor — Supabase generic type mismatch on FK join required `as unknown as` double cast, which the brief did not anticipate. Otherwise no failures.
- Graders run and results (PASS/FAIL): TypeScript strict check — PASS
- Prompt variant (if applicable): task-brief-driven (brief contained full code; agent executed verbatim + fixed TS error)
- Next experiment (smallest change to try): Add `as unknown as` pattern note to the project CLAUDE.md or constitution so future tasks with Supabase FK joins avoid the TS error on first pass
