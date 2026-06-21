# ZADIIS Sprint 3 — Safepay, Emails, Payments Page, Real Revenue

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up Safepay hosted checkout, a proper payment management page, invoice generation with print-to-PDF, real revenue tracking (paid-only), delivery/payment emails, and Cloudflare contact routing.

**Architecture:** Safepay tracker is created server-side before order insert; order is only inserted after tracker succeeds. Webhook at `/api/webhooks/safepay` is the only source of truth for marking online orders paid. COD orders auto-mark paid when admin sets `order_status = 'delivered'`. Every time an order is marked paid (webhook, COD delivery, or admin manual), an invoice record (`INV-XXXX`) is auto-generated. Admin Invoices page lists all invoices with a print-ready page at `/admin/invoices/[id]/print` (no PDF library — browser Save as PDF). Emails send from `orders@zadiis.com.pk` via Resend; all customer email calls silently no-op if `customer_email` is null.

**Tech Stack:** Next.js 16.2.7 App Router, Supabase (supabaseAdmin service role), Resend v6.12.4 (already installed), Safepay REST API (no npm SDK — raw fetch), Node.js `crypto` module for HMAC, TypeScript, Tailwind CSS v4

## Global Constraints

- Brand colors: `#FAF8F5` bg, `#1C1C1C` text, `#A68B6E` accent, `#E8DDD4` border — never use Tailwind arbitrary values, always `style={{}}`
- Tailwind v4: no `bg-[#hex]`, `text-[#hex]`, `border-[#hex]` — use `style={{}}` only
- All admin server pages must have `export const dynamic = 'force-dynamic'`
- `supabaseAdmin` from `@/lib/supabase/server` on all API routes and server components
- `customer_email` is optional (`string | null | undefined`) — every email send must guard `if (!to) return`
- NEVER mark order paid from the frontend — only from webhook or admin manual action
- `NEXT_PUBLIC_APP_URL` env var for all absolute URLs (currently `http://localhost:3000`, becomes `https://zadiis.com.pk` in Vercel)
- Safepay sandbox base: `https://sandbox.api.getsafepay.com`, checkout: `https://sandbox.payments.getsafepay.com`
- Safepay production base: `https://api.getsafepay.com`, checkout: `https://payments.getsafepay.com`
- Use `process.env.NEXT_PUBLIC_SAFEPAY_ENV` (`'sandbox'` | `'production'`) to switch URLs
- No React Email library — plain HTML strings for all email templates
- `export const dynamic = 'force-dynamic'` must appear before other imports on admin pages (Next.js requirement)

---

## Pre-Task: Resend Domain Setup (Manual — No Code)

Do this BEFORE running any tasks so emails work during testing.

**Step A — Add domain in Resend dashboard:**
1. Go to resend.com → Domains → Add Domain → enter `zadiis.com.pk`
2. Resend gives you 3 DNS records (SPF TXT, DKIM TXT, DMARC TXT)

**Step B — Add DNS records in Cloudflare:**
1. Cloudflare dashboard → zadiis.com.pk → DNS
2. Add each record Resend provided exactly as shown
3. Wait for green "Verified" status in Resend (usually 5–15 min)

**Step C — Cloudflare Email Routing (for receiving info@ and support@):**
1. Cloudflare → zadiis.com.pk → Email → Email Routing → Enable
2. Destination address: add `zadiisfashion@gmail.com`, verify via email link sent to Gmail
3. Routing rules → Custom addresses:
   - `info@zadiis.com.pk` → `zadiisfashion@gmail.com`
   - `support@zadiis.com.pk` → `zadiisfashion@gmail.com`
4. Do NOT enable catch-all — specific rules only
5. Test: send email to `info@zadiis.com.pk` from phone, confirm it arrives in Gmail

**Step D — Add env var for Resend sending address:**
- Add to `.env.local`: `RESEND_FROM=ZADIIS <orders@zadiis.com.pk>`
- Add to Vercel environment variables: same value
- Also update Vercel: `NEXT_PUBLIC_APP_URL=https://zadiis.com.pk`
- Update Vercel: `NEXT_PUBLIC_WHATSAPP_NUMBER=92XXXXXXXXXX` (your real number)

> During local dev, if domain not yet verified, emails to `OWNER_EMAIL` still work. Customer emails will fail silently (caught in try/catch).

---

## Task 1: Database Migration + TypeScript Types

**Files:**
- Create: `store/supabase/sprint3.sql`
- Modify: `store/src/types/index.ts`

**Interfaces:**
- Produces: `Order` type with `safepay_tracker?`, `safepay_transaction_id?`, `payment_verified_at?` fields used by Tasks 4, 5, 6

---

- [ ] **Step 1: Create sprint3.sql**

Create file `store/supabase/sprint3.sql`:

```sql
-- Sprint 3 Migration — run in Supabase SQL Editor

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS safepay_tracker text,
  ADD COLUMN IF NOT EXISTS safepay_transaction_id text,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz;
```

- [ ] **Step 2: Run in Supabase**

Go to Supabase dashboard → SQL Editor → paste and run the above. Verify the three columns appear in Table Editor → orders.

- [ ] **Step 3: Update TypeScript Order type**

Open `store/src/types/index.ts`. Replace the `Order` type with:

```typescript
export type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  address: string
  city: string
  items: OrderItem[]
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: 'jazzcash' | 'easypaisa' | 'card' | 'cod'
  payment_status: 'pending' | 'paid' | 'failed'
  order_status: 'new' | 'processing' | 'shipped' | 'delivered' | 'returned'
  safepay_tracker?: string
  safepay_transaction_id?: string
  payment_verified_at?: string
  created_at: string
}
```

- [ ] **Step 4: Verify build**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add store/supabase/sprint3.sql store/src/types/index.ts
git commit -m "feat: sprint3 db migration — safepay columns + updated Order type"
```

---

## Task 2: Shared Email Library

Extract existing email HTML from `orders/route.ts` into a shared `lib/email.ts`, then add three new email types. Simplify `orders/route.ts` to call the shared functions.

**Files:**
- Create: `store/src/lib/email.ts`
- Modify: `store/src/app/api/orders/route.ts` (replace inline HTML with library calls)

**Interfaces:**
- Produces: `sendCustomerOrderConfirmed`, `sendCustomerPaymentConfirmed`, `sendCustomerOrderDelivered`, `sendOwnerNewOrder`, `sendOwnerPaymentReceived` — consumed by Tasks 4, 5, 6
- Consumes: `OrderItem` from `@/types`

---

- [ ] **Step 1: Create `store/src/lib/email.ts`**

```typescript
import { Resend } from 'resend'
import type { OrderItem } from '@/types'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'ZADIIS <orders@zadiis.com.pk>'
const OWNER = process.env.OWNER_EMAIL!
const WA = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''

function itemRows(items: OrderItem[]): string {
  return items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;color:#1C1C1C">
        ${i.product_name}${i.sku ? `<br><span style="font-size:12px;color:#A68B6E">${i.sku}</span>` : ''}
        <br><span style="font-size:12px;color:#888">${i.size} · ${i.color}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;text-align:center;color:#1C1C1C">×${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;text-align:right;color:#1C1C1C">PKR ${Number(i.price * i.quantity).toLocaleString()}</td>
    </tr>`).join('')
}

function emailWrapper(body: string): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5">
    <div style="background:#1C1C1C;padding:28px 32px;text-align:center">
      <h1 style="color:white;font-family:Georgia,serif;margin:0;font-size:28px;letter-spacing:4px">ZADIIS</h1>
      <p style="color:#A68B6E;margin:6px 0 0;font-size:13px;letter-spacing:1px">Modern Pakistani Women's Fashion</p>
    </div>
    <div style="padding:32px;background:#FAF8F5">${body}</div>
    <div style="background:#1C1C1C;padding:20px 32px;text-align:center">
      <p style="color:#888;margin:0;font-size:12px">© 2026 ZADIIS. All rights reserved.</p>
      <p style="color:#666;margin:6px 0 0;font-size:11px">zadiis.com.pk | support@zadiis.com.pk</p>
    </div>
  </div>`
}

