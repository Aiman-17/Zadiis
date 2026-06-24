'use client'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { AlertTriangle } from 'lucide-react'
import type { Order, OrderItem, Product } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  new:        '#3B82F6',
  processing: '#F59E0B',
  shipped:    '#8B5CF6',
  delivered:  '#10B981',
  returned:   '#EF4444',
  cancelled:  '#9CA3AF',
}

function pkr(n: number) { return `PKR ${Number(n).toLocaleString()}` }

function isWithinDays(dateStr: string, days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return new Date(dateStr) >= cutoff
}

function isThisMonth(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export default function DashboardCharts({ orders, products }: { orders: Order[]; products: Product[] }) {
  const thisMonth = orders.filter(o => isThisMonth(o.created_at))
  const last24h  = orders.filter(o => isWithinDays(o.created_at, 1))
  const last30   = orders.filter(o => isWithinDays(o.created_at, 30))

  // KPI
  const revenueThisMonth = thisMonth
    .filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned')
    .reduce((s, o) => s + o.total, 0)
  const ordersThisMonth = thisMonth.filter(o => o.order_status !== 'cancelled').length
  const todayOrders     = last24h.length
  const pendingAction = orders.filter(o =>
    !o.is_archived && (o.order_status === 'new' || o.order_status === 'processing')
  ).length
  const lowStockCount = products.filter(p => {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      return Object.values(vs).some(sizeMap => Object.values(sizeMap).some(q => q <= 5))
    }
    return p.stock_quantity <= 5
  }).length

  // Warning cards
  const cancelledThisMonth = thisMonth.filter(o => o.order_status === 'cancelled')
  const returnedThisMonth  = thisMonth.filter(o => o.order_status === 'returned')
  const cancelledRevenue = cancelledThisMonth.reduce((s, o) => s + o.total, 0)
  const returnedRevenue  = returnedThisMonth.reduce((s, o) => s + o.total, 0)

  // Order status donut — ALL non-archived orders
  const statusCounts: Record<string, number> = {
    new: 0, processing: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0,
  }
  orders.filter(o => !o.is_archived).forEach(o => {
    if (statusCounts[o.order_status] !== undefined) statusCounts[o.order_status]++
  })
  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .filter(s => s.value > 0)

  // Top products — last 30 days, exclude cancelled
  const productMap: Record<string, { units: number; revenue: number }> = {}
  last30.filter(o => o.order_status !== 'cancelled').forEach(o =>
    (o.items as OrderItem[]).forEach(i => {
      if (!productMap[i.product_name]) productMap[i.product_name] = { units: 0, revenue: 0 }
      productMap[i.product_name].units += i.quantity
      productMap[i.product_name].revenue += i.price * i.quantity
    })
  )
  const topProducts = Object.entries(productMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)

  // Low stock list
  const lowStockItems: { name: string; variant: string; qty: number }[] = []
  products.forEach(p => {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      Object.entries(vs).forEach(([color, sizes]) => {
        Object.entries(sizes).forEach(([size, qty]) => {
          if (qty <= 5) {
            const variant = [color !== '_' ? color : '', size !== '_' ? size : ''].filter(Boolean).join(' / ')
            lowStockItems.push({ name: p.name, variant, qty })
          }
        })
      })
    } else if (p.stock_quantity <= 5) {
      lowStockItems.push({ name: p.name, variant: 'All sizes', qty: p.stock_quantity })
    }
  })
  lowStockItems.sort((a, b) => a.qty - b.qty)

  // Recent orders — last 10, not archived
  const recentOrders = orders.filter(o => !o.is_archived).slice(0, 10)

  const KPI = [
    { label: "Today's Orders",    value: todayOrders },
    { label: 'Revenue This Month', value: pkr(revenueThisMonth) },
    { label: 'Orders This Month',  value: ordersThisMonth },
    { label: 'Pending Action',     value: pendingAction },
    { label: 'Low Stock Variants', value: lowStockCount },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {KPI.map(k => (
          <div key={k.label} className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Warning Row — only shown when there are cancelled/returned orders this month */}
      {(cancelledRevenue > 0 || returnedRevenue > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cancelledRevenue > 0 && (
            <div className="rounded-lg p-4 border flex items-start gap-3"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#EF4444' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#DC2626' }}>
                  Cancelled This Month — {pkr(cancelledRevenue)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#EF4444' }}>
                  {cancelledThisMonth.length} order{cancelledThisMonth.length !== 1 ? 's' : ''} cancelled
                </p>
              </div>
            </div>
          )}
          {returnedRevenue > 0 && (
            <div className="rounded-lg p-4 border flex items-start gap-3"
              style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
              <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: '#F59E0B' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#92400E' }}>
                  Returned This Month — {pkr(returnedRevenue)}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                  {returnedThisMonth.length} order{returnedThisMonth.length !== 1 ? 's' : ''} returned
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Status Donut */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-4">Order Status Breakdown</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#A68B6E'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {statusData.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: STATUS_COLORS[s.name] }} />
                    <span style={{ color: '#4B5563' }}>{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No orders yet.</p>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-1">Top Products</h3>
          <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>Last 30 days</p>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100}
                  tickFormatter={(v: string) => v.length > 13 ? v.slice(0, 12) + '…' : v} />
                <Tooltip formatter={(v, name) => [
                  name === 'units' ? `${v} units` : pkr(Number(v)),
                  name === 'units' ? 'Units' : 'Revenue',
                ]} />
                <Bar dataKey="units" fill="#A68B6E" radius={[0, 4, 4, 0]} name="units" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>
              Top products appear once orders are placed.
            </p>
          )}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-4">
            Low Stock Alerts
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-normal"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              {lowStockItems.length}
            </span>
          </h3>
          <div className="space-y-2">
            {lowStockItems.slice(0, 10).map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: '#F3F4F6' }}>
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  {item.variant && <p className="text-xs" style={{ color: '#6B7280' }}>{item.variant}</p>}
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={item.qty === 0
                    ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                    : { backgroundColor: '#FEF9C3', color: '#92400E' }}>
                  {item.qty === 0 ? 'OUT OF STOCK' : `${item.qty} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
        <div className="p-5 border-b" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold">Recent Orders</h3>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm p-5" style={{ color: '#9CA3AF' }}>No orders yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                    <td className="px-5 py-3 font-medium" style={{ color: '#A68B6E' }}>
                      {order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}
                    </td>
                    <td className="px-5 py-3">{order.customer_name}</td>
                    <td className="px-5 py-3 font-semibold">{pkr(order.total)}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-1 rounded-full font-medium"
                        style={STATUS_COLORS[order.order_status]
                          ? { backgroundColor: STATUS_COLORS[order.order_status] + '22', color: STATUS_COLORS[order.order_status] }
                          : {}}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: '#9CA3AF' }}>
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
