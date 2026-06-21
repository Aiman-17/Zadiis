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

  // Verify signature — header name per Safepay docs
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

  // Extract tracker token — path per Safepay webhook payload spec
  const tracker = (payload?.data as Record<string, unknown>)?.tracker as Record<string, unknown> | undefined
  const trackerToken = tracker?.token as string | undefined
  const paymentStatus = tracker?.status as string | undefined
  const transactionId = ((payload?.data as Record<string, unknown>)?.payment as Record<string, unknown>)?.id as string | undefined

  if (!trackerToken) {
    console.error('[webhook/safepay] No tracker token in payload:', JSON.stringify(payload))
    return NextResponse.json({ error: 'Missing tracker token' }, { status: 400 })
  }

  // Only process successful payments
  const isSuccessful = ['charged', 'paid', 'completed'].includes((paymentStatus || '').toLowerCase())
  if (!isSuccessful) {
    console.log(`[webhook/safepay] Non-payment event: status=${paymentStatus}, ignoring`)
    return NextResponse.json({ received: true })
  }

  // Find order by safepay_tracker token
  const { data: order, error: findError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, customer_email, total, payment_method, payment_status')
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

  // Send confirmation emails — fire-and-forget (errors are caught inside email.ts)
  await sendCustomerPaymentConfirmed(order.customer_email, {
    order_number: order.order_number,
    customer_name: order.customer_name,
    total: order.total,
    payment_method: order.payment_method,
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
