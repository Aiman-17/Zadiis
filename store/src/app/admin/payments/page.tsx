'use client'
import { useState, useEffect, useMemo } from 'react'
import type { Order } from '@/types'

const PAYMENT_COLORS: Record<string, React.CSSProperties> = {
  pending: { backgroundColor: '#FEF9C3', color: '#92400E' },
  paid:    { backgroundColor: '#DCFCE7', color: '#15803D' },
  failed:  { backgroundColor: '#FEE2E2', color: '#DC2626' },
}

type Tab = 'all' | 'pending' | 'paid'

export default function AdminPayments() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<Tab>('all')
  const [marking, setMarking] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
  }, [])

  const filtered = useMemo(() =>
    tab === 'all' ? orders : orders.filter(o => o.payment_status === tab),
  [orders, tab])

  const markPaid = async (id: string) => {
    setMarking(id)
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, payment_status: 'paid' }),
    })
    if (res.ok) {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: 'paid' } : o))
    }
    setMarking(null)
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: `All (${orders.length})` },
    { key: 'pending', label: `Pending (${orders.filter(o => o.payment_status === 'pending').length})` },
    { key: 'paid', label: `Paid (${orders.filter(o => o.payment_status === 'paid').length})` },
  ]

  return (
    <div>
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Payments</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors"
            style={tab === t.key
              ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
              : { borderColor: '#E8DDD4', color: '#6B7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm" style={{ color: '#9CA3AF' }}>No orders in this category.</p>
      )}

      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
              <tr>
                <th className="text-left p-4 font-medium">Order</th>
                <th className="text-left p-4 font-medium">Customer</th>
                <th className="text-left p-4 font-medium">Amount</th>
                <th className="text-left p-4 font-medium">Method</th>
                <th className="text-left p-4 font-medium">Payment</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                  <td className="p-4 font-medium" style={{ color: '#A68B6E' }}>
                    {order.order_number}
                  </td>
                  <td className="p-4">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{order.customer_phone}</p>
                  </td>
                  <td className="p-4 font-semibold">PKR {Number(order.total).toLocaleString()}</td>
                  <td className="p-4 capitalize">{order.payment_method}</td>
                  <td className="p-4">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={PAYMENT_COLORS[order.payment_status]}
                    >
                      {order.payment_status}
                    </span>
                    {order.safepay_transaction_id && (
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                        {order.safepay_transaction_id}
                      </p>
                    )}
                  </td>
                  <td className="p-4 text-xs" style={{ color: '#6B7280' }}>
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    {order.payment_status === 'pending' && (
                      order.payment_method === 'cod'
                        ? <span className="text-xs" style={{ color: '#9CA3AF' }}>Collect on delivery</span>
                        : (
                          <button
                            onClick={() => markPaid(order.id)}
                            disabled={marking === order.id}
                            className="text-xs px-3 py-1.5 rounded border font-medium transition-colors"
                            style={{ borderColor: '#A68B6E', color: '#A68B6E' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#A68B6E'; (e.currentTarget as HTMLElement).style.color = 'white' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#A68B6E' }}
                          >
                            {marking === order.id ? 'Saving...' : 'Mark Paid'}
                          </button>
                        )
                    )}
                    {order.payment_status === 'paid' && (
                      <span className="text-xs" style={{ color: '#15803D' }}>✓ Confirmed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
