import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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

    if (!customer_name || !customer_phone || !address || !city || !payment_method || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let order = null
    let insertError = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const order_number = await generateOrderNumber()
      const { data, error } = await supabaseAdmin
        .from('orders')
        .insert([{
          order_number,
          customer_name,
          customer_phone,
          customer_email: customer_email ?? null,
          address,
          city,
          items,
          subtotal: subtotal ?? total,
          delivery_charge: delivery_charge ?? 0,
          total,
          payment_method,
        }])
        .select()
        .single()
      if (!error) { order = data; break }
      if (!error?.message?.includes('unique')) { insertError = error; break }
      insertError = error
    }

    if (!order) {
      console.error('DB insert error:', insertError)
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create order' }, { status: 500 })
    }

    const itemRows = (order.items as Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>)
      .map(i => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;color:#1C1C1C">
            ${i.product_name}${i.sku ? `<br><span style="font-size:12px;color:#A68B6E">${i.sku}</span>` : ''}
            <br><span style="font-size:12px;color:#888">${i.size} · ${i.color}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;text-align:center;color:#1C1C1C">×${i.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;text-align:right;color:#1C1C1C">PKR ${Number(i.price * i.quantity).toLocaleString()}</td>
        </tr>`)
      .join('')

    const ownerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">New Order — ${order.order_number}</h2>
        <p><strong>Customer:</strong> ${order.customer_name} · ${order.customer_phone}</p>
        <p><strong>Email:</strong> ${order.customer_email ?? '—'}</p>
        <p><strong>Address:</strong> ${order.address}, ${order.city}</p>
        <p><strong>Payment:</strong> ${order.payment_method}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemRows}</table>
        <p><strong>Subtotal:</strong> PKR ${Number(order.subtotal).toLocaleString()}</p>
        <p><strong>Delivery:</strong> PKR ${Number(order.delivery_charge).toLocaleString()}</p>
        <p style="font-size:1.1em;color:#A68B6E"><strong>Total: PKR ${Number(order.total).toLocaleString()}</strong></p>
      </div>`

    const customerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
        <!-- Header -->
        <div style="background:#1C1C1C;padding:28px 32px;text-align:center">
          <h1 style="color:white;font-family:Georgia,serif;margin:0;font-size:28px;letter-spacing:4px">ZADIIS</h1>
          <p style="color:#A68B6E;margin:6px 0 0;font-size:13px;letter-spacing:1px">Modern Pakistani Women's Fashion</p>
        </div>

        <!-- Body -->
        <div style="padding:32px;background:#FAF8F5">
          <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Order Confirmed!</h2>
          <p style="color:#666;margin:0 0 24px">Thank you ${order.customer_name}, your order has been placed successfully.</p>

          <!-- Order number box -->
          <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
            <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
            <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${order.order_number}</p>
          </div>

          <!-- Items -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${itemRows}</table>

          <!-- Totals -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr>
              <td style="padding:6px 0;color:#666">Subtotal</td>
              <td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(order.subtotal).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#666">Delivery</td>
              <td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(order.delivery_charge).toLocaleString()}</td>
            </tr>
            <tr style="border-top:2px solid #E8DDD4">
              <td style="padding:10px 0;font-weight:bold;color:#1C1C1C">Total</td>
              <td style="padding:10px 0;text-align:right;font-weight:bold;font-size:1.1em;color:#A68B6E">PKR ${Number(order.total).toLocaleString()}</td>
            </tr>
          </table>

          <!-- Delivery info -->
          <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px">
            <p style="margin:0 0 8px;font-weight:bold;color:#1C1C1C">Delivery Address</p>
            <p style="margin:0;color:#666">${order.address}, ${order.city}</p>
          </div>

          <!-- Payment note -->
          ${order.payment_method === 'cod'
            ? `<div style="background:#FEF9EC;border:1px solid #F5D87A;border-radius:8px;padding:16px 20px;margin-bottom:24px">
                <p style="margin:0;color:#92640A;font-weight:bold">Cash on Delivery</p>
                <p style="margin:6px 0 0;color:#92640A;font-size:14px">Please keep PKR ${Number(order.total).toLocaleString()} ready at the time of delivery.</p>
               </div>`
            : `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px 20px;margin-bottom:24px">
                <p style="margin:0;color:#166534;font-weight:bold">Online Payment</p>
                <p style="margin:6px 0 0;color:#166534;font-size:14px">Once your payment is confirmed, your order will be processed immediately.</p>
               </div>`}

          <!-- WhatsApp support -->
          <div style="text-align:center;margin-bottom:8px">
            <a href="https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi!%20I%20need%20help%20with%20my%20order%20${order.order_number}"
               style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">
              WhatsApp Support
            </a>
            <p style="margin:8px 0 0;font-size:12px;color:#888">Questions? Chat with us on WhatsApp</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#1C1C1C;padding:20px 32px;text-align:center">
          <p style="color:#888;margin:0;font-size:12px">© 2026 ZADIIS. All rights reserved.</p>
          <p style="color:#666;margin:6px 0 0;font-size:11px">zadiis.com.pk</p>
        </div>
      </div>`

    try {
      await resend.emails.send({
        from: 'ZADIIS <orders@zadiis.com.pk>',
        to: process.env.OWNER_EMAIL!,
        subject: `New Order ${order.order_number} — PKR ${Number(order.total).toLocaleString()}`,
        html: ownerHtml,
      })

      if (order.customer_email) {
        await resend.emails.send({
          from: 'ZADIIS <orders@zadiis.com.pk>',
          to: order.customer_email,
          subject: `Order Confirmed — ${order.order_number} | ZADIIS`,
          html: customerHtml,
        })
      }
    } catch (emailError) {
      console.error('Email send failed:', emailError)
    }

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    console.error('Orders API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
