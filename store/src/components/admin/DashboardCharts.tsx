'use client'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { Order } from '@/types'

const COLORS = ['#A68B6E', '#1C1C1C', '#C9956C', '#8B7355', '#D4B896', '#6B5744']

const REVENUE_TICKS = [0, 25000, 50000, 75000, 100000, 125000, 150000]

function pkrShort(n: number): string {
  if (n === 0) return '0'
  const s = n.toString()
  if (s.length <= 5) return s.slice(0, -3) + ',' + s.slice(-3)
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3)
  const restFmt = rest.length > 2 ? rest.slice(0, -2) + ',' + rest.slice(-2) : rest
  return restFmt + ',' + last3
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const pct = ((current - previous) / previous) * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
}

function getMonthLabel(monthsBack: number): { month: string; year: number; monthNum: number } {
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
  // Last 6 months (bar chart)
  const months6 = Array.from({ length: 6 }, (_, i) => getMonthLabel(5 - i))
  // Last 12 months (line chart)
  const months12 = Array.from({ length: 12 }, (_, i) => getMonthLabel(11 - i))

  const getMonthData = (mList: ReturnType<typeof getMonthLabel>[]) =>
    mList.map(m => {
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

  const monthly6 = getMonthData(months6)
  const yearly12 = getMonthData(months12)

  const currentMonthRevenue = monthly6[monthly6.length - 1].revenue
  const prevMonthRevenue = monthly6[monthly6.length - 2].revenue
  const yearlyTotal = yearly12.reduce((s, m) => s + m.revenue, 0)
  const avgMonthly = Math.round(yearlyTotal / 12)
  const isUp = currentMonthRevenue >= prevMonthRevenue

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
      {/* Sales summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-xs mb-1" style={{ color: '#6B7280' }}>This Month Revenue</p>
          <p className="text-xl font-bold">PKR {currentMonthRevenue.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: isUp ? '#15803D' : '#DC2626' }}>
            {pctChange(currentMonthRevenue, prevMonthRevenue)} vs last month
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Yearly Revenue</p>
          <p className="text-xl font-bold">PKR {yearlyTotal.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Last 12 months</p>
        </div>
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-xs mb-1" style={{ color: '#6B7280' }}>Avg Monthly Revenue</p>
          <p className="text-xl font-bold">PKR {avgMonthly.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>12-month average</p>
        </div>
      </div>

      {/* Monthly Revenue Bar Chart (6 months) */}
      <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
        <h3 className="font-semibold mb-4">Monthly Revenue — PKR (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly6}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 150000]} ticks={REVENUE_TICKS} tickFormatter={pkrShort} width={72} />
            <Tooltip formatter={(v) => `PKR ${Number(v ?? 0).toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#A68B6E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Yearly Revenue Line Chart (12 months) */}
      <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
        <h3 className="font-semibold mb-4">Yearly Revenue Trend — PKR (Last 12 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={yearly12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={pkrShort} width={72} />
            <Tooltip formatter={(v) => `PKR ${Number(v ?? 0).toLocaleString()}`} />
            <Line type="monotone" dataKey="revenue" stroke="#A68B6E" strokeWidth={2.5} dot={{ fill: '#A68B6E', r: 4 }} name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders & Returns Line Chart */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-4">Monthly Orders &amp; Returns</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly6}>
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
          <div className="bg-white rounded-lg p-5 border flex items-center justify-center text-sm" style={{ borderColor: '#E8DDD4', color: '#9CA3AF' }}>
            Sales by Color chart will appear once orders are placed.
          </div>
        )}
      </div>
    </div>
  )
}
