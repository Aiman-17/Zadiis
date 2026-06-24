import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOwnerNewOrder, sendCustomerOrderConfirmed } from '@/lib/email'
import { generateInvoice } from '@/lib/invoice'

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

    // Honeypot — silently reject bots (return fake success so bots don't retry)
    if (body.website) {
      return NextResponse.json({ orderId: 'submitted' }, { status: 201 })
    }

    const {
      customer_name, customer_phone, customer_email,
      address, city, items, subtotal, delivery_charge, total, payment_method, is_sale,
    } = body

    if (!customer_name || !customer_phone || !customer_email || !address || !city || !payment_method || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate stock for all items before creating order
    for (const item of items as Array<{ product_id: string; product_name: string; quantity: number; color?: string; size?: string }>) {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('stock_quantity, name, variant_stock')
        .eq('id', item.product_id)
        .single()

      if (error || !product) {
        return NextResponse.json({ error: `Product not found: ${item.product_name}` }, { status: 400 })
      }
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json({
          error: `Sorry, "${item.product_name}" is out of stock or has insufficient quantity. Available: ${product.stock_quantity}.`,
          outOfStock: true,
        }, { status: 400 })
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

    // Enrich items with original_price (server-side — never trust client for this)
    const enrichedItems = await Promise.all(
      (items as Array<{ product_id: string; product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>)
        .map(async (item) => {
          const { data: prod } = await supabaseAdmin
            .from('products')
            .select('price')
            .eq('id', item.product_id)
            .single()
          return { ...item, original_price: prod?.price ?? item.price }
        })
    )

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
          items: enrichedItems,
          subtotal: subtotal ?? total,
          delivery_charge: delivery_charge ?? 0,
          total,
          payment_method,
          is_sale: is_sale ?? false,
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

    // Decrement stock for each item after order is confirmed
    for (const item of items as Array<{ product_id: string; quantity: number; color?: string; size?: string }>) {
      await supabaseAdmin.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_color: item.color || '_',
        p_size: item.size || '_',
      })
    }

    // COD orders are confirmed immediately — generate invoice now
    await generateInvoice(order.id)

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

    await sendCustomerOrderConfirmed(order.customer_email, {
      order_number: order.order_number,
      customer_name: order.customer_name,
      items: order.items,
      subtotal: order.subtotal,
      delivery_charge: order.delivery_charge,
      total: order.total,
      payment_method: order.payment_method,
      address: order.address,
      city: order.city,
    })

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    console.error('Orders API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
