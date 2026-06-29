import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCustomerPaymentConfirmed, sendOwnerPaymentReceived } from '@/lib/email'
import { generateInvoice } from '@/lib/invoice'

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
  console.log('[webhook/safepay] received body:', rawBody.slice(0, 500))

  const signature = req.headers.get('sfpy-signature') || req.headers.get('x-sfpy-signature') || ''
  const secret = process.env.SAFEPAY_SECRET_KEY!

  if (secret && !verifySignature(rawBody, signature, secret)) {
    console.error('[webhook/safepay] Invalid signature. sig:', signature.slice(0, 20))
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[webhook/safepay] payload keys:', Object.keys(payload))

  // Extract tracker token — handle multiple possible payload shapes
  const data = payload?.data as Record<string, unknown> | undefined
  const tracker = data?.tracker as Record<string, unknown> | undefined
  const trackerToken = (tracker?.token ?? data?.tracker_token ?? payload?.tracker) as string | undefined
  const paymentStatus = (tracker?.status ?? tracker?.state ?? data?.status ?? payload?.status) as string | undefined
  const transactionId = ((data?.payment as Record<string, unknown>)?.id ?? data?.transaction_id) as string | undefined

  console.log('[webhook/safepay] tracker:', trackerToken, 'status:', paymentStatus)

  if (!trackerToken) {
    console.error('[webhook/safepay] No tracker token in payload:', JSON.stringify(payload))
    return NextResponse.json({ error: 'Missing tracker token' }, { status: 400 })
  }

  // Treat multiple status values as successful
  const PAID_STATUSES = ['charged', 'paid', 'completed', 'tracker_ended', 'success']
  const isSuccessful = PAID_STATUSES.includes((paymentStatus || '').toLowerCase())
  if (!isSuccessful) {
    console.log(`[webhook/safepay] Non-payment event: status=${paymentStatus}, ignoring`)
    return NextResponse.json({ received: true })
  }

  const { data: order, error: findError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, customer_email, total, subtotal, delivery_charge, items, address, city, payment_method, payment_status, is_sale')
    .eq('safepay_tracker', trackerToken)
    .single()

  if (findError || !order) {
    console.error('[webhook/safepay] Order not found for tracker:', trackerToken)
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.payment_status === 'paid') {
    return NextResponse.json({ received: true, skipped: 'already paid' })
  }

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
    transaction_id:  transactionId ?? undefined,
    is_sale:         order.is_sale ?? false,
  })

  await sendOwnerPaymentReceived({
    order_number: order.order_number,
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    total: order.total,
    payment_method: order.payment_method,
    safepay_transaction_id: transactionId,
  })

  console.log(`[webhook/safepay] Order ${order.order_number} marked paid. TXN: ${transactionId}`)
  return NextResponse.json({ received: true })
}
