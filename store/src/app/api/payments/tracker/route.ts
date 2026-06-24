import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOwnerNewOrder } from '@/lib/email'

const SAFEPAY_ENV = process.env.NEXT_PUBLIC_SAFEPAY_ENV || 'sandbox'
const SAFEPAY_API_BASE = SAFEPAY_ENV === 'production'
  ? 'https://api.getsafepay.com'
  : 'https://sandbox.api.getsafepay.com'
const SAFEPAY_CHECKOUT_BASE = SAFEPAY_ENV === 'production'
  ? 'https://www.getsafepay.com'
  : 'https://sandbox.api.getsafepay.com'

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
      address, city, items, subtotal, delivery_charge, total, payment_method, is_sale,
    } = body

    // 1. Validate required fields
    if (!customer_name || !customer_phone || !customer_email || !address || !city || !payment_method || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!['jazzcash', 'easypaisa', 'card'].includes(payment_method)) {
      return NextResponse.json({ error: 'Use /api/orders for COD' }, { status: 400 })
    }

    // 2. Validate stock
    for (const item of items as Array<{ product_id: string; product_name: string; quantity: number; color?: string; size?: string }>) {
      const { data: product, error } = await supabaseAdmin
        .from('products').select('stock_quantity, name, variant_stock').eq('id', item.product_id).single()
      if (error || !product) return NextResponse.json({ error: `Product not found: ${item.product_name}` }, { status: 400 })
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json({ error: `"${item.product_name}" has insufficient stock. Available: ${product.stock_quantity}.`, outOfStock: true }, { status: 400 })
      }
      // Per-variant check when tracking is enabled
      const variantStock = product.variant_stock as Record<string, Record<string, number>> | null
      if (variantStock && Object.keys(variantStock).length > 0) {
        const c = (item.color || '_') as string
        const s = (item.size || '_') as string
        const variantQty = variantStock?.[c]?.[s]
        if (variantQty !== undefined && variantQty < item.quantity) {
          return NextResponse.json({
            error: `Sorry, "${item.product_name}" (${((item.color || '') + ' ' + (item.size || '')).trim()}) is out of stock for the selected variant. Available: ${variantQty}.`,
            outOfStock: true,
          }, { status: 400 })
        }
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
          client: process.env.SAFEPAY_API_KEY,
          environment: SAFEPAY_ENV,
          amount: Math.round(total * 100),
          currency: 'PKR',
          payload: {
            purpose: 'ZADIIS Order',
            mode: 'payment',
            metadata: { source: 'zadiis' },
          },
        }),
        signal: AbortSignal.timeout(10000),
      })
      if (!sfRes.ok) {
        const errBody = await sfRes.text().catch(() => '(no body)')
        console.error(`[Safepay] HTTP ${sfRes.status}:`, errBody)
        throw new Error(`Safepay ${sfRes.status}: ${errBody}`)
      }
      const sfData = await sfRes.json()
      trackerToken = sfData?.data?.token
      if (!trackerToken) throw new Error(`No tracker token: ${JSON.stringify(sfData)}`)
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
          is_sale: is_sale ?? false,
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
    for (const item of items as Array<{ product_id: string; quantity: number; color?: string; size?: string }>) {
      await supabaseAdmin.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_color: item.color || '_',
        p_size: item.size || '_',
      })
    }

    // 6. Notify owner of new pending order (customer email sent only after payment confirmed)
    await sendOwnerNewOrder({
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      address: order.address,
      city: order.city,
      items: order.items,
      subtotal: order.subtotal,
      delivery_charge: order.delivery_charge,
      total: order.total,
      payment_method: order.payment_method,
      payment_status: order.payment_status ?? 'pending',
      is_sale: order.is_sale ?? false,
    })

    // 7. Build Safepay hosted checkout URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const checkoutUrl = `${SAFEPAY_CHECKOUT_BASE}/checkout?beacon=${trackerToken}&source=checkout&env=${SAFEPAY_ENV}&redirect_url=${encodeURIComponent(`${appUrl}/order/${order.id}`)}`

    return NextResponse.json({ orderId: order.id, checkoutUrl }, { status: 201 })
  } catch (err) {
    console.error('[tracker] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
