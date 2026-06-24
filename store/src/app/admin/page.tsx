import { supabaseAdmin } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'
import DashboardCharts from '@/components/admin/DashboardCharts'
import type { Order, Product } from '@/types'

export default async function AdminDashboard() {
  let allOrders: Order[] = []
  let products: Product[] = []

  try {
    const [ordersRes, productsRes] = await Promise.all([
      supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('products').select('*').eq('is_active', true),
    ])
    allOrders = (ordersRes.data || []) as Order[]
    products = (productsRes.data || []) as Product[]
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <div>
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Dashboard</h1>
      <DashboardCharts orders={allOrders} products={products} />
    </div>
  )
}
