import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || "ZADII'S <orders@zadiis.com.pk>"
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zadiis.com'

type EmailItem = { product_id?: string; product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }

// Resolve product page URLs for order items (id → /shop/[slug]).
// Old orders and deleted products degrade gracefully to plain text.
async function productLinkMap(items: Array<{ product_id?: string }>): Promise<Record<string, string>> {
  const ids = [...new Set(items.map(i => i.product_id).filter(Boolean))] as string[]
  if (ids.length === 0) return {}
  try {
    const { data } = await supabaseAdmin.from('products').select('id, slug').in('id', ids)
    return Object.fromEntries((data ?? []).filter(p => p.slug).map(p => [p.id, `${BASE_URL}/shop/${p.slug}`]))
  } catch {
    return {}
  }
}

function linkedName(i: EmailItem, links: Record<string, string>): string {
  const url = i.product_id ? links[i.product_id] : undefined
  return url
    ? `<a href="${url}" style="color:#A68B6E;text-decoration:underline">${i.product_name}</a>`
    : i.product_name
}

// Shared item rows builder (used by multiple templates)
function buildItemRows(items: EmailItem[], links: Record<string, string> = {}): string {
  return items.map(i => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;color:#1C1C1C">
        ${linkedName(i, links)}${i.sku ? `<br><span style="font-size:12px;color:#A68B6E">${i.sku}</span>` : ''}
        <br><span style="font-size:12px;color:#888">${i.size} · ${i.color}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;text-align:center;color:#1C1C1C">×${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;text-align:right;color:#1C1C1C">PKR ${Number(i.price * i.quantity).toLocaleString()}</td>
    </tr>`).join('')
}

// Shared ZADII'S header HTML
function zadiisHeader(): string {
  return `
    <div style="background:#1C1C1C;padding:28px 32px;text-align:center">
      <h1 style="color:white;font-family:Georgia,serif;margin:0;font-size:28px;letter-spacing:4px">ZADII&apos;S</h1>
      <p style="color:#A68B6E;margin:6px 0 0;font-size:13px;letter-spacing:1px">Modern Pakistani Women's Fashion</p>
    </div>`
}

// Shared ZADII'S footer HTML
function zadiisFooter(): string {
  return `
    <div style="background:#1C1C1C;padding:20px 32px;text-align:center">
      <p style="color:#888;margin:0;font-size:12px">© 2026 ZADII&apos;S. All rights reserved.</p>
      <p style="color:#666;margin:6px 0 0;font-size:11px">zadiis.com.pk</p>
    </div>`
}

export async function sendCustomerOrderConfirmed(to: string | null | undefined, d: {
  order_number: string
  customer_name: string
  items: EmailItem[]
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: string
  address: string
  city: string
  is_sale?: boolean
}): Promise<void> {
  if (!to) return
  const links = await productLinkMap(d.items)
  const itemRows = buildItemRows(d.items, links)
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">${d.is_sale ? '🛍️ Sale Order Confirmed!' : 'Order Confirmed!'}</h2>
        <p style="color:#666;margin:0 0 24px">Thank you ${d.customer_name}, your order has been placed successfully.</p>
        ${d.is_sale ? `<div style="background:#FEF9EC;border:1px solid #F5D87A;border-radius:8px;padding:14px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;color:#92640A;font-weight:bold">You ordered during our sale!</p>
          <p style="margin:4px 0 0;color:#92640A;font-size:13px">Your sale prices are locked in. Congratulations on the deal!</p>
        </div>` : ''}
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${itemRows}</table>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(d.subtotal).toLocaleString()}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Delivery</td><td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(d.delivery_charge).toLocaleString()}</td></tr>
          <tr style="border-top:2px solid #E8DDD4">
            <td style="padding:10px 0;font-weight:bold;color:#1C1C1C">Total</td>
            <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:1.1em;color:#A68B6E">PKR ${Number(d.total).toLocaleString()}</td>
          </tr>
        </table>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-weight:bold;color:#1C1C1C">Delivery Address</p>
          <p style="margin:0;color:#666">${d.address}, ${d.city}</p>
        </div>
        ${d.payment_method === 'cod'
          ? `<div style="background:#FEF9EC;border:1px solid #F5D87A;border-radius:8px;padding:16px 20px;margin-bottom:24px">
               <p style="margin:0;color:#92640A;font-weight:bold">Cash on Delivery</p>
               <p style="margin:6px 0 0;color:#92640A;font-size:14px">Please keep PKR ${Number(d.total).toLocaleString()} ready at the time of delivery.</p>
             </div>`
          : `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px 20px;margin-bottom:24px">
               <p style="margin:0;color:#166534;font-weight:bold">Online Payment</p>
               <p style="margin:6px 0 0;color:#166534;font-size:14px">Once your payment is confirmed, your order will be processed immediately.</p>
             </div>`}
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your order ${d.order_number} has been placed — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerOrderConfirmed failed:', e)
  }
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  jazzcash:  'JazzCash',
  easypaisa: 'EasyPaisa',
  card:      'Credit / Debit Card',
  cod:       'Cash on Delivery',
}

function buildInvoiceBlock(d: {
  invoice_number: string
  order_number:   string
  customer_name:  string
  address:        string
  city:           string
  payment_method: string
  transaction_id?: string
}): string {
  const date = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
  const method = PAYMENT_METHOD_LABELS[d.payment_method] || d.payment_method
  return `
    <div style="border:2px solid #1C1C1C;border-radius:8px;overflow:hidden;margin-bottom:28px">
      <!-- Invoice header strip -->
      <table style="width:100%;border-collapse:collapse;background:#1C1C1C">
        <tr>
          <td style="padding:16px 20px">
            <p style="margin:0;color:#A68B6E;font-size:10px;letter-spacing:3px;text-transform:uppercase">Tax Invoice</p>
            <p style="margin:6px 0 0;color:white;font-family:Georgia,serif;font-size:22px;letter-spacing:1px">${d.invoice_number}</p>
          </td>
          <td style="padding:16px 20px;text-align:right;vertical-align:middle">
            <span style="display:inline-block;background:#10B981;color:white;padding:6px 18px;border-radius:20px;font-size:12px;font-weight:bold;letter-spacing:2px">PAID</span>
          </td>
        </tr>
      </table>
      <!-- Invoice meta -->
      <table style="width:100%;border-collapse:collapse;background:white;padding:0">
        <tr>
          <td style="padding:14px 20px 0;font-size:12px;color:#888">Date</td>
          <td style="padding:14px 20px 0;font-size:12px;color:#1C1C1C;text-align:right">${date}</td>
        </tr>
        <tr>
          <td style="padding:6px 20px 0;font-size:12px;color:#888">Order</td>
          <td style="padding:6px 20px 0;font-size:12px;color:#1C1C1C;text-align:right;font-weight:bold">${d.order_number}</td>
        </tr>
        <tr>
          <td style="padding:6px 20px 0;font-size:12px;color:#888">Bill To</td>
          <td style="padding:6px 20px 0;font-size:12px;color:#1C1C1C;text-align:right">${d.customer_name}, ${d.address}, ${d.city}</td>
        </tr>
        <tr>
          <td style="padding:6px 20px 0;font-size:12px;color:#888">Paid Via</td>
          <td style="padding:6px 20px 0;font-size:12px;color:#1C1C1C;text-align:right">${method}</td>
        </tr>
        ${d.transaction_id ? `
        <tr>
          <td style="padding:6px 20px 14px;font-size:12px;color:#888">Transaction ID</td>
          <td style="padding:6px 20px 14px;font-size:11px;color:#1C1C1C;text-align:right;font-family:monospace">${d.transaction_id}</td>
        </tr>` : `<tr><td colspan="2" style="padding:0 0 8px"></td></tr>`}
      </table>
    </div>`
}

// Standalone invoice document — attached as a downloadable .html file on the
// payment-confirmed email (online payments only; COD invoices are settled at
// delivery, not by email).
function buildInvoiceDocument(d: {
  invoice_number: string
  order_number:   string
  customer_name:  string
  address:        string
  city:           string
  items: EmailItem[]
  subtotal:        number
  delivery_charge: number
  total:           number
  payment_method:  string
  transaction_id?: string
}): string {
  const date = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
  const method = PAYMENT_METHOD_LABELS[d.payment_method] || d.payment_method
  const itemRows = buildItemRows(d.items)
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Invoice ${d.invoice_number}</title></head>
<body style="font-family:Arial,sans-serif;background:white;margin:0;padding:32px">
  <div style="max-width:600px;margin:0 auto">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid #A68B6E">
      <div>
        <h1 style="margin:0;font-size:22px;font-family:Georgia,serif;color:#1C1C1C;letter-spacing:2px">ZADII&apos;S</h1>
        <p style="margin:4px 0 0;font-size:11px;color:#A68B6E;letter-spacing:1px">AUTHENTIC PAKISTANI FASHION</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-size:16px;font-weight:bold;color:#1C1C1C">INVOICE</p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.invoice_number}</p>
        <p style="margin:6px 0 0;font-size:11px;color:#6B7280">Order: ${d.order_number}</p>
        <p style="margin:2px 0 0;font-size:11px;color:#6B7280">Date: ${date}</p>
      </div>
    </div>
    <div style="margin-bottom:20px">
      <p style="margin:0 0 4px;font-size:10px;font-weight:bold;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px">Bill To</p>
      <p style="margin:0;font-size:14px;font-weight:bold;color:#1C1C1C">${d.customer_name}</p>
      <p style="margin:2px 0 0;font-size:12px;color:#4B5563">${d.address}, ${d.city}</p>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead>
        <tr style="background:#FAF8F5;border-bottom:2px solid #E8DDD4">
          <th style="padding:8px 10px;text-align:left;font-size:11px;color:#6B7280;text-transform:uppercase">Item</th>
          <th style="padding:8px 10px;text-align:center;font-size:11px;color:#6B7280;text-transform:uppercase">Qty</th>
          <th style="padding:8px 10px;text-align:right;font-size:11px;color:#6B7280;text-transform:uppercase">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
      <tr><td style="padding:5px 0;font-size:12px;color:#6B7280">Subtotal</td><td style="padding:5px 0;font-size:12px;color:#1C1C1C;text-align:right">PKR ${Number(d.subtotal).toLocaleString()}</td></tr>
      <tr><td style="padding:5px 0;font-size:12px;color:#6B7280">Delivery</td><td style="padding:5px 0;font-size:12px;color:#1C1C1C;text-align:right">PKR ${Number(d.delivery_charge).toLocaleString()}</td></tr>
      <tr style="border-top:2px solid #E8DDD4">
        <td style="padding:8px 0;font-size:13px;font-weight:bold;color:#1C1C1C">Total</td>
        <td style="padding:8px 0;font-size:13px;font-weight:bold;color:#A68B6E;text-align:right">PKR ${Number(d.total).toLocaleString()}</td>
      </tr>
    </table>
    <div style="background:#FAF8F5;border:1px solid #E8DDD4;border-radius:6px;padding:14px 18px">
      <p style="margin:0 0 6px;font-size:10px;font-weight:bold;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px">Payment Details</p>
      <p style="margin:0;font-size:12px;color:#6B7280">Method: <strong style="color:#1C1C1C;text-transform:capitalize">${method}</strong></p>
      <p style="margin:4px 0 0;font-size:12px;color:#6B7280">Status: <strong style="color:#15803D">PAID</strong></p>
      ${d.transaction_id ? `<p style="margin:4px 0 0;font-size:11px;color:#6B7280">Transaction ID: ${d.transaction_id}</p>` : ''}
    </div>
    <p style="margin:20px 0 0;font-size:11px;color:#9CA3AF;text-align:center">This is a computer-generated invoice and does not require a physical signature.</p>
  </div>
</body>
</html>`
}

export async function sendCustomerPaymentConfirmed(to: string | null | undefined, d: {
  order_number:   string
  customer_name:  string
  items: EmailItem[]
  subtotal:        number
  delivery_charge: number
  total:           number
  payment_method:  string
  address:         string
  city:            string
  invoice_number?: string
  transaction_id?: string
  is_sale?:        boolean
}): Promise<void> {
  if (!to) return
  const links = await productLinkMap(d.items)
  const itemRows = buildItemRows(d.items, links)
  const invoiceBlock = d.invoice_number
    ? buildInvoiceBlock({
        invoice_number: d.invoice_number,
        order_number:   d.order_number,
        customer_name:  d.customer_name,
        address:        d.address,
        city:           d.city,
        payment_method: d.payment_method,
        transaction_id: d.transaction_id,
      })
    : ''

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">${d.is_sale ? '🛍️ Sale Payment Confirmed!' : 'Payment Confirmed!'}</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${d.customer_name}, your payment has been received and your order is being prepared.</p>
        ${d.is_sale ? `<div style="background:#FEF9EC;border:1px solid #F5D87A;border-radius:8px;padding:14px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;color:#92640A;font-weight:bold">You ordered during our sale!</p>
          <p style="margin:4px 0 0;color:#92640A;font-size:13px">Your sale prices are locked in. Congratulations on the deal!</p>
        </div>` : ''}
        ${invoiceBlock}
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${itemRows}</table>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(d.subtotal).toLocaleString()}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Delivery</td><td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(d.delivery_charge).toLocaleString()}</td></tr>
          <tr style="border-top:2px solid #E8DDD4">
            <td style="padding:10px 0;font-weight:bold;color:#1C1C1C">Amount Paid</td>
            <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:1.1em;color:#A68B6E">PKR ${Number(d.total).toLocaleString()}</td>
          </tr>
        </table>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-weight:bold;color:#1C1C1C">Delivery Address</p>
          <p style="margin:0;color:#666">${d.address}, ${d.city}</p>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Payment confirmed — Order ${d.order_number} — ZADII'S`,
      html,
      attachments: d.invoice_number ? [{
        filename: `${d.invoice_number}.html`,
        contentType: 'text/html',
        // Resend expects string attachment content pre-encoded as base64.
        content: Buffer.from(buildInvoiceDocument({
          invoice_number:  d.invoice_number,
          order_number:    d.order_number,
          customer_name:   d.customer_name,
          address:         d.address,
          city:            d.city,
          items:           d.items,
          subtotal:        d.subtotal,
          delivery_charge: d.delivery_charge,
          total:           d.total,
          payment_method:  d.payment_method,
          transaction_id:  d.transaction_id,
        }), 'utf-8').toString('base64'),
      }] : undefined,
    })
  } catch (e) {
    console.error('sendCustomerPaymentConfirmed failed:', e)
  }
}

