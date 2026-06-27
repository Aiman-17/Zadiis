---
id: 049
title: Product Lifecycle & Merchandising Engine
stage: green
date: 2026-06-27
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: aurex707@gmail.com
command: product lifecycle for zadiis.com.pk — new arrival, just dropped, trending, best seller, last chance
labels: ["merchandising","product-lifecycle","new-arrival","trending","bestseller","badges","home-page"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - docs/migrations/2026-06-26-merchandising-fields.sql
  - store/src/types/index.ts
  - store/src/lib/products.ts
  - store/src/components/products/ProductCard.tsx
  - store/src/app/(store)/page.tsx
  - store/src/app/(store)/new-arrivals/page.tsx
  - store/src/app/admin/products/new/page.tsx
  - store/src/app/admin/products/[id]/edit/EditProductForm.tsx
tests:
  - TypeScript noEmit — 0 errors
  - Home page section order: Trending > New Arrivals > Just Dropped > Best Sellers > Last Chance
  - New arrivals excluded from shop page
  - Just dropped: 72hr window, excludes new_arrival products
  - ProductCard: on-image icons (🔥 ⭐ ✨ ⚡), text badge below title
---

## Prompt

Product lifecycle for zadiis.com.pk — independent merchandising states (not a sequential pipeline):
- New Arrival (manual, collection-based, start/expiry dates)
- Just Dropped (automatic, 72hr, non-new-arrival products)
- Trending (velocity-based, DB flag is_trending)
- Best Seller (score-based, existing system)
- Last Chance (stock ≤ 3, no_restock flag)

Researched against ASOS/Zara/SHEIN patterns and ecommerce badge UX studies. Confirmed decisions:
- New Arrival: manual + collection-based, expiry date or "until next collection"
- Just Dropped: 72hr (not 7 days), automatic
- Trending: velocity ratio ≥ 1.5 over 7 days
- Last Chance: stock ≤ 3 AND no_restock = true
- Max 2 badges per card (research-validated)
- Home order: Trending > New Arrivals > Just Dropped > Best Sellers > Last Chance

## Response snapshot

**DB migration** — added to existing migration file:
- `collection_name` text — e.g. "Eid Collection 2026"
- `new_arrival_start` date — launch date (optional)
- `new_arrival_end` date — expiry date (null = manual retirement only)
- `no_restock` boolean — enables Last Chance badge

**Types** — added 4 new optional fields to Product type

**products.ts**:
- `getJustDroppedProducts`: changed from 7-day to 72-hour window; added `is_new_arrival = false` filter
- `getNewArrivalProducts`: new function — `is_new_arrival=true` + active date window
- `getProducts` (shop): excludes active new arrivals (`is_new_arrival=false OR new_arrival_end < today`)

**ProductCard**:
- On-image top-right icon: 🔥 trending, ⭐ bestseller, ✨ new arrival, ⚡ just dropped
- Text badge below title updated to use DB flags (is_new_arrival, is_trending, 72hr age)
- Badges smaller (reduced padding)

**Home page**:
- New section order: Trending > New Arrivals > Just Dropped > Best Sellers > Last Chance
- New Arrivals section uses `getNewArrivalProducts` (DB-flag based, not age-based)
- "View All New Arrivals" → /new-arrivals link

**/new-arrivals page** (NEW):
- Groups products by collection_name when multiple collections exist
- Server component, supabaseAdmin, force-dynamic
- Shows product count, "freshly launched" subtitle

**Admin forms** (add + edit):
- When ✦ New Arrival is checked: Collection Name, Launch Date, Expiry Date fields appear (purple panel)
- No Restock checkbox near stock field

## Outcome

- ✅ Architecture: independent merchandising states (not sequential lifecycle)
- ✅ New Arrivals: manual, collection-based, date-windowed
- ✅ Just Dropped: 72hr automatic, excludes new arrivals
- ✅ On-image icons: 🔥 ⭐ ✨ ⚡ per product state
- ✅ /new-arrivals: dedicated page with collection grouping
- ✅ Admin: collection_name, new_arrival_start, new_arrival_end, no_restock in add/edit forms
- ⏳ Next: run SQL migration in Supabase, related products algorithm, trending score automation

## Evaluation notes (flywheel)

- Key insight: independent states not a pipeline (validated by ChatGPT + industry research)
- New arrivals excluded from shop = clean separation, re-appear when expiry passes
- 72hr Just Dropped window creates genuine urgency vs old 7-day window
- Max 2 badges: text badge + icon — not redundant because icon is on-image, text is below title
