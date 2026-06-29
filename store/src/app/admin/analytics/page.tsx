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

  let orders: Order[] = []
  let products: Product[] = []
  let allCostPrices: { id: string; cost_price: number }[] = []

  try {
    const [ordersRes, productsRes, costRes] = await Promise.all([
      supabaseAdmin
        .from('orders')
        .select('*')
        .gte('created_at', from)
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('products').select('*').eq('is_active', true),
      supabaseAdmin.from('products').select('id, cost_price'),
    ])
    orders = (ordersRes.data || []) as Order[]
    products = (productsRes.data || []) as Product[]
    allCostPrices = (costRes.data || []) as { id: string; cost_price: number }[]
  } catch {
    // Supabase not configured
  }

  return (
    <div>
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Analytics</h1>
      <AnalyticsClient orders={orders} products={products} range={range} allCostPrices={allCostPrices} />
    </div>
  )
}
