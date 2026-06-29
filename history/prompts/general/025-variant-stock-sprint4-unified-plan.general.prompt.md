---
id: "025"
title: Variant Stock Sprint 4 Unified Implementation Plan
stage: plan
date: 2026-06-23
surface: agent
model: claude-sonnet-4-6
feature: variant-stock-sprint4
branch: main
user: Aiman-17
command: resume + writing-plans skill
labels: ["variant-stock","sprint4","sales","seo","trust-strip","policy-pages","bestsellers","reviews","checkout"]
links:
  spec: docs/superpowers/specs/2026-06-23-variant-stock-reviews-checkout-design.md
  ticket: null
  adr: null
  pr: null
files:
  - docs/superpowers/plans/2026-06-23-variant-stock-sprint4-unified.md
tests:
  - manual: admin variant stock grid saves and reloads correctly
  - manual: sold-out size/color shows disabled (not hidden) on PDP
  - manual: checkout email is required (HTML5 validation)
  - manual: review privacy message appears below submit button
  - manual: /sitemap.xml lists all active product URLs
  - manual: /sale countdown counts down, products show red sale price
  - manual: active sale banner appears on homepage, disappears when deactivated
---

## Prompt

User asked to resume a previous context-compacted session. The session had completed the unified spec (commit 1fbe091) covering:
- variant_stock JSONB column (single source of truth for per-size×color stock)
- Sold-out variants disabled (not hidden) on product detail page
- Privacy trust message on reviews: "🔒 Your privacy matters to us..."
- Checkout email mandatory (not optional)
- Image sizes prop fixes for hero + gallery
- Sprint 4: trust strip 3→5, policy pages, 3-column footer, SEO, admin sales, sale page, best sellers

The implementation plan had NOT yet been written when the context was compacted.

## Response snapshot

Wrote comprehensive 10-task implementation plan to `docs/superpowers/plans/2026-06-23-variant-stock-sprint4-unified.md` covering:

1. **Task 1** — DB migration SQL: `variant_stock` JSONB, `is_bestseller`, `orders.is_sale`, `sales` table, `sale_products` table, updated `decrement_stock` RPC with optional `p_color`/`p_size` params
2. **Task 2** — TypeScript types: `VariantStock`, updated `Product`, `Order.is_sale`, new `Sale`, `SaleProduct`
3. **Task 3** — Admin: new `VariantStockGrid` shared component, updated `EditProductForm` + new product page, `is_bestseller` toggle
4. **Task 4** — `AddToCartButton` disabled variant logic, updated RPC calls in `orders/route.ts` and `tracker/route.ts`
5. **Task 5** — Quick fixes: review privacy message, checkout email required, `sizes` prop on hero + gallery images
6. **Task 6** — Trust strip 3→5 items, `/returns` `/shipping` `/privacy` pages, 3-column footer
7. **Task 7** — SEO: OG metadata in layout, `sitemap.ts`, `robots.ts`, `generateMetadata` + JSON-LD on product pages
8. **Task 8** — Admin sales CRUD: API routes, list/new/edit pages with product management UI
9. **Task 9** — Sale API, delivery override at checkout, `is_sale` flag, `sendOwnerSaleOrder` email
10. **Task 10** — Sale store page + countdown timer, homepage sale banner + best sellers, ProductCard sale badge

Critical corrections incorporated vs spec:
- RPC name stays `decrement_stock` (not renamed)
- `variant_stock: {}` = legacy backward-compatible (no filtering applied)
- Sentinel key `"_"` for missing color/size dimension

## Outcome

- ✅ Impact: Complete implementation plan for all features across 10 dependency-ordered tasks with exact file paths, complete code blocks, and manual test steps
- 🧪 Tests: Manual test steps included per task; TypeScript check (`npx tsc --noEmit`) as gate per task
- 📁 Files: 1 plan file created
- 🔁 Next prompts: Execute plan (subagent-driven or inline)
- 🧠 Reflection: Single `variant_stock` JSONB design is cleaner than the initially proposed Option A (independent size_stock + color_stock columns) — no sync issues, single DB column, atomic RPC updates

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