export async function sendCustomerOrderDelivered(to: string | null | undefined, d: {
  order_number: string
  customer_name: string
  total: number
  items?: EmailItem[]
}): Promise<void> {
  if (!to) return
  const links = d.items ? await productLinkMap(d.items) : {}
  const itemRows = d.items ? buildItemRows(d.items, links) : ''
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Your Order Has Arrived!</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${d.customer_name}, your ZADII&apos;S order has been delivered.</p>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        ${itemRows ? `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">${itemRows}</table>` : ''}
        <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0;color:#166534;font-weight:bold">✓ Delivered</p>
          <p style="margin:6px 0 0;color:#166534;font-size:14px">We hope you love your new outfit! Share your review at zadiis.com.pk</p>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your order ${d.order_number} has been delivered — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerOrderDelivered failed:', e)
  }
}

export async function sendOwnerNewOrder(d: {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  address: string
  city: string
  items: EmailItem[]
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: string
  payment_status: string
  is_sale?: boolean
}): Promise<void> {
  const links = await productLinkMap(d.items)
  const itemRows = buildItemRows(d.items, links)
  const saleTag = d.is_sale ? '🛍️ SALE — ' : ''
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">
        ${d.is_sale ? '🛍️ SALE ORDER — ' : 'New Order — '}${d.order_number}
      </h2>
      <p><strong>Customer:</strong> ${d.customer_name} · ${d.customer_phone}</p>
      <p><strong>Email:</strong> ${d.customer_email ?? '—'}</p>
      <p><strong>Address:</strong> ${d.address}, ${d.city}</p>
      <p><strong>Payment:</strong> ${d.payment_method} · ${d.payment_status}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemRows}</table>
      <p><strong>Subtotal:</strong> PKR ${Number(d.subtotal).toLocaleString()}</p>
      <p><strong>Delivery:</strong> PKR ${Number(d.delivery_charge).toLocaleString()}</p>
      <p style="font-size:1.1em;color:#A68B6E"><strong>Total: PKR ${Number(d.total).toLocaleString()}</strong></p>
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to: process.env.OWNER_EMAIL!,
      subject: `${saleTag}New order ${d.order_number} — ${d.payment_method} — PKR ${Number(d.total).toLocaleString()}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerNewOrder failed:', e)
  }
}

export async function sendOwnerPaymentReceived(d: {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  total: number
  payment_method: string
  safepay_transaction_id?: string | null
  items?: EmailItem[]
}): Promise<void> {
  try {
    const itemRows = d.items?.length ? buildItemRows(d.items) : ''
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">Payment Received — ${d.order_number}</h2>
      <p><strong>Customer:</strong> ${d.customer_name} · ${d.customer_phone}</p>
      ${d.customer_email ? `<p><strong>Email:</strong> ${d.customer_email}</p>` : ''}
      <p><strong>Amount:</strong> PKR ${Number(d.total).toLocaleString()}</p>
      <p><strong>Method:</strong> ${d.payment_method}</p>
      ${d.safepay_transaction_id ? `<p><strong>Transaction ID:</strong> ${d.safepay_transaction_id}</p>` : ''}
      ${itemRows ? `<table style="width:100%;border-collapse:collapse;margin-top:12px">${itemRows}</table>` : ''}
    </div>`
    await resend.emails.send({
      from: FROM,
      to: process.env.OWNER_EMAIL!,
      subject: `Payment received — ${d.order_number} — PKR ${Number(d.total).toLocaleString()}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerPaymentReceived failed:', e)
  }
}

async function sendWhatsAppToOwner(message: string): Promise<void> {
  const sid  = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_WHATSAPP_FROM   // e.g. whatsapp:+14155238886
  const to    = process.env.OWNER_WHATSAPP_NUMBER   // e.g. +923001234567
  if (!sid || !token || !from || !to) return
  try {
    const body = new URLSearchParams({
      To:   `whatsapp:${to}`,
      From: from,
      Body: message,
    })
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method:  'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
  } catch (e) {
    console.error('WhatsApp notification failed:', e)
  }
}

export async function sendOwnerStockConflict(d: { product_names: string }): Promise<void> {
  const ts = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">
        Stock Conflict Detected
      </h2>
      <p>A customer reached the checkout page but one or more items in their cart were no longer available.</p>
      <p><strong>Item(s):</strong> ${d.product_names}</p>
      <p><strong>Time:</strong> ${ts}</p>
      <p style="color:#6B7280;font-size:13px">The item was automatically removed from the customer's cart. You may want to review stock levels.</p>
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to: process.env.OWNER_EMAIL!,
      subject: `Stock conflict at checkout — ${d.product_names}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerStockConflict email failed:', e)
  }
  const ts2 = new Date().toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' })
  await sendWhatsAppToOwner(
    `[ZADII'S] Stock conflict at ${ts2}: "${d.product_names}" went out of stock while a customer was checking out. Please review your inventory.`
  )
}

