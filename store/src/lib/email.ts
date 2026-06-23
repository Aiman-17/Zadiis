import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'ZADIIS <orders@zadiis.com.pk>'
const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''

// Shared item rows builder (used by multiple templates)
function buildItemRows(items: Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>): string {
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

// Shared ZADIIS header HTML
function zadiisHeader(): string {
  return `
    <div style="background:#1C1C1C;padding:28px 32px;text-align:center">
      <h1 style="color:white;font-family:Georgia,serif;margin:0;font-size:28px;letter-spacing:4px">ZADIIS</h1>
      <p style="color:#A68B6E;margin:6px 0 0;font-size:13px;letter-spacing:1px">Modern Pakistani Women's Fashion</p>
    </div>`
}

// Shared ZADIIS footer HTML
function zadiisFooter(): string {
  return `
    <div style="background:#1C1C1C;padding:20px 32px;text-align:center">
      <p style="color:#888;margin:0;font-size:12px">© 2026 ZADIIS. All rights reserved.</p>
      <p style="color:#666;margin:6px 0 0;font-size:11px">zadiis.com.pk</p>
    </div>`
}

export async function sendCustomerOrderConfirmed(to: string | null | undefined, d: {
  order_number: string
  customer_name: string
  items: Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: string
  address: string
  city: string
}): Promise<void> {
  if (!to) return
  const itemRows = buildItemRows(d.items)
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Order Confirmed!</h2>
        <p style="color:#666;margin:0 0 24px">Thank you ${d.customer_name}, your order has been placed successfully.</p>
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
        <div style="text-align:center;margin-bottom:8px">
          <a href="https://wa.me/${WHATSAPP}?text=Hi!%20I%20need%20help%20with%20my%20order%20${d.order_number}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
          <p style="margin:8px 0 0;font-size:12px;color:#888">Questions? Chat with us on WhatsApp</p>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your order ${d.order_number} has been placed — ZADIIS`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerOrderConfirmed failed:', e)
  }
}

export async function sendCustomerPaymentConfirmed(to: string | null | undefined, d: {
  order_number: string
  customer_name: string
  items: Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: string
  address: string
  city: string
}): Promise<void> {
  if (!to) return
  const itemRows = buildItemRows(d.items)
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Payment Confirmed!</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${d.customer_name}, your payment has been received and your order is being prepared.</p>
        <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:12px 20px;margin-bottom:24px">
          <p style="margin:0;color:#166534;font-weight:bold">✓ Payment received via ${d.payment_method.charAt(0).toUpperCase() + d.payment_method.slice(1)}</p>
        </div>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${itemRows}</table>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(d.subtotal).toLocaleString()}</td></tr>
          <tr><td style="padding:6px 0;color:#666">Delivery</td><td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(d.delivery_charge).toLocaleString()}</td></tr>
          <tr style="border-top:2px solid #E8DDD4">
            <td style="padding:10px 0;font-weight:bold;color:#1C1C1C">Total Paid</td>
            <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:1.1em;color:#A68B6E">PKR ${Number(d.total).toLocaleString()}</td>
          </tr>
        </table>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-weight:bold;color:#1C1C1C">Delivery Address</p>
          <p style="margin:0;color:#666">${d.address}, ${d.city}</p>
        </div>
        <div style="text-align:center;margin-bottom:8px">
          <a href="https://wa.me/${WHATSAPP}?text=Hi!%20I%20need%20help%20with%20my%20order%20${d.order_number}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
          <p style="margin:8px 0 0;font-size:12px;color:#888">Questions? Chat with us on WhatsApp</p>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Payment confirmed — Order ${d.order_number} — ZADIIS`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerPaymentConfirmed failed:', e)
  }
}

export async function sendCustomerOrderDelivered(to: string | null | undefined, d: {
  order_number: string
  customer_name: string
  total: number
}): Promise<void> {
  if (!to) return
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
      ${zadiisHeader()}
      <div style="padding:32px;background:#FAF8F5">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Your Order Has Arrived!</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${d.customer_name}, your ZADIIS order has been delivered.</p>
        <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
          <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
          <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${d.order_number}</p>
        </div>
        <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0;color:#166534;font-weight:bold">✓ Delivered</p>
          <p style="margin:6px 0 0;color:#166534;font-size:14px">We hope you love your new outfit! Share your review at zadiis.com.pk</p>
        </div>
        <div style="text-align:center;margin-bottom:8px">
          <a href="https://wa.me/${WHATSAPP}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
          <p style="margin:8px 0 0;font-size:12px;color:#888">Questions? Chat with us on WhatsApp</p>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your order ${d.order_number} has been delivered — ZADIIS`,
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
  items: Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: string
  payment_status: string
}): Promise<void> {
  const itemRows = buildItemRows(d.items)
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">New Order — ${d.order_number}</h2>
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
      subject: `New order ${d.order_number} — ${d.payment_method} — PKR ${Number(d.total).toLocaleString()}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerNewOrder failed:', e)
  }
}

export async function sendOwnerSaleOrder(d: Parameters<typeof sendOwnerNewOrder>[0]): Promise<void> {
  const itemRows = buildItemRows(d.items)
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">🛍️ SALE ORDER — ${d.order_number}</h2>
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
      subject: `🛍️ SALE ORDER — ${d.order_number} — ${d.payment_method} — PKR ${Number(d.total).toLocaleString()}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerSaleOrder failed:', e)
  }
}

export async function sendOwnerPaymentReceived(d: {
  order_number: string
  customer_name: string
  customer_phone: string
  total: number
  payment_method: string
  safepay_transaction_id?: string | null
}): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">Payment Received — ${d.order_number}</h2>
      <p><strong>Customer:</strong> ${d.customer_name} · ${d.customer_phone}</p>
      <p><strong>Amount:</strong> PKR ${Number(d.total).toLocaleString()}</p>
      <p><strong>Method:</strong> ${d.payment_method}</p>
      ${d.safepay_transaction_id ? `<p><strong>Transaction ID:</strong> ${d.safepay_transaction_id}</p>` : ''}
    </div>`
  try {
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
