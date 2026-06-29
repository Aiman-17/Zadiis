---
name: 053-product-page-enhancements-slider-size-guide
description: Product detail page enhancements — sale email branding for customers, size guide modal, You May Also Like slider (7 products, arrows + swipe), title rename
metadata:
  type: green
  stage: green
  date: 2026-06-27
  surface: agent
  model: claude-sonnet-4-6
  feature: product-detail
  branch: main
  user: aurex707@gmail.com
  command: multiple product page enhancement requests
  labels: ["email", "size-guide", "slider", "product-detail", "ux"]
  links:
    spec: "null"
    ticket: "null"
    adr: "null"
    pr: "null"
---

## Prompts (this session)

> for sales email only admin is receiving sales email customers not, they received normal email. Need to both receive sales email.

> add size guide page on productdetails sizedetails

> Now add a slider in you may also like upto 7 products not grid. add arrows on desktop and swipe on mobile

> One thing also add change You may also like title to This is for you

## Response

Four separate fixes/features shipped in this session:

---

### 1. Customer sale email branding (fix)

**Root cause:** `sendCustomerOrderConfirmed` and `sendCustomerPaymentConfirmed` had no `is_sale` parameter — customers always received a plain confirmation regardless of whether the order was placed during a sale.

**Files modified:**
- `store/src/lib/email.ts` — added `is_sale?: boolean` to both customer email functions; when true, heading becomes "🛍️ Sale Order Confirmed!" / "🛍️ Sale Payment Confirmed!" and a yellow sale banner is injected
- `store/src/app/api/orders/route.ts` — passes `is_sale: order.is_sale ?? false` to `sendCustomerOrderConfirmed`
- `store/src/app/api/webhooks/safepay/route.ts` — passes `is_sale` to `sendCustomerPaymentConfirmed` + added `is_sale` to `.select()`
- `store/src/app/api/payments/verify/route.ts` — same as above

**TypeScript fix:** Both Safepay routes were missing `is_sale` in the Supabase `.select()` column list, causing a build error. Added to both selects.

---

### 2. Size guide modal on product detail (feat)

**Approach:** Inline modal triggered by the existing "Size Guide" button in `AddToCartButton` — no navigation away from the product page.

**File modified:** `store/src/components/products/AddToCartButton.tsx`
- Added `SizeGuideModal` component (inside same file)
- `showSizeGuide` state toggles it
- Changed `<a href="/size-guide">` to `<button onClick={() => setShowSizeGuide(true)}>`
- Modal closes on backdrop click, X button, or Escape key; locks body scroll while open
- Bottom sheet on mobile, centered dialog on desktop

**Modal contents:**
- How to Measure — 4 tip cards (bust, waist, hips, length)
- Stitched Size Chart — XS–XXL table with bust/waist/hips/length in inches
- Unstitched Fabric note — explains fabric is custom-stitched, no standard size
- Fit Tips — 4 practical tips

---

### 3. You May Also Like → horizontal slider (feat)

**File created:** `store/src/components/products/ProductSlider.tsx`
- Horizontal scroll-snap container, hidden scrollbar
- Left/Right `ChevronLeft`/`ChevronRight` arrow buttons — desktop only (`hidden md:flex`), fade in/out based on `canLeft`/`canRight` scroll state
- Native touch swipe on mobile via `overflow-x: auto` + `scroll-snap-type: x mandatory`
- Card width: `clamp(160px, 46vw, 220px)` — ~2 visible on mobile, ~4 on desktop

**File modified:** `store/src/app/(store)/shop/[slug]/page.tsx`
- Swapped `ProductCard` import for `ProductSlider`
- Changed `.limit(4)` to `.limit(7)`
- Replaced `<div className="grid ...">` with `<ProductSlider products={relatedProducts} />`

---

### 4. Section title rename (copy)

**File modified:** `store/src/app/(store)/shop/[slug]/page.tsx`
- "You May Also Like" → "This is for you"

---

## Commits

- `980817d` fix: customer email now shows sale branding during active sale
- `66640a4` fix: add is_sale to Supabase select in verify and safepay webhook routes
- `01aea51` feat: size guide modal on product detail page
- `4367ac5` feat: You May Also Like slider with arrows on desktop, swipe on mobile
- `4923b46` copy: rename You May Also Like to This is for you