// ── Customer: Order Confirmed ─────────────────────────────────────────────────
export async function sendCustomerOrderConfirmed(
  to: string | null | undefined,
  d: {
    order_number: string; customer_name: string; items: OrderItem[]
    subtotal: number; delivery_charge: number; total: number
    payment_method: string; address: string; city: string
  }
): Promise<void> {
  if (!to) return
  const paymentNote = d.payment_method === 'cod'
    ? `<div style="background:#FEF9EC;border:1px solid #F5D87A;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;color:#92640A;font-weight:bold">Cash on Delivery</p>
        <p style="margin:6px 0 0;color:#92640A;font-size:14px">Please keep PKR ${Number(d.total).toLocaleString()} ready at the time of delivery.</p>
       </div>`
    : `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px 20px;margin-bottom:24px">
        <p style="margin:0;color:#166534;font-weight:bold">Online Payment — Awaiting Confirmation</p>
        <p style="margin:6px 0 0;color:#166534;font-size:14px">Your payment is being confirmed. We'll send you another email once it's verified.</p>
       </div>`
  const body = `
    <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Order Received!</h2>
    <p style="color:#666;margin:0 0 24px">Thank you ${d.customer_name}, your order has been placed.</p>
    <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
      <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
      <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${itemRows(d.items)}</table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="padding:6px 0;text-align:right">PKR ${Number(d.subtotal).toLocaleString()}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Delivery</td><td style="padding:6px 0;text-align:right">PKR ${Number(d.delivery_charge).toLocaleString()}</td></tr>
      <tr style="border-top:2px solid #E8DDD4">
        <td style="padding:10px 0;font-weight:bold">Total</td>
        <td style="padding:10px 0;text-align:right;font-weight:bold;color:#A68B6E">PKR ${Number(d.total).toLocaleString()}</td>
      </tr>
    </table>
    <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0 0 4px;font-weight:bold;color:#1C1C1C">Deliver to</p>
      <p style="margin:0;color:#666">${d.address}, ${d.city}</p>
    </div>
    ${paymentNote}
    <div style="text-align:center">
      <a href="https://wa.me/${WA}?text=Hi!%20I%20need%20help%20with%20order%20${d.order_number}"
         style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">WhatsApp Support</a>
      <p style="margin:8px 0 0;font-size:12px;color:#888">Questions? Chat with us on WhatsApp</p>
    </div>`
  try {
    await resend.emails.send({ from: FROM, to, subject: `Order Confirmed — ${d.order_number} | ZADIIS`, html: emailWrapper(body) })
  } catch (e) { console.error('[email] sendCustomerOrderConfirmed failed:', e) }
}

// ── Customer: Payment Confirmed ───────────────────────────────────────────────
export async function sendCustomerPaymentConfirmed(
  to: string | null | undefined,
  d: { order_number: string; customer_name: string; total: number; transaction_id?: string }
): Promise<void> {
  if (!to) return
  const body = `
    <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Payment Confirmed!</h2>
    <p style="color:#666;margin:0 0 24px">Great news, ${d.customer_name}! We've received your payment.</p>
    <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px">Order</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
      <p style="margin:12px 0 0;font-size:18px;font-weight:bold;color:#1C1C1C">PKR ${Number(d.total).toLocaleString()}</p>
      ${d.transaction_id ? `<p style="margin:8px 0 0;font-size:12px;color:#888">Transaction: ${d.transaction_id}</p>` : ''}
    </div>
    <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0;color:#166534;font-weight:bold">✓ Payment received. We're now preparing your order.</p>
      <p style="margin:6px 0 0;color:#166534;font-size:14px">You'll hear from us once your order is shipped.</p>
    </div>
    <div style="text-align:center">
      <a href="https://wa.me/${WA}"
         style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">WhatsApp Support</a>
    </div>`
  try {
    await resend.emails.send({ from: FROM, to, subject: `Payment Confirmed — ${d.order_number} | ZADIIS`, html: emailWrapper(body) })
  } catch (e) { console.error('[email] sendCustomerPaymentConfirmed failed:', e) }
}

// ── Customer: Order Delivered ─────────────────────────────────────────────────
export async function sendCustomerOrderDelivered(
  to: string | null | undefined,
  d: { order_number: string; customer_name: string; items: OrderItem[] }
): Promise<void> {
  if (!to) return
  const body = `
    <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Your Order Has Been Delivered!</h2>
    <p style="color:#666;margin:0 0 24px">Assalam o Alaikum ${d.customer_name}! Your ZADIIS order has arrived.</p>
    <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
      <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px">Order</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">${itemRows(d.items)}</table>
    <div style="background:#FAF8F5;border:1px solid #E8DDD4;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center">
      <p style="margin:0;color:#1C1C1C;font-size:15px;font-family:Georgia,serif">We hope you love your new outfit!</p>
      <p style="margin:8px 0 0;color:#666;font-size:13px">Share your look and tag us. Your feedback means the world to us.</p>
    </div>
    <div style="text-align:center">
      <a href="https://wa.me/${WA}?text=I%20received%20my%20ZADIIS%20order%20${d.order_number}%20and%20wanted%20to%20share%20feedback!"
         style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">Share Feedback on WhatsApp</a>
    </div>`
  try {
    await resend.emails.send({ from: FROM, to, subject: `Your order ${d.order_number} has been delivered — ZADIIS`, html: emailWrapper(body) })
  } catch (e) { console.error('[email] sendCustomerOrderDelivered failed:', e) }
}

