import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCustomerPaymentConfirmed, sendOwnerPaymentReceived } from '@/lib/email'
import { generateInvoice } from '@/lib/invoice'

const SAFEPAY_ENV = process.env.NEXT_PUBLIC_SAFEPAY_ENV || 'sandbox'
const SAFEPAY_API_BASE = SAFEPAY_ENV === 'production'
  ? 'https://api.getsafepay.com'
  : 'https://sandbox.api.getsafepay.com'

export async function POST(req: NextRequest) {
  const { orderId } = await req.json().catch(() => ({}))
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, customer_email, safepay_tracker, safepay_transaction_id, payment_status, payment_method, total, subtotal, delivery_charge, items, address, city, is_sale')
    .eq('id', orderId)
    .single()

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  if (order.payment_status === 'paid') return NextResponse.json({ paid: true })
  if (!order.safepay_tracker) return NextResponse.json({ paid: false, reason: 'no_tracker' })

  // Verify with Safepay API
  let state: string | undefined
  try {
    const sfRes = await fetch(`${SAFEPAY_API_BASE}/order/v1/${order.safepay_tracker}`, {
      headers: { 'X-SFPY-MERCHANT-SECRET': process.env.SAFEPAY_API_KEY! },
      signal: AbortSignal.timeout(8000),
    })
    if (sfRes.ok) {
      const sfData = await sfRes.json()
      state = sfData?.data?.state as string | undefined
      console.log(`[verify] Tracker ${order.safepay_tracker} state: ${state}`)
    } else {
      const errText = await sfRes.text().catch(() => '')
      console.error(`[verify] Safepay API ${sfRes.status}:`, errText)
      return NextResponse.json({ paid: false, reason: 'safepay_api_error' })
    }
  } catch (err) {
    console.error('[verify] Safepay fetch failed:', err)
    return NextResponse.json({ paid: false, reason: 'safepay_timeout' })
  }

  const CONFIRMED_STATES = ['TRACKER_ENDED', 'PAID', 'COMPLETED', 'CHARGED']
  if (!CONFIRMED_STATES.includes((state || '').toUpperCase())) {
    return NextResponse.json({ paid: false, reason: 'not_completed', state })
  }

  // Mark order paid
  const { error: updateErr } = await supabaseAdmin
    .from('orders')
    .update({ payment_status: 'paid', payment_verified_at: new Date().toISOString() })
    .eq('id', order.id)

  if (updateErr) {
    console.error('[verify] DB update failed:', updateErr.message)
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
  }

  // Generate invoice (idempotent — returns existing number if already created)
  const invoiceNumber = await generateInvoice(order.id)

  await sendCustomerPaymentConfirmed(order.customer_email, {
    order_number:    order.order_number,
    customer_name:   order.customer_name,
    items:           order.items,
    subtotal:        order.subtotal,
    delivery_charge: order.delivery_charge,
    total:           order.total,
    payment_method:  order.payment_method,
    address:         order.address,
    city:            order.city,
    invoice_number:  invoiceNumber ?? undefined,
    transaction_id:  order.safepay_transaction_id ?? undefined,
    is_sale:         order.is_sale ?? false,
  })

  await sendOwnerPaymentReceived({
    order_number: order.order_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    total: order.total,
    payment_method: order.payment_method,
  })

  console.log(`[verify] Order ${order.order_number} marked paid via redirect verification`)
  return NextResponse.json({ paid: true })
}
