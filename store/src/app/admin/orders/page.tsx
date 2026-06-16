'use client'
import { useState, useEffect } from 'react'
import type { Order, OrderItem } from '@/types'

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  new: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  processing: { backgroundColor: '#FEF9C3', color: '#92400E' },
  shipped: { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  delivered: { backgroundColor: '#DCFCE7', color: '#15803D' },
  returned: { backgroundColor: '#FEE2E2', color: '#DC2626' },
}

const STATUSES = ['new', 'processing', 'shipped', 'delivered', 'returned']

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status: status }),
    })
    setOrders(orders.map(o => o.id === id ? { ...o, order_status: status as Order['order_status'] } : o))
  }

  return (
    <div>
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Orders</h1>
      {orders.length === 0 && <p className="text-gray-400 text-sm">No orders yet.</p>}
      <div className="space-y-3">
        {orders.map(order => (
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
                <p className="text-xs text-gray-500">{order.customer_phone} · {order.city} · {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">PKR {Number(order.total).toLocaleString()}</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={STATUS_STYLES[order.order_status]}>
                  {order.order_status}
                </span>
              </div>
            </div>
            {expanded === order.id && (
              <div className="border-t p-4 bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-sm font-medium mb-2">Items:</p>
                {(order.items as OrderItem[]).map((item, i) => (
                  <p key={i} className="text-sm text-gray-600 mb-1">
                    {item.product_name}{item.sku ? ` (${item.sku})` : ''} × {item.quantity} ({item.size}, {item.color}) — PKR {item.price.toLocaleString()}
                  </p>
                ))}
                <div className="text-sm mt-2 pt-2 border-t" style={{ borderColor: '#E8DDD4' }}>
                  <p>Subtotal: PKR {Number(order.subtotal).toLocaleString()} · Delivery: PKR {Number(order.delivery_charge).toLocaleString()} · <strong>Total: PKR {Number(order.total).toLocaleString()}</strong></p>
                  <p className="text-gray-500 mt-1">{order.address} · Payment: {order.payment_method}</p>
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