// ── Owner: New Order ──────────────────────────────────────────────────────────
export async function sendOwnerNewOrder(d: {
  order_number: string; customer_name: string; customer_phone: string
  customer_email?: string | null; address: string; city: string; items: OrderItem[]
  subtotal: number; delivery_charge: number; total: number; payment_method: string
}): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">
        New Order — ${d.order_number}
      </h2>
      <p><strong>Customer:</strong> ${d.customer_name} · ${d.customer_phone}</p>
      <p><strong>Email:</strong> ${d.customer_email ?? '—'}</p>
      <p><strong>Address:</strong> ${d.address}, ${d.city}</p>
      <p><strong>Payment:</strong> ${d.payment_method.toUpperCase()}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemRows(d.items)}</table>
      <p><strong>Subtotal:</strong> PKR ${Number(d.subtotal).toLocaleString()}</p>
      <p><strong>Delivery:</strong> PKR ${Number(d.delivery_charge).toLocaleString()}</p>
      <p style="font-size:1.15em;color:#A68B6E"><strong>Total: PKR ${Number(d.total).toLocaleString()}</strong></p>
    </div>`
  try {
    await resend.emails.send({
      from: FROM, to: OWNER,
      subject: `New Order ${d.order_number} — ${d.payment_method.toUpperCase()} — PKR ${Number(d.total).toLocaleString()}`,
      html,
    })
  } catch (e) { console.error('[email] sendOwnerNewOrder failed:', e) }
}

// ── Owner: Payment Received ───────────────────────────────────────────────────
export async function sendOwnerPaymentReceived(d: {
  order_number: string; customer_name: string; customer_phone: string
  total: number; payment_method: string; transaction_id?: string
}): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #10B981;padding-bottom:8px">
        ✓ Payment Received — ${d.order_number}
      </h2>
      <p><strong>Customer:</strong> ${d.customer_name} · ${d.customer_phone}</p>
      <p><strong>Method:</strong> ${d.payment_method.toUpperCase()}</p>
      ${d.transaction_id ? `<p><strong>Transaction ID:</strong> ${d.transaction_id}</p>` : ''}
      <p style="font-size:1.15em;color:#10B981"><strong>Amount: PKR ${Number(d.total).toLocaleString()}</strong></p>
    </div>`
  try {
    await resend.emails.send({
      from: FROM, to: OWNER,
      subject: `Payment Received — ${d.order_number} — PKR ${Number(d.total).toLocaleString()}`,
      html,
    })
  } catch (e) { console.error('[email] sendOwnerPaymentReceived failed:', e) }
}
```

- [ ] **Step 2: Refactor `store/src/app/api/orders/route.ts`**

Replace the inline email HTML with calls to the shared library. The file becomes:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCustomerOrderConfirmed, sendOwnerNewOrder } from '@/lib/email'

async function generateOrderNumber(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .not('order_number', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  let next = 1001
  if (data?.order_number) {
    const match = (data.order_number as string).match(/ZD-(\d+)/)
    if (match) next = parseInt(match[1]) + 1
  }
  return `ZD-${next}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customer_name, customer_phone, customer_email, address, city, items, subtotal, delivery_charge, total, payment_method } = body

    if (!customer_name || !customer_phone || !address || !city || !payment_method || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    for (const item of items as Array<{ product_id: string; product_name: string; quantity: number }>) {
      const { data: product, error } = await supabaseAdmin
        .from('products').select('stock_quantity').eq('id', item.product_id).single()
      if (error || !product) return NextResponse.json({ error: `Product not found: ${item.product_name}` }, { status: 400 })
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `"${item.product_name}" has insufficient stock. Available: ${product.stock_quantity}.`, outOfStock: true }, { status: 400 })
      }
    }

    let order = null
    let insertError = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const order_number = await generateOrderNumber()
      const { data, error } = await supabaseAdmin
        .from('orders')
        .insert([{ order_number, customer_name, customer_phone, customer_email: customer_email ?? null, address, city, items, subtotal: subtotal ?? total, delivery_charge: delivery_charge ?? 0, total, payment_method }])
        .select().single()
      if (!error) { order = data; break }
      if (!error?.message?.includes('unique')) { insertError = error; break }
      insertError = error
    }

    if (!order) return NextResponse.json({ error: insertError?.message ?? 'Failed to create order' }, { status: 500 })

    for (const item of items as Array<{ product_id: string; quantity: number }>) {
      await supabaseAdmin.rpc('decrement_stock', { p_product_id: item.product_id, p_quantity: item.quantity })
    }

    await sendOwnerNewOrder({ order_number: order.order_number, customer_name: order.customer_name, customer_phone: order.customer_phone, customer_email: order.customer_email, address: order.address, city: order.city, items: order.items, subtotal: order.subtotal, delivery_charge: order.delivery_charge, total: order.total, payment_method: order.payment_method })
    await sendCustomerOrderConfirmed(order.customer_email, { order_number: order.order_number, customer_name: order.customer_name, items: order.items, subtotal: order.subtotal, delivery_charge: order.delivery_charge, total: order.total, payment_method: order.payment_method, address: order.address, city: order.city })

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    console.error('Orders API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test COD email**

Run dev server (`npm run dev`). Place a COD test order with a real email address. Check:
- Owner gets "New Order" email at `OWNER_EMAIL`
- Customer gets "Order Confirmed" email

- [ ] **Step 5: Commit**

```bash
git add store/src/lib/email.ts store/src/app/api/orders/route.ts
git commit -m "feat: extract shared email library, add payment confirmed + delivered + owner payment received templates"
```

---

## Task 3: Admin Settings — Manual Payment Numbers

Add JazzCash and Easypaisa owner account numbers to Admin Settings. These display as fallback instructions when Safepay is down.

**Files:**
- Modify: `store/src/app/admin/settings/page.tsx`

**Interfaces:**
- Produces: `jazzcash_number` and `easypaisa_number` keys in `store_settings` table, read by Task 7

---

- [ ] **Step 1: Add state + load in `settings/page.tsx`**

In `AdminSettings`, add state variables and load them in the `useEffect`:

```typescript
// Add alongside existing state declarations:
const [jazzcashNumber, setJazzcashNumber] = useState('')
const [easypaisaNumber, setEasypaisaNumber] = useState('')
const [numbersSaving, setNumbersSaving] = useState(false)
```

In the `useEffect` where settings are fetched, extend the `.then` callback:

```typescript
.then((s: Record<string, string>) => {
  setCodEnabled(s.cod_enabled === 'true')
  setHeroImage(s.hero_image || '')
  setJazzcashNumber(s.jazzcash_number || '')
  setEasypaisaNumber(s.easypaisa_number || '')
})
```

- [ ] **Step 2: Add save function**

Add below the `toggleCod` function:

```typescript
const savePaymentNumbers = async () => {
  setNumbersSaving(true)
  await Promise.all([
    fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'jazzcash_number', value: jazzcashNumber.trim() }),
    }),
    fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'easypaisa_number', value: easypaisaNumber.trim() }),
    }),
  ])
  setNumbersSaving(false)
}
```

- [ ] **Step 3: Add UI card in JSX**

Add this card after the existing "Payment Settings" card (the COD toggle card):

```tsx
{/* Manual Payment Numbers */}
<div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E8DDD4' }}>
  <h2 className="font-semibold mb-1">Fallback Payment Numbers</h2>
  <p className="text-xs text-gray-500 mb-4">
    Shown to customers when Safepay is unavailable so they can pay manually.
  </p>
  <div className="space-y-3">
    <div>
      <Label className="text-xs">JazzCash Account Number</Label>
      <Input
        className="mt-1"
        placeholder="03001234567"
        value={jazzcashNumber}
        onChange={e => setJazzcashNumber(e.target.value)}
      />
    </div>
    <div>
      <Label className="text-xs">Easypaisa Account Number</Label>
      <Input
        className="mt-1"
        placeholder="03001234567"
        value={easypaisaNumber}
        onChange={e => setEasypaisaNumber(e.target.value)}
      />
    </div>
    <Button
      onClick={savePaymentNumbers}
      disabled={numbersSaving}
      className="text-white rounded-none"
      style={{ backgroundColor: '#1C1C1C' }}
    >
      {numbersSaving ? 'Saving...' : 'Save Numbers'}
    </Button>
  </div>
</div>
```

- [ ] **Step 4: Smoke test**

Open `/admin/settings`. Enter your JazzCash and Easypaisa numbers. Click Save. Refresh the page — numbers should persist.

- [ ] **Step 5: Commit**

```bash
git add store/src/app/admin/settings/page.tsx
git commit -m "feat: admin settings — JazzCash and Easypaisa fallback payment numbers"
```

---

## Task 4: Safepay Tracker API Route

Server-side route that validates checkout fields, calls Safepay to create a payment tracker, inserts the order, and returns a hosted checkout URL. If Safepay API is unreachable, returns `GATEWAY_DOWN` with manual payment numbers (no order is created).

**Files:**
- Create: `store/src/app/api/payments/tracker/route.ts`

**Interfaces:**
- Consumes: `sendCustomerOrderConfirmed`, `sendOwnerNewOrder` from `@/lib/email`
- Produces: `{ orderId, checkoutUrl }` on success, `{ error: 'GATEWAY_DOWN', jazzcash_number, easypaisa_number }` on Safepay failure

> **Safepay API note:** The exact body format and amount unit (rupees vs paisa) must be verified against your Safepay sandbox dashboard documentation before going live. The plan below uses `amount` in **paisa** (`total * 100`) which is the most common Pakistani gateway convention. If Safepay uses rupees, change to `total` directly.
> 
> **Webhook URL:** Register `https://zadiis.com.pk/api/webhooks/safepay` in your Safepay merchant dashboard Settings → Webhooks.

---

- [ ] **Step 1: Create `store/src/app/api/payments/tracker/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCustomerOrderConfirmed, sendOwnerNewOrder } from '@/lib/email'

const SAFEPAY_ENV = process.env.NEXT_PUBLIC_SAFEPAY_ENV || 'sandbox'
const SAFEPAY_API_BASE = SAFEPAY_ENV === 'production'
  ? 'https://api.getsafepay.com'
  : 'https://sandbox.api.getsafepay.com'
const SAFEPAY_CHECKOUT_BASE = SAFEPAY_ENV === 'production'
  ? 'https://payments.getsafepay.com'
  : 'https://sandbox.payments.getsafepay.com'

async function generateOrderNumber(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .not('order_number', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  let next = 1001
  if (data?.order_number) {
    const match = (data.order_number as string).match(/ZD-(\d+)/)
    if (match) next = parseInt(match[1]) + 1
  }
  return `ZD-${next}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customer_name, customer_phone, customer_email,
      address, city, items, subtotal, delivery_charge, total, payment_method,
    } = body

    // 1. Validate required fields
    if (!customer_name || !customer_phone || !address || !city || !payment_method || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!['jazzcash', 'easypaisa', 'card'].includes(payment_method)) {
      return NextResponse.json({ error: 'Use /api/orders for COD' }, { status: 400 })
    }

    // 2. Validate stock
    for (const item of items as Array<{ product_id: string; product_name: string; quantity: number }>) {
      const { data: product, error } = await supabaseAdmin
        .from('products').select('stock_quantity').eq('id', item.product_id).single()
      if (error || !product) return NextResponse.json({ error: `Product not found: ${item.product_name}` }, { status: 400 })
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `"${item.product_name}" has insufficient stock. Available: ${product.stock_quantity}.`, outOfStock: true }, { status: 400 })
      }
    }

    // 3. Call Safepay API to create tracker BEFORE inserting order
    let trackerToken: string
    try {
      const sfRes = await fetch(`${SAFEPAY_API_BASE}/order/v1/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SFPY-MERCHANT-SECRET': process.env.SAFEPAY_API_KEY!,
        },
        body: JSON.stringify({
          payload: {
            purpose: 'ZADIIS Order',
            amount: Math.round(total * 100), // paisa — verify with Safepay docs
            currency: 'PKR',
            mode: 'payment',
            metadata: { source: 'zadiis' },
          },
        }),
        signal: AbortSignal.timeout(8000), // 8s timeout
      })
      if (!sfRes.ok) throw new Error(`Safepay ${sfRes.status}`)
      const sfData = await sfRes.json()
      trackerToken = sfData?.data?.tracker?.token
      if (!trackerToken) throw new Error('No tracker token in Safepay response')
    } catch (sfErr) {
      console.error('[Safepay] tracker creation failed:', sfErr)
      // Load manual payment numbers from store_settings
      const { data: settings } = await supabaseAdmin
        .from('store_settings')
        .select('key, value')
        .in('key', ['jazzcash_number', 'easypaisa_number'])
      const s = Object.fromEntries((settings || []).map(r => [r.key, r.value]))
      return NextResponse.json({
        error: 'GATEWAY_DOWN',
        jazzcash_number: s.jazzcash_number || '',
        easypaisa_number: s.easypaisa_number || '',
      }, { status: 503 })
    }

    // 4. Insert order with pending payment_status and safepay_tracker token
    let order = null
    let insertError = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const order_number = await generateOrderNumber()
      const { data, error } = await supabaseAdmin
        .from('orders')
        .insert([{
          order_number,
          customer_name, customer_phone,
          customer_email: customer_email ?? null,
          address, city, items,
          subtotal: subtotal ?? total,
          delivery_charge: delivery_charge ?? 0,
          total,
          payment_method,
          payment_status: 'pending',
          safepay_tracker: trackerToken,
        }])
        .select().single()
      if (!error) { order = data; break }
      if (!error?.message?.includes('unique')) { insertError = error; break }
      insertError = error
    }

    if (!order) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create order' }, { status: 500 })
    }

    // 5. Decrement stock
    for (const item of items as Array<{ product_id: string; quantity: number }>) {
      await supabaseAdmin.rpc('decrement_stock', { p_product_id: item.product_id, p_quantity: item.quantity })
    }

    // 6. Send emails (order placed — before payment confirmation)
    await sendOwnerNewOrder({ order_number: order.order_number, customer_name: order.customer_name, customer_phone: order.customer_phone, customer_email: order.customer_email, address: order.address, city: order.city, items: order.items, subtotal: order.subtotal, delivery_charge: order.delivery_charge, total: order.total, payment_method: order.payment_method })
    await sendCustomerOrderConfirmed(order.customer_email, { order_number: order.order_number, customer_name: order.customer_name, items: order.items, subtotal: order.subtotal, delivery_charge: order.delivery_charge, total: order.total, payment_method: order.payment_method, address: order.address, city: order.city })

    // 7. Build Safepay hosted checkout URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const checkoutUrl = `${SAFEPAY_CHECKOUT_BASE}/checkout?tracker=${trackerToken}&source=checkout&user_id=&environment=${SAFEPAY_ENV}&redirect_url=${encodeURIComponent(`${appUrl}/order/${order.id}`)}`

    return NextResponse.json({ orderId: order.id, checkoutUrl }, { status: 201 })
  } catch (err) {
    console.error('[tracker] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test (sandbox)**

With dev server running, use curl to simulate a tracker request:

```bash
curl -X POST http://localhost:3000/api/payments/tracker \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name":"Test User",
    "customer_phone":"03001234567",
    "customer_email":"test@example.com",
    "address":"123 Main St",
    "city":"Lahore",
    "payment_method":"card",
    "items":[{"product_id":"REPLACE_WITH_REAL_ID","product_name":"Test Product","size":"M","color":"Black","quantity":1,"price":3500}],
    "subtotal":3500,
    "delivery_charge":250,
    "total":3750
  }'
```

Expected response: `{ "orderId": "...", "checkoutUrl": "https://sandbox.payments.getsafepay.com/checkout?tracker=TRK-..." }`

If you get `{ "error": "GATEWAY_DOWN" }`: verify `SAFEPAY_API_KEY` in `.env.local` and check Safepay sandbox dashboard.

> **Verify Safepay response shape:** If the tracker token is not at `data.tracker.token`, log `sfData` and adjust the path accordingly.

- [ ] **Step 4: Commit**

```bash
git add store/src/app/api/payments/tracker/route.ts
git commit -m "feat: Safepay tracker API route — create order + hosted checkout URL with GATEWAY_DOWN fallback"
```

---

## Task 5: Safepay Webhook Handler

Receives Safepay's payment confirmation, verifies the HMAC-SHA256 signature, marks the order paid, and sends payment confirmation emails.

**Files:**
- Create: `store/src/app/api/webhooks/safepay/route.ts`

**Interfaces:**
- Consumes: `sendCustomerPaymentConfirmed`, `sendOwnerPaymentReceived` from `@/lib/email`
- Consumes: `SAFEPAY_SECRET_KEY` env var for signature verification
- Produces: updates `orders.payment_status = 'paid'`, `safepay_transaction_id`, `payment_verified_at`

> **Before implementing:** Register your webhook URL in the Safepay merchant dashboard:
> - Sandbox: Safepay Dashboard → Settings → Webhooks → `https://zadiis.com.pk/api/webhooks/safepay`
> - For local testing, use [ngrok](https://ngrok.com): `ngrok http 3000`, then register the ngrok URL
>
> **Signature header:** Safepay sends the signature in a header. Check your Safepay dashboard documentation for the exact header name — commonly `sfpy-signature` or `x-sfpy-signature`. The code below uses `sfpy-signature`; update if different.
>
> **Webhook payload shape:** Verify the exact field path for tracker token and payment status in Safepay's test webhook payload.

---

- [ ] **Step 1: Create `store/src/app/api/webhooks/safepay/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCustomerPaymentConfirmed, sendOwnerPaymentReceived } from '@/lib/email'

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    const signatureBuf = Buffer.from(signature, 'hex')
    if (expectedBuf.length !== signatureBuf.length) return false
    return timingSafeEqual(expectedBuf, signatureBuf)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // Verify signature — update header name if Safepay uses a different one
  const signature = req.headers.get('sfpy-signature') || req.headers.get('x-sfpy-signature') || ''
  const secret = process.env.SAFEPAY_SECRET_KEY!

  if (!verifySignature(rawBody, signature, secret)) {
    console.error('[webhook/safepay] Invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Extract tracker token — verify path against actual Safepay webhook payload
  const tracker = (payload?.data as Record<string, unknown>)?.tracker as Record<string, unknown> | undefined
  const trackerToken = tracker?.token as string | undefined
  const paymentStatus = tracker?.status as string | undefined // e.g. 'charged' or 'paid'
  const transactionId = ((payload?.data as Record<string, unknown>)?.payment as Record<string, unknown>)?.id as string | undefined

  if (!trackerToken) {
    console.error('[webhook/safepay] No tracker token in payload:', JSON.stringify(payload))
    return NextResponse.json({ error: 'Missing tracker token' }, { status: 400 })
  }

  // Only process successful payments — verify exact status value with Safepay docs
  const isSuccessful = ['charged', 'paid', 'completed'].includes((paymentStatus || '').toLowerCase())
  if (!isSuccessful) {
    console.log(`[webhook/safepay] Non-payment event: status=${paymentStatus}, ignoring`)
    return NextResponse.json({ received: true })
  }

  // Find order by safepay_tracker token
  const { data: order, error: findError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, customer_email, total, payment_method, payment_status, items')
    .eq('safepay_tracker', trackerToken)
    .single()

  if (findError || !order) {
    console.error('[webhook/safepay] Order not found for tracker:', trackerToken)
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Idempotency: skip if already paid
  if (order.payment_status === 'paid') {
    return NextResponse.json({ received: true, skipped: 'already paid' })
  }

  // Mark order as paid
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'paid',
      safepay_transaction_id: transactionId ?? null,
      payment_verified_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('[webhook/safepay] Failed to update order:', updateError.message)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  // Send confirmation emails
  await sendCustomerPaymentConfirmed(order.customer_email, {
    order_number: order.order_number,
    customer_name: order.customer_name,
    total: order.total,
    transaction_id: transactionId,
  })
  await sendOwnerPaymentReceived({
    order_number: order.order_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    total: order.total,
    payment_method: order.payment_method,
    transaction_id: transactionId,
  })

  console.log(`[webhook/safepay] Order ${order.order_number} marked paid. TXN: ${transactionId}`)
  return NextResponse.json({ received: true })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Test with mock payload (optional)**

Safepay provides a "Send test webhook" button in the dashboard. Use it after registering your ngrok URL. Verify:
- Order `payment_status` changes to `'paid'` in Supabase Table Editor
- Customer receives "Payment Confirmed" email
- Owner receives "Payment Received" email

- [ ] **Step 4: Commit**

```bash
git add store/src/app/api/webhooks/safepay/route.ts
git commit -m "feat: Safepay webhook handler — HMAC verification, mark order paid, send payment emails"
```

---

## Task 6: Admin Orders — COD Auto-Pay on Delivery + Manual Mark Paid

Extend the admin orders PUT handler to:
1. Auto-set `payment_status = 'paid'` when a **COD** order is marked `delivered`
2. Accept `payment_status` as a standalone update field (for the Payments page "Mark Paid" button)
3. Send "Order Delivered" email to customer and "Payment Received" email to owner when any order is delivered

**Files:**
- Modify: `store/src/app/api/admin/orders/route.ts`

**Interfaces:**
- Consumes: `sendCustomerOrderDelivered`, `sendOwnerPaymentReceived` from `@/lib/email`
- Produces: `PUT /api/admin/orders` now accepts `{ id, order_status?, payment_status? }`

---

- [ ] **Step 1: Rewrite the PUT handler in `store/src/app/api/admin/orders/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCustomerOrderDelivered, sendOwnerPaymentReceived } from '@/lib/email'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PUT(req: NextRequest) {
  const { id, order_status, payment_status } = await req.json()

  // Build update object — only include fields that were provided
  const update: Record<string, unknown> = {}
  if (order_status) update.order_status = order_status
  if (payment_status) {
    update.payment_status = payment_status
    if (payment_status === 'paid') update.payment_verified_at = new Date().toISOString()
  }

  // When marking as delivered, fetch the order to check payment method + send emails
  if (order_status === 'delivered') {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('order_number, customer_name, customer_phone, customer_email, total, payment_method, items')
      .eq('id', id)
      .single()

    if (order) {
      // COD: money collected at door — auto-mark paid
      if (order.payment_method === 'cod') {
        update.payment_status = 'paid'
        update.payment_verified_at = new Date().toISOString()
        await sendOwnerPaymentReceived({
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          total: order.total,
          payment_method: 'cod',
        })
      }

      // Send delivery email to customer for all payment methods
      await sendCustomerOrderDelivered(order.customer_email, {
        order_number: order.order_number,
        customer_name: order.customer_name,
        items: order.items,
      })
    }
  }

  const { error } = await supabaseAdmin.from('orders').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

- [ ] **Step 3: Smoke test**

In admin orders, expand a COD order and set its status to `delivered`. Verify in Supabase that `payment_status` changed to `'paid'`. Check that the customer "Order Delivered" email arrived (if customer_email was set).

- [ ] **Step 4: Commit**

```bash
git add store/src/app/api/admin/orders/route.ts
git commit -m "feat: admin orders PUT — COD auto-pay on delivery, manual payment_status update, delivery emails"
```

---

## Task 7: Checkout — Safepay Redirect + Downtime Fallback

Update the checkout page so online payments go through the Safepay tracker route and redirect to Safepay's hosted page. When Safepay is down, show a fallback UI with three options.

**Files:**
- Modify: `store/src/app/(store)/checkout/page.tsx`

---

- [ ] **Step 1: Replace `store/src/app/(store)/checkout/page.tsx` entirely**

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCart, clearCart } from '@/lib/cart-store'
import type { CartItem } from '@/lib/cart-store'
import type { DeliveryZone } from '@/types'

const BASE_PAYMENT_METHODS = [
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'easypaisa', label: 'Easypaisa' },
  { id: 'card', label: 'Credit / Debit Card' },
]
const COD_METHOD = { id: 'cod', label: 'Cash on Delivery' }

