import { supabaseAdmin } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import DashboardCharts from '@/components/admin/DashboardCharts'
import type { Order, Product, OrderItem } from '@/types'

type ActiveSaleSummary = {
  id: string
  title: string
  revenue: number
  orders: number
  todayRevenue: number
  yesterdayRevenue: number
}

export default async function AdminDashboard() {
  let allOrders: Order[] = []
  let products: Product[] = []
  let activeSales: ActiveSaleSummary[] = []

  try {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

    const [ordersRes, productsRes, salesRes, saleProductsRes, saleOrdersRes] = await Promise.all([
      supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('products').select('*').eq('is_active', true),
      supabaseAdmin.from('sales').select('id, title').eq('is_active', true),
      supabaseAdmin.from('sale_products').select('sale_id, product_id'),
      supabaseAdmin.from('orders').select('id, created_at, items, total')
        .eq('is_sale', true)
        .not('order_status', 'in', '("cancelled","returned")')
        .order('created_at', { ascending: false }),
    ])

    allOrders = (ordersRes.data || []) as Order[]
    products = (productsRes.data || []) as Product[]

    const sales = salesRes.data || []
    const saleProducts = saleProductsRes.data || []
    const saleOrders = (saleOrdersRes.data || []) as Order[]

    if (sales.length > 0) {
      const productToSale: Record<string, string> = {}
      for (const sp of saleProducts) productToSale[sp.product_id] = sp.sale_id

      const summaries: Record<string, ActiveSaleSummary> = {}
      for (const s of sales) {
        summaries[s.id] = { id: s.id, title: s.title, revenue: 0, orders: 0, todayRevenue: 0, yesterdayRevenue: 0 }
      }

      for (const order of saleOrders) {
        const items = (order.items || []) as OrderItem[]
        const saleId = items.map(i => productToSale[i.product_id]).find(sid => sid && summaries[sid])
        if (!saleId) continue
        const dateKey = order.created_at.slice(0, 10)
        summaries[saleId].revenue += order.total
        summaries[saleId].orders++
        if (dateKey === today) summaries[saleId].todayRevenue += order.total
        if (dateKey === yesterday) summaries[saleId].yesterdayRevenue += order.total
      }

      activeSales = Object.values(summaries)
    }
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <div>
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Dashboard</h1>
      <DashboardCharts orders={allOrders} products={products} activeSales={activeSales} />
    </div>
  )
}
