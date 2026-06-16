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

    const order_number = await generateOrderNumber()

    const { data: order, error } = await supabaseAdmin
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

    if (error) {
      console.error('DB insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await resend.emails.send({
        from: 'orders@zadiis.com',
        to: process.env.OWNER_EMAIL!,
        subject: `New Order ${order.order_number} — PKR ${Number(order.total).toLocaleString()}`,
        html: `
          <h2 style="color:#1C1C1C;font-family:Georgia,serif">New Order Received!</h2>
          <p><strong>Order:</strong> ${order.order_number}</p>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Phone:</strong> ${order.customer_phone}</p>
          <p><strong>Email:</strong> ${order.customer_email ?? '—'}</p>
          <p><strong>Address:</strong> ${order.address}, ${order.city}</p>
          <p><strong>Payment:</strong> ${order.payment_method}</p>
          <h3>Items:</h3>
          <ul>
            ${(order.items as Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>)
              .map(i => `<li>${i.product_name}${i.sku ? ` (${i.sku})` : ''} — ${i.size}, ${i.color} × ${i.quantity} — PKR ${Number(i.price).toLocaleString()}</li>`)
              .join('')}
          </ul>
          <p><strong>Subtotal:</strong> PKR ${Number(order.subtotal).toLocaleString()}</p>
          <p><strong>Delivery:</strong> PKR ${Number(order.delivery_charge).toLocaleString()}</p>
          <p style="font-size:1.1em"><strong>Total: PKR ${Number(order.total).toLocaleString()}</strong></p>
        `,
      })
    } catch (emailError) {
      console.error('Email send failed:', emailError)
    }

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    console.error('Orders API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
