---
id: 028
title: SEO OG Metadata Sitemap Robots JSON-LD
stage: general
date: 2026-06-23
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: implement task-7-brief.md
labels: ["seo","metadata","sitemap","robots","json-ld","next.js"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/layout.tsx
  - store/src/app/sitemap.ts
  - store/src/app/robots.ts
  - store/src/app/(store)/shop/[slug]/page.tsx
  - .superpowers/sdd/task-7-report.md
tests:
  - npx tsc --noEmit (0 errors)
---

## Prompt

You are implementing Task 7 of a Next.js e-commerce project (ZADIIS). This task adds SEO: OG metadata to root layout, sitemap.ts, robots.ts, and generateMetadata + JSON-LD on the product detail page.

[Full brief at .superpowers/sdd/task-7-brief.md]

## Response snapshot

Implemented all four steps of Task 7:
1. Replaced `metadata` export in `store/src/app/layout.tsx` with full OG/Twitter/metadataBase config including title template.
2. Created `store/src/app/sitemap.ts` — async sitemap querying Supabase for active products + static routes.
3. Created `store/src/app/robots.ts` — disallows /admin/, /api/, /order/; points to sitemap.xml.
4. Updated `store/src/app/(store)/shop/[slug]/page.tsx` — added `generateMetadata` (async params, Supabase fetch, OG tags) and JSON-LD Product schema `<script>` block with InStock/OutOfStock availability.
TypeScript check: 0 errors. Committed as 0855bd9.

## Outcome

- ✅ Impact: All four SEO files changed/created; product pages now emit OG tags and Schema.org JSON-LD; sitemap and robots endpoints live.
- 🧪 Tests: tsc --noEmit passed with 0 errors
- 📁 Files: 4 files modified/created, report written to .superpowers/sdd/task-7-report.md
- 🔁 Next prompts: Manual verification of /sitemap.xml and /robots.txt on dev server; consider adding canonical URL meta tag
- 🧠 Reflection: `params` typed as `Promise<{ slug: string }>` to match existing Next.js 15 async-params convention in the file; `sku` being optional is harmless in JSON-LD (serialized as absent key).

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): tsc PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): add canonical URL to generateMetadata return