type GatewayDownData = { jazzcash_number: string; easypaisa_number: string }

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gatewayDown, setGatewayDown] = useState<GatewayDownData | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [codEnabled, setCodEnabled] = useState(false)
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', payment: '' })

  useEffect(() => {
    const cart = getCart()
    if (cart.length === 0) { router.push('/cart'); return }
    setItems(cart)
    fetch('/api/delivery-zones')
      .then(r => r.json())
      .then(({ zones, cod_enabled }: { zones: DeliveryZone[]; cod_enabled: boolean }) => {
        setZones(zones)
        setCodEnabled(cod_enabled)
      })
  }, [router])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCityChange = (city: string) => {
    set('city', city)
    const zone = zones.find(z => z.city === city)
    setDeliveryCharge(zone?.delivery_charge ?? 0)
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const total = subtotal + deliveryCharge
  const paymentMethods = codEnabled ? [...BASE_PAYMENT_METHODS, COD_METHOD] : BASE_PAYMENT_METHODS

  const buildPayload = () => ({
    customer_name: form.name,
    customer_phone: form.phone,
    customer_email: form.email || null,
    address: form.address,
    city: form.city,
    items: items.map(i => ({ product_id: i.id, product_name: i.name, sku: i.sku, size: i.size, color: i.color, quantity: i.quantity, price: i.price })),
    subtotal,
    delivery_charge: deliveryCharge,
    total,
    payment_method: form.payment,
  })

  const submitCod = async (paymentOverride?: string) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...buildPayload(), payment_method: paymentOverride ?? form.payment }),
    })
    const data = await res.json()
    if (data.orderId) {
      clearCart()
      window.dispatchEvent(new Event('cart-updated'))
      router.push(`/order/${data.orderId}`)
    } else {
      setError(data.error || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.payment) { alert('Please select a payment method'); return }
    setLoading(true)
    setError(null)
    setGatewayDown(null)

    // COD: use existing orders API directly
    if (form.payment === 'cod') {
      await submitCod()
      return
    }

    // Online payment: use Safepay tracker
    const res = await fetch('/api/payments/tracker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload()),
    })
    const data = await res.json()

    if (data.checkoutUrl) {
      clearCart()
      window.dispatchEvent(new Event('cart-updated'))
      window.location.href = data.checkoutUrl
      return
    }

    if (data.error === 'GATEWAY_DOWN') {
      setGatewayDown({ jazzcash_number: data.jazzcash_number, easypaisa_number: data.easypaisa_number })
      setLoading(false)
      return
    }

    setError(data.error || 'Something went wrong. Please try again.')
    setLoading(false)
  }

  const handleSwitchToCod = async () => {
    setGatewayDown(null)
    setLoading(true)
    await submitCod('cod')
  }

  const handlePayManually = async () => {
    // Place order with original payment method — admin will manually verify screenshot
    setGatewayDown(null)
    setLoading(true)
    await submitCod()
  }

  if (items.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Checkout</h1>

      {/* Gateway down fallback */}
      {gatewayDown && (
        <div className="mb-6 rounded-lg border p-5" style={{ borderColor: '#F5D87A', backgroundColor: '#FEFCE8' }}>
          <p className="font-semibold mb-1" style={{ color: '#92640A' }}>Online payment is temporarily unavailable</p>
          <p className="text-sm mb-4" style={{ color: '#92640A' }}>Safepay is currently down. You can:</p>
          <div className="space-y-2">
            {codEnabled && (
              <button
                onClick={handleSwitchToCod}
                disabled={loading}
                className="w-full text-left px-4 py-3 rounded border text-sm font-medium transition-colors hover:bg-white"
                style={{ borderColor: '#E8DDD4', backgroundColor: 'white', color: '#1C1C1C' }}
              >
                Continue with Cash on Delivery
              </button>
            )}
            <button
              onClick={handlePayManually}
              disabled={loading}
              className="w-full text-left px-4 py-3 rounded border text-sm transition-colors hover:bg-white"
              style={{ borderColor: '#E8DDD4', backgroundColor: 'white', color: '#1C1C1C' }}
            >
              <span className="font-medium">Pay manually via {form.payment === 'jazzcash' ? 'JazzCash' : form.payment === 'easypaisa' ? 'Easypaisa' : 'bank transfer'}</span>
              {(form.payment === 'jazzcash' && gatewayDown.jazzcash_number) && (
                <span className="block text-xs mt-1" style={{ color: '#A68B6E' }}>
                  Send PKR {total.toLocaleString()} to JazzCash: {gatewayDown.jazzcash_number} — then WhatsApp us your receipt
                </span>
              )}
              {(form.payment === 'easypaisa' && gatewayDown.easypaisa_number) && (
                <span className="block text-xs mt-1" style={{ color: '#A68B6E' }}>
                  Send PKR {total.toLocaleString()} to Easypaisa: {gatewayDown.easypaisa_number} — then WhatsApp us your receipt
                </span>
              )}
            </button>
            <button
              onClick={() => setGatewayDown(null)}
              className="w-full text-center text-sm py-2"
              style={{ color: '#6B7280' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" required value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email (optional — for order updates)</Label>
          <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="address">Delivery Address *</Label>
          <Input id="address" required value={form.address} onChange={e => set('address', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="city">City *</Label>
          <select
            id="city" required value={form.city}
            onChange={e => handleCityChange(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm mt-1 bg-white"
            style={{ borderColor: '#E2E8F0' }}
          >
            <option value="">Select city</option>
            {zones.map(z => <option key={z.id} value={z.city}>{z.city}</option>)}
          </select>
          {form.city && <p className="text-sm mt-1" style={{ color: '#A68B6E' }}>Delivery charge: PKR {deliveryCharge.toLocaleString()}</p>}
        </div>
        <div>
          <Label className="block mb-2">Payment Method *</Label>
          <div className="space-y-2">
            {paymentMethods.map(m => (
              <label
                key={m.id}
                className="flex items-center gap-3 border rounded p-3 cursor-pointer transition-colors"
                style={{ borderColor: form.payment === m.id ? '#1C1C1C' : '#E2E8F0', backgroundColor: form.payment === m.id ? '#F9FAFB' : 'white' }}
              >
                <input type="radio" name="payment" value={m.id} checked={form.payment === m.id} onChange={() => { set('payment', m.id); setGatewayDown(null) }} />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <div className="space-y-1 mb-3">
            {items.map(item => (
              <div key={`${item.id}-${item.size}-${item.color}`} className="flex justify-between text-sm text-gray-600">
                <span>{item.name} × {item.quantity}</span>
                <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-1" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>PKR {subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span>Delivery</span><span>{form.city ? `PKR ${deliveryCharge.toLocaleString()}` : '—'}</span></div>
            <div className="flex justify-between font-semibold pt-1 border-t" style={{ borderColor: '#E8DDD4' }}>
              <span>Total</span><span>PKR {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="rounded border px-4 py-3 text-sm" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', color: '#991B1B' }}>
            {error}
          </div>
        )}
        {!gatewayDown && (
          <Button type="submit" disabled={loading} className="w-full text-white rounded-none uppercase tracking-widest py-6" style={{ backgroundColor: '#1C1C1C' }}>
            {loading ? (form.payment === 'cod' ? 'Placing Order...' : 'Redirecting to Payment...') : 'Place Order'}
          </Button>
        )}
      </form>
    </div>
  )
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

- [ ] **Step 3: Smoke test**

Start dev server. Place a test order with payment method "Card":
- Expected: page shows "Redirecting to Payment..." then redirects to Safepay sandbox checkout
- After completing sandbox payment: Safepay redirects to `/order/[id]`
- Expected order page: shows "Awaiting payment confirmation" until webhook fires

Test GATEWAY_DOWN: temporarily set `SAFEPAY_API_KEY=invalid` in `.env.local`, restart dev, place order with Card — should see fallback UI with 3 options. Restore API key after.

- [ ] **Step 4: Commit**

```bash
git add store/src/app/(store)/checkout/page.tsx
git commit -m "feat: checkout — Safepay hosted redirect for online payments + GATEWAY_DOWN fallback UI"
```

---

## Task 8: Admin Payments Page

New `/admin/payments` page listing all orders by payment status with "Mark Paid" action for manual verification. Add to admin nav.

**Files:**
- Create: `store/src/app/admin/payments/page.tsx`
- Modify: `store/src/app/admin/layout.tsx`
- Modify: `store/src/app/admin/orders/page.tsx` (add payment_status badge)

---

- [ ] **Step 1: Create `store/src/app/admin/payments/page.tsx`**

```typescript
'use client'
import { useState, useEffect, useMemo } from 'react'
import type { Order } from '@/types'

const PAYMENT_COLORS: Record<string, React.CSSProperties> = {
  pending: { backgroundColor: '#FEF9C3', color: '#92400E' },
  paid:    { backgroundColor: '#DCFCE7', color: '#15803D' },
  failed:  { backgroundColor: '#FEE2E2', color: '#DC2626' },
}

type Tab = 'all' | 'pending' | 'paid'

export default function AdminPayments() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
  }, [])

  const filtered = useMemo(() =>
    tab === 'all' ? orders : orders.filter(o => o.payment_status === tab),
  [orders, tab])

  const markPaid = async (id: string) => {
    setMarking(id)
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, payment_status: 'paid' }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: 'paid' } : o))
    }
    setMarking(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: `All (${orders.length})` },
    { key: 'pending', label: `Pending (${orders.filter(o => o.payment_status === 'pending').length})` },
    { key: 'paid', label: `Paid (${orders.filter(o => o.payment_status === 'paid').length})` },
  ]

  return (
    <div>
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Payments</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors"
            style={tab === t.key
              ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
              : { borderColor: '#E8DDD4', color: '#6B7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm" style={{ color: '#9CA3AF' }}>No orders in this category.</p>
      )}

      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
              <tr>
                <th className="text-left p-4 font-medium">Order</th>
                <th className="text-left p-4 font-medium">Customer</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium">Method</th>
                <th className="text-left p-4 font-medium">Payment</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                  <td className="p-4 font-medium" style={{ color: '#A68B6E' }}>
                    {order.order_number}
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{order.customer_phone}</p>
                  </td>
                  <td className="p-4 font-semibold">PKR {Number(order.total).toLocaleString()}</td>
                  <td className="p-4 capitalize">{order.payment_method}</td>
                  <td className="p-4">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={PAYMENT_COLORS[order.payment_status]}
                    >
                      {order.payment_status}
                    </span>
                    {order.safepay_transaction_id && (
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        {order.safepay_transaction_id}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-xs" style={{ color: '#6B7280' }}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    {order.payment_status === 'pending' && (
                      order.payment_method === 'cod'
                        ? <span className="text-xs" style={{ color: '#9CA3AF' }}>Collect on delivery</span>
                        : (
                          <button
                            onClick={() => markPaid(order.id)}
                            disabled={marking === order.id}
                            className="text-xs px-3 py-1.5 rounded border font-medium transition-colors"
                            style={{ borderColor: '#A68B6E', color: '#A68B6E' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#A68B6E'; (e.currentTarget as HTMLElement).style.color = 'white' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#A68B6E' }}
                          >
                            {marking === order.id ? 'Saving...' : 'Mark Paid'}
                          </button>
                        )
                    )}
                    {order.payment_status === 'paid' && (
                      <span className="text-xs" style={{ color: '#15803D' }}>✓ Confirmed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add "Payments" nav item to `store/src/app/admin/layout.tsx`**

Find the `NAV` array in `admin/layout.tsx`:

```typescript
const NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true, badge: 0 },
  { href: '/admin/products', icon: Package, label: 'Products', exact: false, badge: 0 },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', exact: false, badge: newOrders },
  { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false, badge: 0 },
]
```

Replace with (add `CreditCard` to import and add Payments entry):

```typescript
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Menu, X, CreditCard } from 'lucide-react'

// Inside component:
const NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true, badge: 0 },
  { href: '/admin/products', icon: Package, label: 'Products', exact: false, badge: 0 },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', exact: false, badge: newOrders },
  { href: '/admin/payments', icon: CreditCard, label: 'Payments', exact: false, badge: 0 },
  { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false, badge: 0 },
]
```

- [ ] **Step 3: Add payment_status badge to `store/src/app/admin/orders/page.tsx`**

In the order list row header area (where order_number, customer_name, phone are shown), add payment_status badge alongside the existing order_status badge. Find the `<div className="flex items-center gap-3">` in the row and add:

```tsx
<span
  className="text-xs px-2 py-0.5 rounded-full"
  style={order.payment_status === 'paid'
    ? { backgroundColor: '#DCFCE7', color: '#15803D' }
    : order.payment_status === 'failed'
    ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
    : { backgroundColor: '#FEF9C3', color: '#92400E' }}
>
  {order.payment_status}
</span>
```

Add it after the existing `order_status` badge span.

- [ ] **Step 4: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

- [ ] **Step 5: Smoke test**

Visit `/admin/payments`. Verify:
- All tabs work (All / Pending / Paid)
- COD pending orders show "Collect on delivery" (no Mark Paid button)
- Online pending orders show "Mark Paid" button
- Clicking "Mark Paid" updates the badge inline

- [ ] **Step 6: Commit**

```bash
git add store/src/app/admin/payments/page.tsx store/src/app/admin/layout.tsx store/src/app/admin/orders/page.tsx
git commit -m "feat: admin payments page — filter tabs, Mark Paid button, payment_status badge on orders"
```

---

## Task 9: Dashboard Real Revenue

Filter `allOrders` so revenue stats and charts count only `payment_status = 'paid'` orders. Add a "Pending Revenue" sub-label to the This Month Revenue card.

**Files:**
- Modify: `store/src/app/admin/page.tsx`
- Modify: `store/src/components/admin/DashboardCharts.tsx`

---

- [ ] **Step 1: Update `store/src/app/admin/page.tsx`**

Replace the stats computation and DashboardCharts call:

```typescript
// After allOrders is loaded, add:
const paidOrders = allOrders.filter(o => o.payment_status === 'paid')

const today = new Date().toDateString()
const todayOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === today)
const thisMonth = new Date().getMonth()
const thisYear = new Date().getFullYear()

const monthPaidOrders = paidOrders.filter(o => {
  const d = new Date(o.created_at)
  return d.getMonth() === thisMonth && d.getFullYear() === thisYear
})
const monthPendingOrders = allOrders.filter(o => {
  const d = new Date(o.created_at)
  return d.getMonth() === thisMonth && d.getFullYear() === thisYear && o.payment_status === 'pending'
})

const monthRevenue = monthPaidOrders.reduce((s, o) => s + o.total, 0)
const monthPendingRevenue = monthPendingOrders.reduce((s, o) => s + o.total, 0)
const pendingOrders = allOrders.filter(o => o.order_status === 'new' || o.order_status === 'processing')

const stats = [
  { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, sub: null },
  { label: 'This Month Revenue', value: `PKR ${monthRevenue.toLocaleString()}`, icon: TrendingUp, sub: monthPendingRevenue > 0 ? `Pending: PKR ${monthPendingRevenue.toLocaleString()}` : null },
  { label: 'Total Orders', value: allOrders.length, icon: Package, sub: null },
  { label: 'Pending Shipments', value: pendingOrders.length, icon: Clock, sub: null },
]
```

Update the JSX stats grid to show the `sub` label:

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
  {stats.map(s => (
    <div key={s.label} className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
      <s.icon size={20} className="mb-2" style={{ color: '#A68B6E' }} />
      <p className="text-2xl font-bold">{s.value}</p>
      <p className="text-xs text-gray-500 mt-1">{s.label}</p>
      {s.sub && <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>{s.sub}</p>}
    </div>
  ))}
</div>
```

Pass `paidOrders` to DashboardCharts:

```tsx
<DashboardCharts orders={paidOrders} />
```

- [ ] **Step 2: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors. `DashboardCharts` already accepts `Order[]` — passing `paidOrders` (same type) is fine.

- [ ] **Step 3: Verify dashboard**

Visit `/admin`. Revenue cards should now show confirmed revenue only. If you have both paid and pending orders, the "Pending: PKR X" sub-label appears under This Month Revenue.

- [ ] **Step 4: Commit**

```bash
git add store/src/app/admin/page.tsx
git commit -m "feat: dashboard revenue based on paid orders only, pending revenue sub-label"
```

---

## Task 10: Order Page — Safepay Return Banner

When Safepay redirects back after payment, the order will briefly show `payment_status = 'pending'` until the webhook fires. Update the order page to show a clearer "Confirming your payment…" message for online orders in pending state.

**Files:**
- Modify: `store/src/app/(store)/order/[id]/page.tsx`

---

- [ ] **Step 1: Update pending payment message in order page**

The current order page has:
```typescript
const isPaid = order.payment_status === 'paid'
```

And for pending shows WhatsApp contact. Update to differentiate COD pending vs online payment pending:

Find the `{/* Payment status message */}` block and replace:

```tsx
{/* Payment status message */}
<div className="text-center mb-6">
  {order.payment_status === 'paid' ? (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <p className="text-sm font-medium text-green-700">✓ Payment confirmed. Your order is being processed.</p>
    </div>
  ) : order.payment_method === 'cod' ? (
    <div className="border rounded-lg p-4" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
      <p className="text-sm font-medium mb-1" style={{ color: '#1C1C1C' }}>Cash on Delivery</p>
      <p className="text-sm text-gray-500">Please keep PKR {Number(order.total).toLocaleString()} ready at the time of delivery.</p>
    </div>
  ) : (
    <div className="border rounded-lg p-4" style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
      <p className="text-sm font-medium mb-1" style={{ color: '#92400E' }}>⏳ Confirming your payment…</p>
      <p className="text-sm mb-3" style={{ color: '#92400E' }}>
        If you completed payment on Safepay, confirmation usually arrives within a few seconds.
        Check your email for a confirmation message.
      </p>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 rounded text-white text-sm font-medium"
        style={{ backgroundColor: '#25D366' }}
      >
        WhatsApp us if you have questions
      </a>
    </div>
  )}
</div>
```

- [ ] **Step 2: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

- [ ] **Step 3: Full build check**

```bash
cd store && npm run build
```

Expected: ✓ Compiled successfully

- [ ] **Step 4: Commit**

```bash
git add store/src/app/(store)/order/[id]/page.tsx
git commit -m "feat: order page — clear payment pending state for COD vs online, Safepay confirming message"
```

---

## Task 11: Vercel Environment Variables

Update Vercel with all required production values before deployment.

**Steps (Vercel Dashboard → Project → Settings → Environment Variables):**

- [ ] Set `NEXT_PUBLIC_APP_URL` = `https://zadiis.com.pk`
- [ ] Set `NEXT_PUBLIC_WHATSAPP_NUMBER` = your real number (e.g. `923001234567`)
- [ ] Set `RESEND_FROM` = `ZADIIS <orders@zadiis.com.pk>`
- [ ] Confirm `RESEND_API_KEY` is set (already done)
- [ ] Confirm `OWNER_EMAIL` = `zadiisfashion@gmail.com` (already done)
- [ ] Confirm `SAFEPAY_API_KEY` and `SAFEPAY_SECRET_KEY` are set (already done)
- [ ] Set `NEXT_PUBLIC_SAFEPAY_ENV` = `sandbox` (change to `production` when Safepay merchant account is approved)

- [ ] **Redeploy:** Push a commit or trigger redeploy in Vercel dashboard to pick up new env vars.

- [ ] **Register Safepay webhook URL:** In Safepay merchant dashboard → Settings → Webhooks → add `https://zadiis.com.pk/api/webhooks/safepay`

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Covered By |
|---|---|
| Safepay tracker server-side + hosted redirect | Task 4 |
| Webhook HMAC verification + mark paid | Task 5 |
| GATEWAY_DOWN fallback (COD + manual + retry) | Task 7 |
| JazzCash/Easypaisa numbers in settings | Task 3 |
| Admin Payments page with filter tabs | Task 8 |
| Mark Paid button (non-COD pending) | Task 8 |
| COD auto-pay on delivery | Task 6 |
| Customer: Order Placed email | Task 2 (existing in orders/route.ts, refactored) |
| Customer: Payment Confirmed email | Task 2 (new) + Task 5 (trigger) |
| Customer: Order Delivered email | Task 2 (new) + Task 6 (trigger) |
| Owner: New Order email | Task 2 (existing, refactored) |
| Owner: Payment Received email | Task 2 (new) + Task 5 + Task 6 (COD) |
| Dashboard paid-only revenue | Task 9 |
| Pending revenue sub-label | Task 9 |
| TypeScript Order type updated | Task 1 |
| DB migration sprint3.sql | Task 1 |
| Cloudflare email routing | Pre-Task (manual config) |
| Resend domain verification | Pre-Task (manual config) |
| Vercel env vars updated | Task 11 |

---

## Task 12: Invoice Generation + Admin Invoices Page

Auto-generate an `INV-XXXX` invoice record whenever an order is marked paid. Show all invoices in `/admin/invoices` with a print-ready page at `/admin/invoices/[id]/print` that the admin opens in a new tab and saves as PDF via the browser.

**Scope:** Invoice records with INV-XXXX numbers auto-generated on payment. Admin invoices page has time filters (Today/3d/7d/1month) and delete button — same UX as orders page. Each invoice has a "Print / PDF" button that opens a clean branded view; admin uses browser Ctrl+P → Save as PDF (no PDF library required).

**Files:**
- Modify: `store/supabase/sprint3.sql` — add `invoices` table
- Create: `store/src/lib/invoice.ts` — generate invoice number + insert record
- Create: `store/src/app/admin/invoices/page.tsx` — `'use client'`, time filters, delete, Print/PDF link
- Create: `store/src/app/admin/invoices/[id]/print/page.tsx` — clean branded print view
- Create: `store/src/app/admin/invoices/[id]/print/PrintButton.tsx` — `'use client'` print trigger
- Create: `store/src/app/api/admin/invoices/[id]/route.ts` — DELETE handler
- Modify: `store/src/app/admin/layout.tsx` — add Invoices nav item
- Amend: Task 5 webhook handler — call `generateInvoice` after marking paid
- Amend: Task 6 admin orders PUT — call `generateInvoice` after marking paid

**Interfaces:**
- Produces: `generateInvoice(orderId)` → `string | null` — consumed by Tasks 5 and 6
- Produces: `DELETE /api/admin/invoices/[id]` — consumed by invoices page delete button
- Produces: `GET /admin/invoices/[id]/print` — print view opened in new tab

---

- [ ] **Step 1: Add invoices table to `store/supabase/sprint3.sql`**

Append to the existing sprint3.sql file (or run separately in Supabase SQL Editor):

```sql
-- Invoices table (run after orders table migration)
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages invoices" ON invoices
  FOR ALL USING (auth.role() = 'service_role');
```

Run this in Supabase SQL Editor. Verify `invoices` table appears in Table Editor.

- [ ] **Step 2: Create `store/src/lib/invoice.ts`**

```typescript
import { supabaseAdmin } from '@/lib/supabase/server'

async function nextInvoiceNumber(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()
  let next = 1001
  if (data?.invoice_number) {
    const match = (data.invoice_number as string).match(/INV-(\d+)/)
    if (match) next = parseInt(match[1]) + 1
  }
  return `INV-${next}`
}

/**
 * Generate an invoice for a paid order.
 * Idempotent: if an invoice already exists for this order, returns existing invoice_number.
 * Returns invoice_number (e.g. "INV-1001") or null on failure.
 */
export async function generateInvoice(orderId: string): Promise<string | null> {
  // Check if invoice already exists for this order (idempotency)
  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .eq('order_id', orderId)
    .single()
  if (existing?.invoice_number) return existing.invoice_number

  // Get order amount
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('total')
    .eq('id', orderId)
    .single()
  if (!order) return null

  const invoice_number = await nextInvoiceNumber()

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .insert([{ invoice_number, order_id: orderId, amount: order.total }])
    .select('invoice_number')
    .single()

  if (error) {
    console.error('[invoice] generateInvoice failed:', error.message)
    return null
  }
  return invoice?.invoice_number ?? null
}
```

- [ ] **Step 3: Amend Task 5 — add invoice generation to webhook handler**

In `store/src/app/api/webhooks/safepay/route.ts`, add the import at the top:

```typescript
import { generateInvoice } from '@/lib/invoice'
```

After the `supabaseAdmin.from('orders').update(...)` call (and confirming no `updateError`), add:

```typescript
// Generate invoice for paid order
await generateInvoice(order.id)
```

Full insertion point (after the `if (updateError)` block):

```typescript
if (updateError) {
  console.error('[webhook/safepay] Failed to update order:', updateError.message)
  return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
}

// Generate invoice
await generateInvoice(order.id)

// Send confirmation emails
await sendCustomerPaymentConfirmed(...)
```

- [ ] **Step 4: Amend Task 6 — add invoice generation to COD auto-pay**

In `store/src/app/api/admin/orders/route.ts`, add import:

```typescript
import { generateInvoice } from '@/lib/invoice'
```

In the `PUT` handler, inside the `if (order.payment_method === 'cod')` block, after setting `update.payment_status = 'paid'`:

```typescript
if (order.payment_method === 'cod') {
  update.payment_status = 'paid'
  update.payment_verified_at = new Date().toISOString()
  // Generate invoice after DB update (see below)
  await sendOwnerPaymentReceived({ ... })
}
```

After the `supabaseAdmin.from('orders').update(update)` call (at the end of PUT, before returning):

```typescript
const { error } = await supabaseAdmin.from('orders').update(update).eq('id', id)
if (error) return NextResponse.json({ error: error.message }, { status: 500 })

// Generate invoice if order was just paid
if (update.payment_status === 'paid') {
  await generateInvoice(id)
}

return NextResponse.json({ success: true })
```

This covers both COD auto-pay AND the manual "Mark Paid" action from the Payments page (since both set `payment_status: 'paid'` through this same PUT handler).

- [ ] **Step 5a: Create DELETE API route `store/src/app/api/admin/invoices/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabaseAdmin.from('invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5b: Create `store/src/app/admin/invoices/page.tsx`**

This is a `'use client'` component with time filters (Today / 3 Days / 7 Days / 1 Month) and a delete button — matching the orders page UX.

```typescript
'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'

type InvoiceRow = {
  id: string
  invoice_number: string
  amount: number
  generated_at: string
  orders: {
    order_number: string
    customer_name: string
    customer_phone: string
    payment_method: string
  }
}

type Filter = 'all' | 'today' | '3days' | '7days' | '1month'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: '3days', label: '3 Days' },
  { key: '7days', label: '7 Days' },
  { key: '1month', label: '1 Month' },
]

function isWithinDays(dateStr: string, days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return new Date(dateStr) >= cutoff
}

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/invoices')
      .then(r => r.json())
      .then(data => setInvoices(Array.isArray(data) ? data : []))
  }, [])

  const filtered = useMemo(() => {
    const now = new Date()
    return invoices.filter(inv => {
      if (filter === 'all') return true
      if (filter === 'today') return new Date(inv.generated_at).toDateString() === now.toDateString()
      if (filter === '3days') return isWithinDays(inv.generated_at, 3)
      if (filter === '7days') return isWithinDays(inv.generated_at, 7)
      if (filter === '1month') return isWithinDays(inv.generated_at, 30)
      return true
    })
  }, [invoices, filter])

  const deleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice record permanently?')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' })
    if (res.ok) setInvoices(prev => prev.filter(inv => inv.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      <h1 className="text-2xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Invoices</h1>

      {/* Time filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors"
            style={filter === f.key
              ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
              : { borderColor: '#E8DDD4', color: '#6B7280' }}
          >
            {f.label}
          </button>
        ))}
        <span className="text-xs self-center ml-1" style={{ color: '#9CA3AF' }}>
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm" style={{ color: '#9CA3AF' }}>
          {invoices.length === 0
            ? 'No invoices yet. Generated automatically when orders are paid.'
            : 'No invoices in this period.'}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
                <tr>
                  <th className="text-left p-4 font-medium">Invoice #</th>
                  <th className="text-left p-4 font-medium">Order</th>
                  <th className="text-left p-4 font-medium">Customer</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Method</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                    <td className="p-4 font-bold" style={{ color: '#A68B6E' }}>{inv.invoice_number}</td>
                    <td className="p-4 font-medium">{inv.orders?.order_number}</td>
                    <td className="p-4">
                      <p className="font-medium">{inv.orders?.customer_name}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{inv.orders?.customer_phone}</p>
                    </td>
                    <td className="p-4 font-semibold">PKR {Number(inv.amount).toLocaleString()}</td>
                    <td className="p-4 capitalize">{inv.orders?.payment_method}</td>
                    <td className="p-4 text-xs" style={{ color: '#6B7280' }}>
                      {new Date(inv.generated_at).toLocaleDateString('en-PK', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/invoices/${inv.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded border font-medium transition-colors"
                          style={{ borderColor: '#A68B6E', color: '#A68B6E' }}
                        >
                          Print / PDF
                        </Link>
                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          disabled={deleting === inv.id}
                          className="transition-colors"
                          style={{ color: '#FCA5A5' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#FCA5A5')}
                          title="Delete invoice"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5c: Create invoices GET API route `store/src/app/api/admin/invoices/route.ts`**

The invoices page fetches from `/api/admin/invoices`:

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select(`
      id,
      invoice_number,
      amount,
      generated_at,
      orders (
        order_number,
        customer_name,
        customer_phone,
        payment_method
      )
    `)
    .order('generated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
```

- [ ] **Step 6: Create print button client component `store/src/app/admin/invoices/[id]/print/PrintButton.tsx`**

```typescript
'use client'
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-6 py-2 rounded text-sm font-medium text-white no-print"
      style={{ backgroundColor: '#1C1C1C' }}
    >
      Print / Save as PDF
    </button>
  )
}
```

- [ ] **Step 7: Create `store/src/app/admin/invoices/[id]/print/page.tsx`**

```typescript
export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'
import type { OrderItem } from '@/types'

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: inv } = await supabaseAdmin
    .from('invoices')
    .select(`
      invoice_number,
      amount,
      generated_at,
      orders (
        order_number,
        customer_name,
        customer_phone,
        customer_email,
        address,
        city,
        items,
        subtotal,
        delivery_charge,
        total,
        payment_method,
        payment_status,
        payment_verified_at,
        safepay_transaction_id,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (!inv) notFound()

  const order = inv.orders as {
    order_number: string; customer_name: string; customer_phone: string
    customer_email?: string; address: string; city: string; items: OrderItem[]
    subtotal: number; delivery_charge: number; total: number
    payment_method: string; payment_status: string
    payment_verified_at?: string; safepay_transaction_id?: string; created_at: string
  }

  const paidDate = inv.generated_at
    ? new Date(inv.generated_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
  const orderDate = new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { margin: 1.5cm; }
        }
        body { font-family: Arial, sans-serif; background: white; }
      `}</style>

      {/* Print controls — hidden when printing */}
      <div className="no-print flex items-center gap-4 p-4 border-b" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
        <span className="text-sm font-medium">Invoice {inv.invoice_number}</span>
        <PrintButton />
        <a href="/admin/invoices" className="text-sm" style={{ color: '#6B7280' }}>← Back to Invoices</a>
      </div>

      {/* Invoice document */}
      <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 16, borderBottom: '2px solid #A68B6E' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontFamily: 'Georgia, serif', color: '#1C1C1C', letterSpacing: 3 }}>ZADIIS</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A68B6E', letterSpacing: 1 }}>AUTHENTIC PAKISTANI FASHION</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6B7280' }}>zadiis.com.pk</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>orders@zadiis.com.pk</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: '#1C1C1C' }}>INVOICE</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 'bold', color: '#A68B6E', fontFamily: 'Georgia, serif' }}>{inv.invoice_number}</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6B7280' }}>Order: {order.order_number}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>Order Date: {orderDate}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>Invoice Date: {paidDate}</p>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Bill To</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: '#1C1C1C' }}>{order.customer_name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>{order.customer_phone}</p>
          {order.customer_email && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>{order.customer_email}</p>}
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>{order.address}, {order.city}</p>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '2px solid #E8DDD4' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Item</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Size</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Color</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items as OrderItem[]).map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#9CA3AF' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#1C1C1C' }}>
                  {item.product_name}
                  {item.sku && <span style={{ display: 'block', fontSize: 11, color: '#A68B6E' }}>{item.sku}</span>}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#4B5563', textAlign: 'center' }}>{item.size}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#4B5563', textAlign: 'center' }}>{item.color}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#4B5563', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#1C1C1C', textAlign: 'right', fontWeight: 500 }}>
                  PKR {(item.price * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <table style={{ minWidth: 260 }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 12px', fontSize: 13, color: '#6B7280' }}>Subtotal</td>
                <td style={{ padding: '6px 12px', fontSize: 13, color: '#1C1C1C', textAlign: 'right' }}>PKR {Number(order.subtotal).toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 12px', fontSize: 13, color: '#6B7280' }}>Delivery</td>
                <td style={{ padding: '6px 12px', fontSize: 13, color: '#1C1C1C', textAlign: 'right' }}>PKR {Number(order.delivery_charge).toLocaleString()}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #E8DDD4' }}>
                <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 'bold', color: '#1C1C1C' }}>Total</td>
                <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 'bold', color: '#A68B6E', textAlign: 'right' }}>PKR {Number(order.total).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment info */}
        <div style={{ backgroundColor: '#FAF8F5', border: '1px solid #E8DDD4', borderRadius: 6, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Payment Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Method: <strong style={{ color: '#1C1C1C', textTransform: 'capitalize' }}>{order.payment_method}</strong></p>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Status: <strong style={{ color: '#15803D' }}>PAID</strong></p>
            {order.safepay_transaction_id && (
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280', gridColumn: '1 / -1' }}>
                Transaction ID: {order.safepay_transaction_id}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #E8DDD4', paddingTop: 16, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Thank you for shopping with ZADIIS</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#D1D5DB' }}>This is a computer-generated invoice and does not require a physical signature.</p>
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 8: Add Invoices nav item to `store/src/app/admin/layout.tsx`**

Add `FileText` to the lucide-react import and add the Invoices nav entry:

```typescript
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Menu, X, CreditCard, FileText } from 'lucide-react'

// In NAV array (add between Payments and Settings):
{ href: '/admin/invoices', icon: FileText, label: 'Invoices', exact: false, badge: 0 },
```

- [ ] **Step 9: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Full build check**

```bash
cd store && npm run build
```

Expected: ✓ Compiled successfully

- [ ] **Step 11: Smoke test**

1. Place a test order and mark it as paid (via admin Payments page "Mark Paid")
2. Go to `/admin/invoices` — invoice should appear with `INV-1001`
3. Click "Print / PDF" — new tab opens with clean invoice layout
4. Click "Print / Save as PDF" button — browser print dialog opens → save as PDF
5. Verify invoice shows: correct order number, customer details, items, total, payment method

- [ ] **Step 12: Commit**

```bash
git add store/supabase/sprint3.sql store/src/lib/invoice.ts store/src/app/admin/invoices/ store/src/app/admin/layout.tsx store/src/app/api/webhooks/safepay/route.ts store/src/app/api/admin/orders/route.ts
git commit -m "feat: invoice generation — INV-XXXX records, admin invoices page, print-to-PDF view"
```

---

### Type Consistency

- `sendCustomerOrderConfirmed` / `sendOwnerNewOrder` defined in Task 2, consumed in Task 2 (orders/route.ts) and Task 4 — signatures match
- `sendCustomerPaymentConfirmed` / `sendOwnerPaymentReceived` defined in Task 2, consumed in Task 5 and Task 6 — signatures match
- `sendCustomerOrderDelivered` defined in Task 2, consumed in Task 6 — signature matches
- `Order.safepay_tracker`, `Order.safepay_transaction_id`, `Order.payment_verified_at` defined in Task 1, used in Task 4 (insert), Task 5 (update), Task 8 (display) — all optional (`?`) so existing code won't break

### No Placeholders: Confirmed

All steps contain complete, runnable code. No TBD/TODO markers.
