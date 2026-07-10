import { supabaseAdmin } from '@/lib/supabase/server'
import type { Order, Product } from '@/types'
import AnalyticsClient from '@/components/admin/AnalyticsClient'

export const dynamic = 'force-dynamic'

function getRangeStart(range: string): string {
  const d = new Date()
  if (range === '7d')  d.setDate(d.getDate() - 7)
  else if (range === '90d') d.setDate(d.getDate() - 90)
  else if (range === '12m') d.setFullYear(d.getFullYear() - 1)
  else d.setDate(d.getDate() - 30)
  return d.toISOString()
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range = '30d' } = await searchParams
  const from = getRangeStart(range)

  // Trailing-24-month superset for the YoY widgets (spec 004 US2) — deliberately
  // independent of `from` above, which is driven by the user's range selection
  // and can be smaller than 24 months. This second fetch leaves the existing
  // range-filtered `orders` fetch below completely untouched (FR-006).
  const yoyFrom = new Date()
  yoyFrom.setFullYear(yoyFrom.getFullYear() - 2)

  let orders: Order[] = []
  let ordersForYoY: Order[] = []
  let products: Product[] = []
  let allCostPrices: { id: string; cost_price: number }[] = []
  // Defaults match Safepay's published domestic rate — see admin/settings/page.tsx
  let gatewayFeePct = 2.9
  let gatewayFeeFlat = 30

  try {
    const [ordersRes, yoyRes, productsRes, costRes, settingsRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('*')
        .gte('created_at', from)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('orders')
        .select('*')
        .gte('created_at', yoyFrom.toISOString()),
      supabaseAdmin.from('products').select('*').eq('is_active', true),
      supabaseAdmin.from('products').select('id, cost_price'),
      supabaseAdmin.from('store_settings').select('key, value').in('key', ['gateway_fee_pct', 'gateway_fee_flat']),
    ])
    orders = (ordersRes.data || []) as Order[]
    ordersForYoY = (yoyRes.data || []) as Order[]
    products = (productsRes.data || []) as Product[]
    allCostPrices = (costRes.data || []) as { id: string; cost_price: number }[]
    const pctSetting = settingsRes.data?.find(s => s.key === 'gateway_fee_pct')?.value
    const flatSetting = settingsRes.data?.find(s => s.key === 'gateway_fee_flat')?.value
    if (pctSetting) gatewayFeePct = Number(pctSetting)
    if (flatSetting) gatewayFeeFlat = Number(flatSetting)
  } catch {
    // Supabase not configured
  }

  return (
    <div>
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</h1>
      <AnalyticsClient
        orders={orders}
        ordersForYoY={ordersForYoY}
        products={products}
        range={range}
        allCostPrices={allCostPrices}
        gatewayFeePct={gatewayFeePct}
        gatewayFeeFlat={gatewayFeeFlat}
      />
    </div>
  )
}
