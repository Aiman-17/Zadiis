import { supabaseAdmin } from '@/lib/supabase/server'
import { ShoppingBag, TrendingUp, Package, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'
import DashboardCharts from '@/components/admin/DashboardCharts'
import type { Order } from '@/types'

export default async function AdminDashboard() {
  let allOrders: Order[] = []
  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    allOrders = (data || []) as Order[]
  } catch {
    // Supabase not configured
  }

  const paidOrders = allOrders.filter(o => o.payment_status === 'paid')

  const today = new Date().toDateString()
  const todayOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === today)
  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()

  const monthPaidOrders = paidOrders.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const monthPendingOrders = allOrders.filter(o => {
    const d = new Date(o.created_at)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear && o.payment_status === 'pending'
  })

  const monthRevenue = monthPaidOrders.reduce((s, o) => s + o.total, 0)
  const monthPendingRevenue = monthPendingOrders.reduce((s, o) => s + o.total, 0)
  const pendingOrders = allOrders.filter(o => o.order_status === 'new' || o.order_status === 'processing')

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag, sub: null },
    { label: 'This Month Revenue', value: `PKR ${monthRevenue.toLocaleString()}`, icon: TrendingUp, sub: monthPendingRevenue > 0 ? `Pending: PKR ${monthPendingRevenue.toLocaleString()}` : null },
    { label: 'Total Orders', value: allOrders.length, icon: Package, sub: null },
    { label: 'Pending Shipments', value: pendingOrders.length, icon: Clock, sub: null },
  ]

  return (
    <div>
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <s.icon size={20} className="mb-2" style={{ color: '#A68B6E' }} />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            {s.sub && <p className="text-xs mt-1" style={{ color: '#F59E0B' }}>{s.sub}</p>}
          </div>
        ))}
      </div>
      <DashboardCharts orders={paidOrders} />
    </div>
  )
}