const CANCEL_REASON_LABELS: Record<string, string> = {
  changed_mind:       'Changed My Mind',
  ordered_by_mistake: 'Ordered by Mistake',
  found_better_price: 'Found a Better Price',
  delivery_too_slow:  'Delivery Taking Too Long',
  other:              'Other',
}

const RETURN_REASON_LABELS: Record<string, string> = {
  wrong_size:      'Wrong Size',
  defective_item:  'Defective / Damaged',
  wrong_item_sent: 'Wrong Item Sent',
  changed_mind:    'Changed Mind',
  other:           'Other',
}

export async function sendCustomerOrderCancelled(to: string | null | undefined, d: {
  order_number: string
  customer_name: string
}): Promise<void> {
  if (!to) return
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Order Cancelled</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${d.customer_name}, your order has been cancelled as requested.</p>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        <p style="color:#666;font-size:14px">If you paid online, your refund will be processed within 3–5 business days.</p>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your order ${d.order_number} has been cancelled — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerOrderCancelled failed:', e)
  }
}

export async function sendOwnerCancellationRequest(d: {
  order_number: string
  customer_email: string
  customer_name?: string | null
  reason: string
  notes?: string | null
}): Promise<void> {
  const reasonLabel = CANCEL_REASON_LABELS[d.reason] || d.reason
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">
        ⚠️ Cancellation Request — ${d.order_number}
      </h2>
      <p><strong>Customer:</strong> ${d.customer_name || '—'}</p>
      <p><strong>Email:</strong> ${d.customer_email}</p>
      <p><strong>Reason:</strong> ${reasonLabel}</p>
      ${d.notes ? `<p><strong>Notes:</strong> ${d.notes}</p>` : ''}
      <p style="color:#6B7280;font-size:13px;margin-top:16px">Go to your admin panel → Cancellations tab to process this request.</p>
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to: process.env.OWNER_EMAIL!,
      subject: `Cancellation request — ${d.order_number}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerCancellationRequest failed:', e)
  }
}

export async function sendCustomerCancellationConfirmation(to: string | null | undefined, d: {
  order_number: string
  customer_name?: string | null
}): Promise<void> {
  if (!to) return
  const name = d.customer_name || 'there'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">We've Received Your Request</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${name}, thank you for getting in touch.</p>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        <p style="color:#666;font-size:14px">We have received your cancellation request and our team will review it within <strong>24 hours</strong>. You will receive a confirmation email once your cancellation has been processed.</p>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Cancellation request received — ${d.order_number} — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerCancellationConfirmation failed:', e)
  }
}

export async function sendOwnerReturnRequest(d: {
  order_number: string
  customer_email: string
  customer_name?: string | null
  reason: string
  notes?: string | null
  items?: EmailItem[]
}): Promise<void> {
  try {
    const reasonLabel = RETURN_REASON_LABELS[d.reason] || d.reason
    const itemRows = d.items?.length ? buildItemRows(d.items) : ''
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">
        📦 Return Request — ${d.order_number}
      </h2>
      <p><strong>Customer:</strong> ${d.customer_name || '—'}</p>
      <p><strong>Email:</strong> ${d.customer_email}</p>
      <p><strong>Reason:</strong> ${reasonLabel}</p>
      ${d.notes ? `<p><strong>Notes:</strong> ${d.notes}</p>` : ''}
      ${itemRows ? `<table style="width:100%;border-collapse:collapse;margin-top:12px">${itemRows}</table>` : ''}
      <p style="color:#6B7280;font-size:13px;margin-top:16px">Go to your admin panel → Returns tab to process this request.</p>
    </div>`
    await resend.emails.send({
      from: FROM,
      to: process.env.OWNER_EMAIL!,
      subject: `Return request — ${d.order_number}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerReturnRequest failed:', e)
  }
}

export async function sendCustomerReturnConfirmation(to: string | null | undefined, d: {
  order_number: string
  customer_name?: string | null
}): Promise<void> {
  if (!to) return
  const name = d.customer_name || 'there'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Return Request Received</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${name}, we've received your return request.</p>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        <p style="color:#666;font-size:14px">Our team will review your return request and respond within <strong>24 hours</strong> with next steps, including the return address and instructions.</p>
        <p style="color:#666;font-size:14px;margin-top:12px">Please do not ship the item back until you've received our confirmation. Thank you for your patience.</p>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Return request received — ${d.order_number} — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerReturnConfirmation failed:', e)
  }
}

export async function sendOwnerExchangeRequest(d: {
  order_number: string
  customer_email: string
  customer_name?: string | null
  exchange_details: string
  notes?: string | null
  items?: EmailItem[]
}): Promise<void> {
  try {
    const itemRows = d.items?.length ? buildItemRows(d.items) : ''
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">
        🔄 Exchange Request — ${d.order_number}
      </h2>
      <p><strong>Customer:</strong> ${d.customer_name || '—'}</p>
      <p><strong>Email:</strong> ${d.customer_email}</p>
      <p><strong>Wants instead:</strong> ${d.exchange_details}</p>
      ${d.notes ? `<p><strong>Notes:</strong> ${d.notes}</p>` : ''}
      ${itemRows ? `<table style="width:100%;border-collapse:collapse;margin-top:12px">${itemRows}</table>` : ''}
      <p style="color:#6B7280;font-size:13px;margin-top:16px">Go to your admin panel → Returns tab to process this exchange. Ship the replacement and click Mark Shipped to notify the customer.</p>
    </div>`
    await resend.emails.send({
      from: FROM,
      to: process.env.OWNER_EMAIL!,
      subject: `Exchange request — ${d.order_number}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerExchangeRequest failed:', e)
  }
}

export async function sendCustomerExchangeConfirmation(to: string | null | undefined, d: {
  order_number: string
  customer_name?: string | null
}): Promise<void> {
  if (!to) return
  const name = d.customer_name || 'there'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Exchange Request Received</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${name}, we've received your exchange request.</p>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        <p style="color:#666;font-size:14px">Our team will prepare your replacement and you will receive a shipping confirmation email as soon as your exchange is dispatched. Please do not send back the original item until you hear from us.</p>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Exchange request received — ${d.order_number} — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerExchangeConfirmation failed:', e)
  }
}

export async function sendCustomerExchangeShipped(to: string | null | undefined, d: {
  order_number: string
  customer_name?: string | null
  exchange_details?: string | null
}): Promise<void> {
  if (!to) return
  const name = d.customer_name || 'there'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Your Exchange is on the Way!</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${name}, great news — your exchange for order ${d.order_number} has been dispatched.</p>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Original Order</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        ${d.exchange_details ? `
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0 0 4px;font-weight:bold;color:#1C1C1C;font-size:13px;text-transform:uppercase;letter-spacing:1px">Replacement Item</p>
          <p style="margin:0;color:#4B5563;font-size:15px">${d.exchange_details}</p>
        </div>` : ''}
        <div style="background:#EDE9FE;border:1px solid #C4B5FD;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0;color:#5B21B6;font-weight:bold">📦 Dispatched</p>
          <p style="margin:8px 0 0;color:#5B21B6;font-size:14px">Please allow <strong>2–3 business days</strong> for processing. Your replacement is expected to arrive within <strong>3–4 business days</strong> from today.</p>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your exchange for ${d.order_number} is on the way — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerExchangeShipped failed:', e)
  }
}

export async function sendCustomerExchangeDelivered(to: string | null | undefined, d: {
  order_number: string
  customer_name?: string | null
}): Promise<void> {
  if (!to) return
  const name = d.customer_name || 'there'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Your Exchange Has Arrived!</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${name}, your exchange for order <strong>${d.order_number}</strong> has been delivered. We hope it is exactly what you were looking for!</p>
        <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0;color:#166534;font-weight:bold">✓ Exchange Delivered</p>
          <p style="margin:6px 0 0;color:#166534;font-size:14px">We hope you love your new piece. Thank you for choosing ZADII&apos;S — we look forward to serving you again!</p>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your exchange for ${d.order_number} has been delivered — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerExchangeDelivered failed:', e)
  }
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:40px 32px;background:#FAF8F5;text-align:center">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Verify Your Email</h2>
        <p style="color:#666;margin:0 0 28px;font-size:14px">Enter this code at checkout to confirm your email address:</p>
        <div style="background:white;border:2px solid #E8DDD4;border-radius:12px;padding:28px 40px;display:inline-block;margin-bottom:24px">
          <p style="margin:0;font-size:42px;font-weight:bold;color:#1C1C1C;letter-spacing:14px;font-family:monospace">${otp}</p>
        </div>
        <p style="color:#9CA3AF;font-size:13px;margin:0">This code expires in 10 minutes.</p>
        <p style="color:#9CA3AF;font-size:12px;margin:8px 0 0">If you didn't request this, you can safely ignore this email.</p>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${otp} — Your ZADII'S verification code`,
      html,
    })
  } catch (e) {
    console.error('sendOtpEmail failed:', e)
  }
}

export async function sendBackInStockEmail(to: string, d: {
  product_name: string
  product_slug: string
  product_image?: string
}): Promise<void> {
  const storeUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zadiis.com.pk'
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">It&apos;s back!</h2>
        <p style="color:#666;margin:0 0 24px">
          Great news — <strong>${d.product_name}</strong> is back in stock.
          Grab yours before it sells out again.
        </p>
        ${d.product_image
          ? `<img src="${d.product_image}" alt="${d.product_name}" style="width:100%;max-width:300px;border-radius:8px;display:block;margin-bottom:24px" />`
          : ''}
        <a href="${storeUrl}/shop/${d.product_slug}"
           style="display:inline-block;background:#1C1C1C;color:white;padding:14px 32px;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;border-radius:2px">
          Shop Now →
        </a>
        <p style="color:#9CA3AF;font-size:11px;margin-top:28px">
          You received this because you joined the waitlist for this item on zadiis.com.pk.
        </p>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `${d.product_name} is back in stock — ZADII'S`,
      html,
    })
  } catch (e) {
    console.error('sendBackInStockEmail failed:', e)
  }
}
