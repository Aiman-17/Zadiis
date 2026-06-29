'use client'
import { useState } from 'react'

type CodOrder = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  city: string
  total: number
  order_status: string
  cod_status: string | null
  cod_collected_at: string | null
  created_at: string
}

const COD_STYLES: Record<string, React.CSSProperties> = {
  received: { backgroundColor: '#DCFCE7', color: '#15803D' },
  lost:     { backgroundColor: '#FEE2E2', color: '#DC2626' },
  pending:  { backgroundColor: '#FEF9C3', color: '#92400E' },
}

export default function CodClient({ orders }: { orders: CodOrder[] }) {
  const [list, setList] = useState(orders)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = async (id: string, cod_status: string) => {
    setLoading(id)
    const res = await fetch('/api/admin/orders/cod', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, cod_status }),
    })
    if (res.ok) {
      setError(null)
      setList(prev => prev.map(o =>
        o.id === id
          ? { ...o, cod_status, cod_collected_at: cod_status === 'received' ? new Date().toISOString() : null }
          : o
      ))
    } else {
      setError('Failed to update COD status — please try again')
    }
    setLoading(null)
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm mb-1" style={{ color: '#DC2626' }}>{error}</p>
      )}
      {list.length === 0 && (
        <p className="text-sm" style={{ color: '#9CA3AF' }}>No COD orders yet.</p>
      )}
      {list.map(order => {
        const status = order.cod_status || 'pending'
        return (
          <div key={order.id} className="bg-white rounded-lg border p-4" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-medium text-sm">
                  <span style={{ color: '#A68B6E' }}>{order.order_number}</span>
                  {' — '}{order.customer_name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  {order.customer_phone} · {order.city} · {new Date(order.created_at).toLocaleDateString('en-PK')}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                  Order status: <span className="capitalize">{order.order_status}</span>
                  {order.cod_collected_at && (
                    <span className="ml-2" style={{ color: '#15803D' }}>
                      · Received {new Date(order.cod_collected_at).toLocaleDateString('en-PK')}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                <span className="font-semibold text-sm">PKR {Number(order.total).toLocaleString()}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={COD_STYLES[status] || COD_STYLES.pending}>
                  {status}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-3 flex-wrap">
              {status !== 'received' && (
                <button
                  disabled={loading === order.id}
                  onClick={() => update(order.id, 'received')}
                  className="text-xs px-3 py-1.5 rounded border font-medium transition-colors disabled:opacity-50"
                  style={{ borderColor: '#86EFAC', color: '#15803D', backgroundColor: '#F0FDF4' }}
                >
                  Mark Cash Received
                </button>
              )}
              {status !== 'lost' && (
                <button
                  disabled={loading === order.id}
                  onClick={() => update(order.id, 'lost')}
                  className="text-xs px-3 py-1.5 rounded border font-medium transition-colors disabled:opacity-50"
                  style={{ borderColor: '#FCA5A5', color: '#DC2626', backgroundColor: '#FEF2F2' }}
                >
                  Mark as Lost
                </button>
              )}
              {status !== 'pending' && (
                <button
                  disabled={loading === order.id}
                  onClick={() => update(order.id, 'pending')}
                  className="text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50"
                  style={{ borderColor: '#E8DDD4', color: '#9CA3AF' }}
                >
                  Reset to Pending
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
