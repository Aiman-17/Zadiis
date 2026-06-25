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

export async function sendCustomerPaymentConfirmed(to: string | null | undefined, d: {
  order_number:   string
  customer_name:  string
  items: Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>
  subtotal:        number
  delivery_charge: number
  total:           number
  payment_method:  string
  address:         string
  city:            string
  invoice_number?: string
  transaction_id?: string
}): Promise<void> {
  if (!to) return
  const itemRows    = buildItemRows(d.items)
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
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Payment Confirmed!</h2>
        <p style="color:#666;margin:0 0 24px">Hi ${d.customer_name}, your payment has been received and your order is being prepared.</p>
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
  is_sale?: boolean
}): Promise<void> {
  const itemRows = buildItemRows(d.items)
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
    `[ZADIIS] Stock conflict at ${ts2}: "${d.product_names}" went out of stock while a customer was checking out. Please review your inventory.`
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
        <p style="color:#666;font-size:14px">If you paid online, your refund will be processed within 3–5 business days. For any questions, please WhatsApp us.</p>
        <div style="text-align:center;margin-top:24px">
          <a href="https://wa.me/${WHATSAPP}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your order ${d.order_number} has been cancelled — ZADIIS`,
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
        <p style="color:#666;font-size:14px;margin-top:12px">In the meantime, if you have any questions, please don't hesitate to reach out via WhatsApp.</p>
        <div style="text-align:center;margin-top:24px">
          <a href="https://wa.me/${WHATSAPP}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Cancellation request received — ${d.order_number} — ZADIIS`,
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
}): Promise<void> {
  const reasonLabel = RETURN_REASON_LABELS[d.reason] || d.reason
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">
        📦 Return Request — ${d.order_number}
      </h2>
      <p><strong>Customer:</strong> ${d.customer_name || '—'}</p>
      <p><strong>Email:</strong> ${d.customer_email}</p>
      <p><strong>Reason:</strong> ${reasonLabel}</p>
      ${d.notes ? `<p><strong>Notes:</strong> ${d.notes}</p>` : ''}
      <p style="color:#6B7280;font-size:13px;margin-top:16px">Go to your admin panel → Returns tab to process this request.</p>
    </div>`
  try {
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
        <div style="text-align:center;margin-top:24px">
          <a href="https://wa.me/${WHATSAPP}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Return request received — ${d.order_number} — ZADIIS`,
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
}): Promise<void> {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">
        🔄 Exchange Request — ${d.order_number}
      </h2>
      <p><strong>Customer:</strong> ${d.customer_name || '—'}</p>
      <p><strong>Email:</strong> ${d.customer_email}</p>
      <p><strong>Wants instead:</strong> ${d.exchange_details}</p>
      ${d.notes ? `<p><strong>Notes:</strong> ${d.notes}</p>` : ''}
      <p style="color:#6B7280;font-size:13px;margin-top:16px">Go to your admin panel → Returns tab to process this exchange. Ship the replacement and click Mark Shipped to notify the customer.</p>
    </div>`
  try {
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
        <p style="color:#666;font-size:14px;margin-top:12px">If you have any questions in the meantime, please reach out to us on WhatsApp.</p>
        <div style="text-align:center;margin-top:24px">
          <a href="https://wa.me/${WHATSAPP}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Exchange request received — ${d.order_number} — ZADIIS`,
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
        <p style="color:#666;font-size:14px">If you haven't received your exchange after 4 business days, please reach out to us on WhatsApp and we'll assist you right away.</p>
        <div style="text-align:center;margin-top:24px">
          <a href="https://wa.me/${WHATSAPP}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your exchange for ${d.order_number} is on the way — ZADIIS`,
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
          <p style="margin:6px 0 0;color:#166534;font-size:14px">We hope you love your new piece. Thank you for choosing ZADIIS — we look forward to serving you again!</p>
        </div>
        <div style="text-align:center;margin-top:8px">
          <a href="https://wa.me/${WHATSAPP}"
             style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
            WhatsApp Support
          </a>
        </div>
      </div>
      ${zadiisFooter()}
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your exchange for ${d.order_number} has been delivered — ZADIIS`,
      html,
    })
  } catch (e) {
    console.error('sendCustomerExchangeDelivered failed:', e)
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
      subject: `${d.product_name} is back in stock — ZADIIS`,
      html,
    })
  } catch (e) {
    console.error('sendBackInStockEmail failed:', e)
  }
}
