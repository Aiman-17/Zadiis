'use client'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { Order } from '@/types'

const FALLBACK_COLORS = ['#A68B6E', '#1C1C1C', '#C9956C', '#8B7355', '#D4B896', '#6B5744']

const STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  processing: '#F59E0B',
  shipped: '#8B5CF6',
  delivered: '#10B981',
  returned: '#EF4444',
}

function pkrShort(n: number): string {
  if (n === 0) return '0'
  const s = Math.round(n).toString()
  if (s.length <= 5) return s.slice(0, -3) + ',' + s.slice(-3)
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3)
  const restFmt = rest.length > 2 ? rest.slice(0, -2) + ',' + rest.slice(-2) : rest
  return restFmt + ',' + last3
}

function getMonthLabel(monthsBack: number) {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - monthsBack)
  return {
    month: d.toLocaleString('default', { month: 'short' }),
    year: d.getFullYear(),
    monthNum: d.getMonth(),
  }
}

export default function DashboardCharts({ orders }: { orders: Order[] }) {
  const months12 = Array.from({ length: 12 }, (_, i) => getMonthLabel(11 - i))

  const monthly12 = months12.map(m => {
    const mo = orders.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === m.monthNum && d.getFullYear() === m.year
    })
    return {
      month: m.month,
      revenue: mo.reduce((s, o) => s + o.total, 0),
      orders: mo.length,
    }
  })

  // Order status breakdown
  const statusCounts: Record<string, number> = {
    new: 0, processing: 0, shipped: 0, delivered: 0, returned: 0,
  }
  orders.forEach(o => {
    if (statusCounts[o.order_status] !== undefined) statusCounts[o.order_status]++
  })
  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .filter(s => s.value > 0)

  // Top selling products by units sold
  const productMap: Record<string, number> = {}
  orders.forEach(o =>
    (o.items as Array<{ product_name: string; quantity: number }>).forEach(i => {
      productMap[i.product_name] = (productMap[i.product_name] || 0) + i.quantity
    })
  )
  const topProducts = Object.entries(productMap)
    .map(([name, units]) => ({ name, units }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Monthly Revenue Bar Chart — 12 months */}
      <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
        <h3 className="font-semibold mb-4">Monthly Revenue — PKR (Last 12 Months)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthly12}>
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={pkrShort}
              width={80}
              domain={[0, (dataMax: number) => Math.max(dataMax * 1.15, 100000)]}
            />
            <Tooltip formatter={(v) => `PKR ${Number(v ?? 0).toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#A68B6E" radius={[4, 4, 0, 0]} name="Revenue" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Yearly Revenue Line Chart — auto-scaled in lakhs */}
      <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
        <h3 className="font-semibold mb-4">Yearly Revenue Trend — PKR (Last 12 Months)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={monthly12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={pkrShort}
              width={80}
              domain={[0, (dataMax: number) => Math.max(dataMax * 1.15, 500000)]}
            />
            <Tooltip formatter={(v) => `PKR ${Number(v ?? 0).toLocaleString()}`} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#A68B6E"
              strokeWidth={2.5}
              dot={{ fill: '#A68B6E', r: 4 }}
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Status Breakdown Donut */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-4">Order Status Breakdown</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {statusData.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[s.name] }} />
                    <span style={{ color: '#4B5563' }}>{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No orders yet.</p>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-4">Top Selling Products</h3>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 24 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={110}
                  tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v}
                />
                <Tooltip formatter={(v) => [`${v} units`, 'Sold']} />
                <Bar dataKey="units" fill="#A68B6E" radius={[0, 4, 4, 0]} name="Units Sold" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>Top products will appear once orders are placed.</p>
          )}
        </div>
      </div>
    </div>
  )
}
