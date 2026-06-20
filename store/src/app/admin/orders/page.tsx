'use client'
import { useState, useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import type { Order, OrderItem } from '@/types'

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  new: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  processing: { backgroundColor: '#FEF9C3', color: '#92400E' },
  shipped: { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  delivered: { backgroundColor: '#DCFCE7', color: '#15803D' },
  returned: { backgroundColor: '#FEE2E2', color: '#DC2626' },
}

const STATUSES = ['new', 'processing', 'shipped', 'delivered', 'returned']

type Filter = 'all' | 'today' | '3days' | '7days' | '1month'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: '3days', label: '3 Days' },
  { key: '7days', label: '7 Days' },
  { key: '1month', label: '1 Month' },
]

function isWithinDays(dateStr: string, days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return new Date(dateStr) >= cutoff
}

function isOlderThan30Days(dateStr: string) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  return new Date(dateStr) < cutoff
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
  }, [])

  const filtered = useMemo(() => {
    const now = new Date()
    return orders.filter(o => {
      if (filter === 'all') return true
      if (filter === 'today') return new Date(o.created_at).toDateString() === now.toDateString()
      if (filter === '3days') return isWithinDays(o.created_at, 3)
      if (filter === '7days') return isWithinDays(o.created_at, 7)
      if (filter === '1month') return isWithinDays(o.created_at, 30)
      return true
    })
  }, [orders, filter])

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status: status }),
    })
    setOrders(orders.map(o => o.id === id ? { ...o, order_status: status as Order['order_status'] } : o))
  }

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order permanently?')) return
    const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setOrders(orders.filter(o => o.id !== id))
      if (expanded === id) setExpanded(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Orders</h1>

      {/* Time filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors"
            style={filter === f.key
              ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
              : { borderColor: '#E8DDD4', color: '#6B7280' }}
          >
            {f.label}
          </button>
        ))}
        <span className="text-xs self-center ml-1" style={{ color: '#9CA3AF' }}>
          {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 && <p className="text-sm" style={{ color: '#9CA3AF' }}>No orders in this period.</p>}

      <div className="space-y-3">
        {filtered.map(order => (
          <div key={order.id} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
            >
              <div>
                <p className="font-medium text-sm">
                  <span style={{ color: '#A68B6E' }}>{order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                  {' — '}{order.customer_name}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {order.customer_phone} · {order.city} · {new Date(order.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">PKR {Number(order.total).toLocaleString()}</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={STATUS_STYLES[order.order_status]}>
                  {order.order_status}
                </span>
                {isOlderThan30Days(order.created_at) && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteOrder(order.id) }}
                    className="transition-colors"
                    style={{ color: '#FCA5A5' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#FCA5A5')}
                    title="Delete order (older than 30 days)"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
            {expanded === order.id && (
              <div className="border-t p-4 bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-sm font-medium mb-2">Items:</p>
                {(order.items as OrderItem[]).map((item, i) => (
                  <p key={i} className="text-sm mb-1" style={{ color: '#4B5563' }}>
                    {item.product_name}{item.sku ? ` (${item.sku})` : ''} × {item.quantity} ({item.size}, {item.color}) — PKR {item.price.toLocaleString()}
                  </p>
                ))}
                <div className="text-sm mt-2 pt-2 border-t" style={{ borderColor: '#E8DDD4' }}>
                  <p>Subtotal: PKR {Number(order.subtotal).toLocaleString()} · Delivery: PKR {Number(order.delivery_charge).toLocaleString()} · <strong>Total: PKR {Number(order.total).toLocaleString()}</strong></p>
                  <p className="mt-1" style={{ color: '#6B7280' }}>{order.address} · Payment: {order.payment_method}</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Update Status:</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(order.id, s)}
                        className="text-xs px-3 py-1 rounded-full border transition-colors"
                        style={order.order_status === s
                          ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
                          : { borderColor: '#D1D5DB' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
