'use client'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Order, OrderItem } from '@/types'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'
import { getAdminStatusColors } from '@/lib/adminColors'

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sumByMonth(orders: Order[], metric: 'revenue' | 'units'): Record<string, number> {
  const map: Record<string, number> = {}
  orders.forEach(o => {
    if (o.order_status === 'cancelled' || o.order_status === 'returned') return
    const key = monthKey(new Date(o.created_at))
    const value = metric === 'revenue' ? o.total : (o.items as OrderItem[]).reduce((s, i) => s + i.quantity, 0)
    map[key] = (map[key] || 0) + value
  })
  return map
}

// Trailing-12-months-vs-prior-12-months, independent of the dashboard's
// global range filter (spec 004 US2, research.md Decision 4/5).
function buildYoyPoints(orders: Order[], metric: 'revenue' | 'units') {
  const monthSums = sumByMonth(orders, metric)
  const today = new Date()
  const points: { label: string; current: number; prior: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const currentDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const priorDate = new Date(today.getFullYear(), today.getMonth() - i - 12, 1)
    points.push({
      label: currentDate.toLocaleString('default', { month: 'short' }),
      current: monthSums[monthKey(currentDate)] || 0,
      prior: monthSums[monthKey(priorDate)] || 0,
    })
  }
  return points
}

function fmt(n: number, metric: 'revenue' | 'units') {
  return metric === 'revenue' ? `PKR ${Math.round(n).toLocaleString()}` : n.toLocaleString()
}

export default function YoyWidget({ orders, metric, title }: { orders: Order[]; metric: 'revenue' | 'units'; title: string }) {
  const C = getAdminStatusColors(useAdminDarkMode())
  const activeOrders = orders.filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned')
  const earliest = activeOrders.reduce<Date | null>((min, o) => {
    const d = new Date(o.created_at)
    return !min || d < min ? d : min
  }, null)

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const eligible = !!earliest && earliest <= oneYearAgo

  if (!eligible) {
    const readyDate = earliest
      ? new Date(earliest.getFullYear() + 1, earliest.getMonth(), earliest.getDate())
      : null
    return (
      <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>
          Year-over-year comparison available once 12 months of order history exist
          {readyDate ? ` (~${readyDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })})` : ''}.
        </p>
      </div>
    )
  }

  const points = buildYoyPoints(activeOrders, metric)
  const currentTotal = points.reduce((s, p) => s + p.current, 0)
  const priorTotal    = points.reduce((s, p) => s + p.prior, 0)
  const pctChange = priorTotal > 0 ? Math.round(((currentTotal - priorTotal) / priorTotal) * 100) : null

  return (
    <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
      <div className="flex items-baseline justify-between mb-1 flex-wrap gap-1">
        <h3 className="font-semibold">{title}</h3>
        {pctChange !== null && (
          <span className="text-sm font-bold" style={{ color: pctChange >= 0 ? C.success : C.critical }}>
            {pctChange >= 0 ? '+' : ''}{pctChange}% YoY
          </span>
        )}
      </div>
      <p className="text-xs mb-4" style={{ color: 'var(--admin-subtle)' }}>
        Trailing 12 months vs. the same 12 months a year prior — this comparison
        is independent of the range filter above.
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--admin-divider)" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={50}
            tickFormatter={v => metric === 'revenue' ? `${Math.round(Number(v) / 1000)}k` : String(v)} />
          <Tooltip formatter={(v, name) => [fmt(Number(v), metric), name]}
            contentStyle={{ backgroundColor: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: 'var(--admin-text)' }}
            labelStyle={{ color: 'var(--admin-text-secondary)' }}
            cursor={{ stroke: 'var(--admin-border)', strokeWidth: 1 }}
          />
          <Line type="monotone" dataKey="current" stroke="#A68B6E" strokeWidth={2.5}
            dot={{ fill: '#A68B6E', r: 3 }} name="This year"
            style={{ filter: 'drop-shadow(0 0 5px rgba(166,139,110,0.55))' }}
            activeDot={{ r: 4, fill: '#A68B6E', style: { filter: 'drop-shadow(0 0 5px rgba(166,139,110,0.6))' } }} />
          <Line type="monotone" dataKey="prior" stroke="#D1D5DB" strokeWidth={2} strokeDasharray="4 4" dot={{ fill: '#D1D5DB', r: 2.5 }} name="Last year" />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-xs min-w-[420px]">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--admin-divider)' }}>
              <th className="text-left py-1.5 font-medium" style={{ color: 'var(--admin-subtle)' }}>Month</th>
              <th className="text-right py-1.5 font-medium" style={{ color: 'var(--admin-subtle)' }}>This Year</th>
              <th className="text-right py-1.5 font-medium" style={{ color: 'var(--admin-subtle)' }}>Last Year</th>
              <th className="text-right py-1.5 font-medium" style={{ color: 'var(--admin-subtle)' }}>Δ%</th>
            </tr>
          </thead>
          <tbody>
            {points.map(p => {
              const delta = p.prior > 0 ? Math.round(((p.current - p.prior) / p.prior) * 100) : null
              return (
                <tr key={p.label} className="border-b last:border-0" style={{ borderColor: 'var(--admin-divider)' }}>
                  <td className="py-1">{p.label}</td>
                  <td className="py-1 text-right">{fmt(p.current, metric)}</td>
                  <td className="py-1 text-right" style={{ color: 'var(--admin-subtle)' }}>{fmt(p.prior, metric)}</td>
                  <td className="py-1 text-right" style={{ color: delta === null ? '#9CA3AF' : delta >= 0 ? C.success : C.critical }}>
                    {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta}%`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
