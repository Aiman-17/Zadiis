# ZADIIS — Women's Fashion Ecommerce Store Design

**Date**: 2026-06-08
**Status**: Approved
**Brand**: ZADIIS (zadiis.com — working name, to be confirmed with partner)

---

## 1. Business Context

- **Type**: Pakistani women's clothing ecommerce store
- **Owner**: Solo founder, low budget start
- **Inventory**: Own inventory (no dropshipping)
- **Launch category**: Women's clothing only
- **Future expansion**: Abayas, perfumes, new categories
- **Traffic source**: Instagram + Facebook paid ads
- **Goal (3 months)**: First sales — validate the idea

---

## 2. Tech Stack

| Layer | Choice | Cost |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | Free |
| Styling | Tailwind CSS + Shadcn/UI | Free |
| Database | Supabase (PostgreSQL) | Free tier |
| Hosting | Vercel | Free tier |
| Payments | Safepay (JazzCash + Easypaisa + Card) | % per transaction |
| Email | Resend.com | Free (3k/mo) |
| Domain | zadiis.com | ~$10/yr |

---

## 3. Pages

| Page | Route | Purpose |
|---|---|---|
| Home | `/` | Hero, featured collections, new arrivals, trust bar |
| Shop | `/shop` | All products grid, filter by category/size/color/price |
| Product Detail | `/shop/[slug]` | Photos, size guide, description, add to cart |
| Cart | `/cart` | Review items, quantities, subtotal |
| Checkout | `/checkout` | Name, address, phone, payment selection |
| Order Confirmation | `/order/[id]` | Thank you + order summary, triggers owner email |
| About | `/about` | Brand story |
| Contact | `/contact` | WhatsApp link + contact form |
| Admin Dashboard | `/admin` | Password-protected, owner only |
| Admin Products | `/admin/products` | Add/edit/delete products |
| Admin Orders | `/admin/orders` | View + update order status |

---

## 4. Customer Flow

```
Instagram/Facebook Ad
        ↓
Home or Product Page
        ↓
Browse → Product Detail → Add to Cart
        ↓
Checkout (name, address, phone, payment)
        ↓
Pay Online (JazzCash / Easypaisa / Card via Safepay)
        ↓
Order Confirmation Page
        ↓
Email to owner with full order details
```

---

## 5. Features

### Launch Features
- Product catalog with photos, price, size, color, stock
- Product filtering (category, size, price range)
- Shopping cart (add, remove, update quantities)
- Checkout form (name, address, phone, city)
- Online payment via Safepay
- COD — built in code, hidden from UI (launch later)
- Order confirmation email to owner via Resend
- Mobile-first responsive design
- Floating WhatsApp button for customer support
- Custom admin panel (product management + order management)

### Post-Launch (not built now)
- Customer accounts
- Discount/promo codes
- Product reviews
- New categories (Abayas, Perfumes)

---

## 6. Data Model

### Products
```
id, name, slug, description, price, category_id,
images[], sizes[], colors[], stock_quantity,
is_active, created_at
```

### Categories
```
id, name, slug, is_active
```

### Orders
```
id, customer_name, customer_phone, customer_email,
address, city, items (JSONB), subtotal, total,
payment_method, payment_status, order_status,
created_at
```

### Order Items (embedded in orders as JSONB)
```
product_id, product_name, size, color, quantity, price
```

### Admin Users
```
id, email, password_hash, created_at
```

---

## 7. Visual Theme — Soft Luxury Minimal

| Element | Value |
|---|---|
| Background | Warm White `#FAF8F5` |
| Primary Text | Deep Charcoal `#1C1C1C` |
| Accent | Dusty Rose / Warm Taupe `#A68B6E` |
| Heading Font | Playfair Display (serif) |
| Body Font | Inter (sans-serif) |
| Layout | Full-width hero, 2-col mobile grid, 3-col desktop grid |
| Mobile | Sticky header, cart icon always visible, large touch targets |

---

## 8. Admin Panel

- Password-protected at `/admin`
- Add/edit/delete products with image upload
- View all orders (newest first)
- Mark orders: Processing → Shipped → Delivered

### Dashboard Visuals
- **Monthly Revenue** — bar chart (last 6 months)
- **Monthly Orders** — line chart (last 6 months)
- **Returns** — count + trend per month
- **Summary Cards** — Today's orders, This month's revenue, Total orders, Pending shipments
- **Sales by Color** — pie/donut chart showing which product colors sell most (if time permits)

---

## 9. Constraints

- No secrets in code — all via `.env`
- COD built but hidden behind feature flag
- Mobile-first — every component tested at 375px first
- Free tiers only at launch — no paid services until revenue
- Brand name TBD — placeholder "ZADIIS" used throughout

---

## 10. Success Criteria

- Customer can browse → add to cart → pay online in under 3 minutes
- Owner receives email within 60 seconds of every order
- Pages load under 3 seconds on 4G mobile
- Owner can add a new product in under 5 minutes via admin panel
