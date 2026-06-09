'use client'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import type { Order } from '@/types'

const COLORS = ['#A68B6E', '#1C1C1C', '#C9956C', '#8B7355', '#D4B896', '#6B5744']

export default function DashboardCharts({ orders }: { orders: Order[] }) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return {
      month: d.toLocaleString('default', { month: 'short' }),
      year: d.getFullYear(),
      monthNum: d.getMonth(),
    }
  })

  const monthlyData = months.map(m => {
    const monthOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === m.monthNum && d.getFullYear() === m.year
    })
    return {
      month: m.month,
      revenue: monthOrders.reduce((s, o) => s + o.total, 0),
      orders: monthOrders.length,
      returns: monthOrders.filter(o => o.order_status === 'returned').length,
    }
  })

  const colorMap: Record<string, number> = {}
  orders.forEach(o =>
    (o.items as Array<{ color: string; quantity: number }>).forEach(i => {
      colorMap[i.color] = (colorMap[i.color] || 0) + i.quantity
    })
  )
  const colorData = Object.entries(colorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Revenue Bar Chart */}
      <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
        <h3 className="font-semibold mb-4">Monthly Revenue (PKR)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => `PKR ${Number(v ?? 0).toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#A68B6E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders & Returns Line Chart */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-4">Monthly Orders &amp; Returns</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#1C1C1C" strokeWidth={2} dot={false} name="Orders" />
              <Line type="monotone" dataKey="returns" stroke="#EF4444" strokeWidth={2} dot={false} name="Returns" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Color Pie Chart */}
        {colorData.length > 0 ? (
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Sales by Color</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={colorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name }) => name}>
                  {colorData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-5 border flex items-center justify-center text-gray-400 text-sm" style={{ borderColor: '#E8DDD4' }}>
            Sales by Color chart will appear once orders are placed.
          </div>
        )}
      </div>
    </div>
  )
}
