import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .insert([body])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Send email to owner
    try {
      await resend.emails.send({
        from: 'orders@zadiis.com',
        to: process.env.OWNER_EMAIL!,
        subject: `New Order #${order.id.slice(0, 8).toUpperCase()} — PKR ${order.total.toLocaleString()}`,
        html: `
          <h2>New Order Received!</h2>
          <p><strong>Order ID:</strong> ${order.id}</p>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Phone:</strong> ${order.customer_phone}</p>
          <p><strong>Address:</strong> ${order.address}, ${order.city}</p>
          <p><strong>Payment:</strong> ${order.payment_method}</p>
          <h3>Items:</h3>
          <ul>
            ${(order.items as Array<{ product_name: string; size: string; color: string; quantity: number; price: number }>)
              .map(i => `<li>${i.product_name} — ${i.size}, ${i.color} × ${i.quantity} — PKR ${i.price.toLocaleString()}</li>`)
              .join('')}
          </ul>
          <p><strong>Total: PKR ${order.total.toLocaleString()}</strong></p>
        `,
      })
    } catch (emailError) {
      // Email failure should not block order creation
      console.error('Email send failed:', emailError)
    }

    return NextResponse.json({ orderId: order.id })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
