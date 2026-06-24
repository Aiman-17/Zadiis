'use client'
import { useState, useEffect, useMemo } from 'react'
import { Archive, XCircle } from 'lucide-react'
import type { Order, OrderItem } from '@/types'
import CancelModal from '@/components/admin/CancelModal'

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  new:        { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  processing: { backgroundColor: '#FEF9C3', color: '#92400E' },
  shipped:    { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  delivered:  { backgroundColor: '#DCFCE7', color: '#15803D' },
  returned:   { backgroundColor: '#FEE2E2', color: '#DC2626' },
  cancelled:  { backgroundColor: '#F3F4F6', color: '#6B7280' },
}

const STATUSES = ['new', 'processing', 'shipped', 'delivered', 'returned']
type Tab = 'active' | 'completed' | 'archived'

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('active')
  const [cancelId, setCancelId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
  }, [])

  const counts = useMemo(() => ({
    active:    orders.filter(o => !o.is_archived && o.order_status !== 'delivered' && o.order_status !== 'cancelled' && o.order_status !== 'returned').length,
    completed: orders.filter(o => !o.is_archived && (o.order_status === 'delivered' || o.order_status === 'cancelled' || o.order_status === 'returned')).length,
    archived:  orders.filter(o => o.is_archived).length,
  }), [orders])

  const filtered = useMemo(() => {
    if (tab === 'active')    return orders.filter(o => !o.is_archived && o.order_status !== 'delivered' && o.order_status !== 'cancelled' && o.order_status !== 'returned')
    if (tab === 'completed') return orders.filter(o => !o.is_archived && (o.order_status === 'delivered' || o.order_status === 'cancelled' || o.order_status === 'returned'))
    return orders.filter(o => o.is_archived)
  }, [orders, tab])

  const updateStatus = async (id: string, order_status: string) => {
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status }),
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, order_status: order_status as Order['order_status'] } : o))
  }

  const cancelOrder = async (id: string, reason: string) => {
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status: 'cancelled', cancellation_reason: reason }),
    })
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, order_status: 'cancelled' as const, cancellation_reason: reason } : o
    ))
    setCancelId(null)
  }

  const archiveOrder = async (id: string) => {
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: true }),
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, is_archived: true } : o))
    if (expanded === id) setExpanded(null)
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'active',    label: `Active (${counts.active})` },
    { key: 'completed', label: `Completed (${counts.completed})` },
    { key: 'archived',  label: `Archived (${counts.archived})` },
  ]

  return (
    <div>
      {cancelId && (
        <CancelModal
          onConfirm={reason => cancelOrder(cancelId, reason)}
          onClose={() => setCancelId(null)}
        />
      )}

      <h1 className="text-2xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Orders</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
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

      <div className="space-y-3">
        {filtered.map(order => (
          <div key={order.id} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer gap-3"
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">
                  <span style={{ color: '#A68B6E' }}>{order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                  {' — '}{order.customer_name}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {order.customer_phone} · {order.city} · {new Date(order.created_at).toLocaleDateString()}
                </p>
                {order.cancellation_reason && (
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                    Reason: {order.cancellation_reason.replace(/_/g, ' ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                <span className="font-semibold text-sm">PKR {Number(order.total).toLocaleString()}</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={STATUS_STYLES[order.order_status]}>
                  {order.order_status}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={order.payment_status === 'paid'
                    ? { backgroundColor: '#DCFCE7', color: '#15803D' }
                    : order.payment_status === 'failed'
                    ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                    : { backgroundColor: '#FEF9C3', color: '#92400E' }}
                >
                  {order.payment_status}
                </span>

                {/* Cancel — active orders only */}
                {!order.is_archived && order.order_status !== 'cancelled' && order.order_status !== 'delivered' && order.order_status !== 'returned' && (
                  <button
                    onClick={e => { e.stopPropagation(); setCancelId(order.id) }}
                    title="Cancel order"
                    style={{ color: '#FCA5A5' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#FCA5A5')}
                  >
                    <XCircle size={15} />
                  </button>
                )}

                {/* Archive — completed orders only */}
                {!order.is_archived && (order.order_status === 'delivered' || order.order_status === 'cancelled' || order.order_status === 'returned') && (
                  <button
                    onClick={e => { e.stopPropagation(); archiveOrder(order.id) }}
                    title="Archive order"
                    style={{ color: '#D1D5DB' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#6B7280')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#D1D5DB')}
                  >
                    <Archive size={15} />
                  </button>
                )}
              </div>
            </div>

            {expanded === order.id && (
              <div className="border-t p-4 bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-sm font-medium mb-2">Items:</p>
                {(order.items as OrderItem[]).map((item, i) => (
                  <p key={i} className="text-sm mb-1" style={{ color: '#4B5563' }}>
                    {item.product_name}{item.sku ? ` (${item.sku})` : ''} × {item.quantity}
                    {' '}({item.size}, {item.color}) — PKR {item.price.toLocaleString()}
                    {item.original_price && item.original_price !== item.price && (
                      <span style={{ color: '#A68B6E' }}> (was PKR {Number(item.original_price).toLocaleString()})</span>
                    )}
                  </p>
                ))}
                <div className="text-sm mt-2 pt-2 border-t" style={{ borderColor: '#E8DDD4' }}>
                  <p>
                    Subtotal: PKR {Number(order.subtotal).toLocaleString()} ·
                    Delivery: PKR {Number(order.delivery_charge).toLocaleString()} ·{' '}
                    <strong>Total: PKR {Number(order.total).toLocaleString()}</strong>
                  </p>
                  <p className="mt-1" style={{ color: '#6B7280' }}>
                    {order.address} · Payment: {order.payment_method}
                  </p>
                </div>

                {order.order_status !== 'cancelled' && !order.is_archived && (
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
                            : { borderColor: '#D1D5DB', color: '#6B7280' }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
