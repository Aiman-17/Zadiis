---
id: "027"
title: Trust Strip Policy Pages Footer
stage: general
date: 2026-06-23
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /sp.phr
labels: ["trust-bar", "policy-pages", "footer", "lucide-react", "next.js", "ui"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/(store)/page.tsx
  - store/src/app/(store)/returns/page.tsx
  - store/src/app/(store)/shipping/page.tsx
  - store/src/app/(store)/privacy/page.tsx
  - store/src/components/layout/Footer.tsx
  - .superpowers/sdd/task-6-report.md
tests:
  - none
---

## Prompt

You are implementing Task 6 of a Next.js e-commerce project (ZADIIS). This task expands the trust strip, creates policy pages, and updates the footer.

**Project root:** `C:\Users\QC\Desktop\ecom-business-project`
**Store app:** `C:\Users\QC\Desktop\ecom-business-project\store`

Read your requirements first:
`C:\Users\QC\Desktop\ecom-business-project\.superpowers\sdd\task-6-brief.md`

**Key context:**

**1. Trust bar in `store/src/app/(store)/page.tsx`**
Currently imports `{ Truck, RefreshCw, Shield }` from lucide-react. Expand to 5 items by adding `Lock` and `Star` to the import, then add two new trust items in the bar:
- `<Lock size={18} style={{ color: '#A68B6E' }} /> 100% authentic products`
- `<Star size={18} style={{ color: '#A68B6E' }} /> 500+ happy customers`
Keep the existing 3 items unchanged. Change `max-w-4xl` to `max-w-5xl` on the inner div.

**2. Policy pages** — create three new files:
- `store/src/app/(store)/returns/page.tsx`
- `store/src/app/(store)/shipping/page.tsx`
- `store/src/app/(store)/privacy/page.tsx`

Each is a static server component with `export const metadata` and content from the brief.

**3. Footer**
First, find the footer file:
```
grep -r "footer\|Footer" C:\Users\QC\Desktop\ecom-business-project\store\src --include="*.tsx" -l
```
Read it before editing. Replace its content with a 3-column footer: Brand | Quick Links (Shop, Cart, Sale) | Policies (Returns & Exchanges → /returns, Shipping Info → /shipping, Privacy Policy → /privacy). Dark background `#1C1C1C`, text `#E8DDD4`, links hover to white. Import `Link` from `'next/link'`.

After implementing, run:
```
cd C:\Users\QC\Desktop\ecom-business-project\store && npx tsc --noEmit 2>&1 | head -20
```

Commit:
```
git add store/src/app/(store)/page.tsx store/src/app/(store)/returns/page.tsx store/src/app/(store)/shipping/page.tsx store/src/app/(store)/privacy/page.tsx
git add -A store/src/components/layout/ store/src/app/layout.tsx 2>/dev/null; true
git commit -m "feat: 5-item trust strip, policy pages, 3-column footer with policy links"
```
(The `-A` on layout/components may pick up any footer component file — that's intentional.)

**Report file:** `C:\Users\QC\Desktop\ecom-business-project\.superpowers\sdd\task-6-report.md`

**Return:** Status (DONE/BLOCKED/NEEDS_CONTEXT), commit hash, tsc errors, concerns.

## Response snapshot

Implemented all 5 steps of Task 6: expanded the trust bar in page.tsx from 3 to 5 items (adding Lock/Star icons and updating "Easy returns" to "Easy 7-day returns", widening to max-w-5xl), created three static policy pages (returns, shipping, privacy), and replaced the footer with a 3-column layout (Brand / Quick Links / Policies). TypeScript check passed with 0 errors. Committed as 337193e.

## Outcome

- ✅ Impact: Trust bar now shows 5 items with Lock and Star icons; three policy pages live at /returns, /shipping, /privacy; footer links to all three policy pages from Policies column.
- 🧪 Tests: npx tsc --noEmit — 0 errors
- 📁 Files: store/src/app/(store)/page.tsx (modified), store/src/app/(store)/returns/page.tsx (created), store/src/app/(store)/shipping/page.tsx (created), store/src/app/(store)/privacy/page.tsx (created), store/src/components/layout/Footer.tsx (modified)
- 🔁 Next prompts: Verify pages render correctly in dev server; add /sale route if not yet present; consider linking footer Quick Links to actual existing routes only
- 🧠 Reflection: Footer already had Link imported and 3-column layout — the replacement was clean. The brief's "Easy returns" → "Easy 7-day returns" text change was specified in the brief but not the user prompt instructions, worth noting for spec alignment.

## Evaluation notes (flywheel)

- Failure modes observed: None. All placeholders resolved, files created at expected paths, tsc clean.
- Graders run and results (PASS/FAIL): tsc --noEmit PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add an e2e smoke test that visits /returns, /shipping, /privacy and asserts h1 text is present.
