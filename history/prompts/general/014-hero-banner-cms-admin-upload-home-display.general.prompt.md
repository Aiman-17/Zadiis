---
id: "014"
title: Hero Banner CMS Admin Upload Home Display
stage: general
date: 2026-06-20
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /sp.phr
labels: ["hero-banner", "cms", "admin-settings", "image-upload", "next-image", "supabase", "sprint2"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/admin/settings/page.tsx
  - store/src/app/(store)/page.tsx
tests:
  - none
---

## Prompt

You are implementing Task 4 of Sprint 2 for ZADIIS, a Pakistani women's fashion ecommerce store.

## Stack
- Next.js 16.2.7 App Router, TypeScript, Tailwind CSS v4
- Supabase for DB + Storage
- Working directory: `C:\Users\QC\Desktop\ecom-business-project\store`
- Brand: bg=#FAF8F5, text=#1C1C1C, accent=#A68B6E, border=#E8DDD4
- IMPORTANT: No arbitrary Tailwind color classes — use `style={{ color: '...' }}` inline for brand colors
- Fonts: Playfair Display (headings), Inter (body)

## Existing infrastructure (already working — do NOT change these)
- `src/app/api/admin/settings/route.ts` — GET returns `Record<string,string>`, POST accepts `{ key, value }` to upsert
- `src/app/api/admin/upload/route.ts` — POST accepts FormData with `file`, returns `{ url: string }`
- Both APIs exist and work

## Task: Two files to modify

### File 1: `src/app/admin/settings/page.tsx`
Added heroImage/heroUploading state, updated useEffect to load hero_image from settings, added uploadHero() function, and added Hero Banner card as the first card in the settings page with file upload, preview, and remove functionality.

### File 2: `src/app/(store)/page.tsx`
Added next/image import, supabaseAdmin import, getHeroImage() async function, Promise.all fetch for hero alongside featured products, and updated Hero section to conditionally render the banner image with overlay text styling.

## Response snapshot

Implemented Task 4 of Sprint 2 (Hero Banner CMS). Made 4 targeted edits to `src/app/admin/settings/page.tsx` (new state vars, updated useEffect, uploadHero function, Hero Banner card UI) and rewrote `src/app/(store)/page.tsx` to fetch the hero image from `store_settings` via supabaseAdmin and render it via `next/image` with `fill`. Confirmed `next.config.ts` already had wildcard remote patterns so no changes were needed. Build passed cleanly (`npm run build`) with 0 TypeScript errors across 24 routes. Committed as `feat: hero banner CMS — upload in admin settings, display on home page` (commit `0e4f4f3`).

## Outcome

- ✅ Impact: Admin can upload/replace/remove a hero banner image via Settings page; the home page fetches and displays it server-side using next/image with fill and a dark overlay for legibility
- 🧪 Tests: No automated tests run; build TypeScript check passed
- 📁 Files: store/src/app/admin/settings/page.tsx, store/src/app/(store)/page.tsx
- 🔁 Next prompts: Task 5 of Sprint 2 (next sprint task); verify hero banner renders correctly in browser
- 🧠 Reflection: next.config.ts wildcard `hostname: '**'` already covered Supabase Storage URLs — always check config before adding remote patterns to avoid duplicates

## Evaluation notes (flywheel)

- Failure modes observed: None — all changes applied cleanly, build succeeded first attempt
- Graders run and results (PASS/FAIL): npm run build — PASS (0 errors, 24 routes)
- Prompt variant (if applicable): Task specification with exact current file content provided inline
- Next experiment (smallest change to try): Add error toast in uploadHero() when upload API returns non-ok response
