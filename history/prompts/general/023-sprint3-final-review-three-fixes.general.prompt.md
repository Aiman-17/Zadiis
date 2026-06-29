---
id: "023"
title: Sprint 3 Final Review Three Fixes
stage: general
date: 2026-06-21
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /sp.phr
labels: ["bugfix", "race-condition", "invoice", "email-ordering", "null-guard", "sprint3", "code-review"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/supabase/sprint3.sql
  - store/src/lib/invoice.ts
  - store/src/app/api/admin/orders/route.ts
  - store/src/app/admin/invoices/[id]/print/page.tsx
  - .git/sdd/final-fix-report.md
tests:
  - npx tsc --noEmit (0 errors)
---

## Prompt

fix three sprint3 code review issues

## Response snapshot

Read `C:\Users\QC\Desktop\ecom-business-project\.git\sdd\final-fix-brief.md` for the full brief, then applied all 3 fixes in a single commit: (1) replaced SELECT-then-INSERT `nextInvoiceNumber()` in `invoice.ts` with an atomic `get_next_invoice_number()` PL/pgSQL RPC backed by a PostgreSQL sequence, and appended the sequence + function DDL to `sprint3.sql`; (2) restructured the `PUT` handler in `admin/orders/route.ts` to defer all email sends (`sendCustomerOrderDelivered`, `sendOwnerPaymentReceived`) until after the DB update succeeds; (3) added `!inv.orders` to the `notFound()` guard in the invoice print page. TypeScript check passed (0 errors). Committed as `accf29894057d6e0460d790440abcdeb8660103c`.

## Outcome

- ✅ Impact: Three correctness bugs from the Sprint 3 final code review are resolved: invoice number race condition eliminated via DB sequence, email-before-DB-update ordering fixed, and null join crash on invoice print page guarded.
- 🧪 Tests: `npx tsc --noEmit` — 0 errors
- 📁 Files: store/supabase/sprint3.sql, store/src/lib/invoice.ts, store/src/app/api/admin/orders/route.ts, store/src/app/admin/invoices/[id]/print/page.tsx
- 🔁 Next prompts: Run sequence migration on production DB with correct START value derived from existing max invoice number; consider wrapping email sends in try/catch to avoid PUT returning 500 on email failure after successful DB update.
- 🧠 Reflection: The DB-update-before-email ordering bug is a classic "side-effect before persistence" antipattern; structuring the handler as fetch → update → side-effects is the correct mental model and should be applied to any future email-triggering endpoints.

## Evaluation notes (flywheel)

- Failure modes observed: None — brief was precise with exact before/after code blocks; all substitutions were unambiguous.
- Graders run and results (PASS/FAIL): TypeScript check PASS (0 errors).
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add the sequence START value derivation SQL as a comment in sprint3.sql so the migration runner knows to adjust it for live DBs with existing invoices.
