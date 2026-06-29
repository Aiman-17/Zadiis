'use client'
import { useState, useEffect, useMemo } from 'react'
import { Archive, XCircle, Pencil, Check, X } from 'lucide-react'
import type { Order, OrderItem } from '@/types'
import CancelModal from '@/components/admin/CancelModal'
import ReturnModal from '@/components/admin/ReturnModal'

type RequestRecord = {
  id: string
  order_number: string
  customer_email: string
  customer_name: string | null
  reason: string
  notes: string | null
  status: 'pending' | 'resolved'
  created_at: string
  request_type?: 'return' | 'exchange'
  exchange_details?: string | null
  exchange_status?: 'pending' | 'shipped' | 'delivered' | null
}

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  new:        { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  processing: { backgroundColor: '#FEF9C3', color: '#92400E' },
  shipped:    { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  delivered:  { backgroundColor: '#DCFCE7', color: '#15803D' },
  returned:   { backgroundColor: '#FEE2E2', color: '#DC2626' },
  cancelled:  { backgroundColor: '#F3F4F6', color: '#6B7280' },
}

const REQUEST_REASON_LABELS: Record<string, string> = {
  changed_mind:          'Changed Mind',
  ordered_by_mistake:    'Ordered by Mistake',
  found_better_price:    'Found Better Price',
  delivery_too_slow:     'Delivery Too Slow',
  wrong_size:            'Wrong Size',
  defective_item:        'Defective / Damaged',
  wrong_item_sent:       'Wrong Item Sent',
  exchange:              'Exchange Request',
  other:                 'Other',
}

// Lifecycle: new → processing → shipped → delivered | cancelled | returned
const STATUSES = ['new', 'processing', 'shipped', 'delivered', 'returned']

type Tab = 'active' | 'pending_shipment' | 'completed' | 'returns' | 'cancellations' | 'archived'

export default function AdminOrders() {
  const [orders,          setOrders]          = useState<Order[]>([])
  const [returnRequests,  setReturnRequests]   = useState<RequestRecord[]>([])
  const [cancelRequests,  setCancelRequests]   = useState<RequestRecord[]>([])
  const [expanded,        setExpanded]         = useState<string | null>(null)
  const [tab,             setTab]              = useState<Tab>('active')
  const [cancelId,        setCancelId]         = useState<string | null>(null)
  const [returnId,        setReturnId]         = useState<string | null>(null)
  const [requestError,    setRequestError]     = useState<string | null>(null)
  const [editingId,       setEditingId]        = useState<string | null>(null)
  const [editForm,        setEditForm]         = useState({ phone: '', email: '', address: '' })
  const [editError,       setEditError]        = useState<string | null>(null)
  const [editSaving,      setEditSaving]       = useState(false)
  const [actionError,     setActionError]      = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
    fetch('/api/admin/requests')
      .then(r => r.json())
      .then(data => {
        setReturnRequests(data.returns || [])
        setCancelRequests(data.cancellations || [])
      })
      .catch(() => {})
  }, [])

  const counts = useMemo(() => ({
    active:           orders.filter(o => !o.is_archived && o.order_status === 'new').length,
    pending_shipment: orders.filter(o => !o.is_archived && (o.order_status === 'processing' || o.order_status === 'shipped')).length,
    completed:        orders.filter(o => !o.is_archived && o.order_status === 'delivered').length,
    returns:          orders.filter(o => !o.is_archived && o.order_status === 'returned').length + returnRequests.length,
    cancellations:    orders.filter(o => !o.is_archived && o.order_status === 'cancelled').length + cancelRequests.length,
    archived:         orders.filter(o => o.is_archived).length,
  }), [orders, returnRequests, cancelRequests])

  const filtered = useMemo(() => {
    if (tab === 'active')            return orders.filter(o => !o.is_archived && o.order_status === 'new')
    if (tab === 'pending_shipment')  return orders.filter(o => !o.is_archived && (o.order_status === 'processing' || o.order_status === 'shipped'))
    if (tab === 'completed')         return orders.filter(o => !o.is_archived && o.order_status === 'delivered')
    if (tab === 'returns')           return orders.filter(o => !o.is_archived && o.order_status === 'returned')
    if (tab === 'cancellations')     return orders.filter(o => !o.is_archived && o.order_status === 'cancelled')
    return orders.filter(o => o.is_archived)
  }, [orders, tab])

  const activeRequests = useMemo(() =>
    tab === 'returns' ? returnRequests : tab === 'cancellations' ? cancelRequests : [],
    [tab, returnRequests, cancelRequests]
  )

  const updateStatus = async (id: string, order_status: string) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status }),
    })
    if (!res.ok) { setActionError('Failed to update order status — please try again'); return }
    setActionError(null)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, order_status: order_status as Order['order_status'] } : o))
  }

  const returnOrder = async (id: string, reason: string, notes: string) => {
    const res = await fetch('/api/admin/orders/return', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reason, notes }),
    })
    if (!res.ok) { setActionError('Failed to mark order as returned — please try again'); return }
    setActionError(null)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, order_status: 'returned' as const } : o))
    setReturnId(null)
  }

  const cancelOrder = async (id: string, reason: string) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status: 'cancelled', cancellation_reason: reason }),
    })
    if (!res.ok) { setActionError('Failed to cancel order — please try again'); return }
    setActionError(null)
    setOrders(prev => prev.map(o =>
      o.id === id ? { ...o, order_status: 'cancelled' as const, cancellation_reason: reason } : o
    ))
    setCancelId(null)
  }

  const archiveOrder = async (id: string) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: true }),
    })
    if (!res.ok) { setActionError('Failed to archive order — please try again'); return }
    setActionError(null)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, is_archived: true } : o))
    if (expanded === id) setExpanded(null)
  }

  const startEdit = (order: Order) => {
    setEditingId(order.id)
    setEditForm({ phone: order.customer_phone, email: order.customer_email || '', address: order.address })
    setEditError(null)
  }

  const saveContact = async (orderId: string) => {
    setEditSaving(true)
    setEditError(null)
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, customer_phone: editForm.phone, customer_email: editForm.email, address: editForm.address }),
    })
    const data = await res.json()
    if (data.error) {
      setEditError(data.error)
      setEditSaving(false)
      return
    }
    setOrders(prev => prev.map(o => o.id === orderId
      ? { ...o, customer_phone: editForm.phone, customer_email: editForm.email, address: editForm.address, email_bounced: false }
      : o
    ))
    setEditingId(null)
    setEditSaving(false)
  }

  const resolveRequest = async (id: string, type: 'return' | 'cancellation') => {
    await fetch('/api/admin/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type }),
    })
    if (type === 'return') setReturnRequests(prev => prev.filter(r => r.id !== id))
    else setCancelRequests(prev => prev.filter(r => r.id !== id))
  }

  const markExchangeShipped = async (id: string) => {
    await fetch('/api/admin/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'return', action: 'shipped' }),
    })
    setReturnRequests(prev => prev.map(r => r.id === id ? { ...r, exchange_status: 'shipped' as const } : r))
  }

  const markExchangeDelivered = async (id: string) => {
    await fetch('/api/admin/requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, type: 'return', action: 'delivered' }),
    })
    setReturnRequests(prev => prev.filter(r => r.id !== id))
  }

  // Find order by number from loaded orders and open the relevant modal
  const handleCancelFromRequest = (orderNumber: string, requestId: string) => {
    setRequestError(null)
    const order = orders.find(o => o.order_number === orderNumber)
    if (!order) {
      setRequestError(`Order ${orderNumber} not found — it may already be cancelled.`)
      return
    }
    setCancelId(order.id)
    // Auto-resolve the request after modal confirms
    void resolveRequest(requestId, 'cancellation')
  }

  const handleReturnFromRequest = (orderNumber: string, requestId: string) => {
    setRequestError(null)
    const order = orders.find(o => o.order_number === orderNumber)
    if (!order) {
      setRequestError(`Order ${orderNumber} not found — it may already be returned.`)
      return
    }
    setReturnId(order.id)
    void resolveRequest(requestId, 'return')
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'active',           label: `Active (${counts.active})` },
    { key: 'pending_shipment', label: `Pending Shipment (${counts.pending_shipment})` },
    { key: 'completed',        label: `Completed (${counts.completed})` },
    { key: 'returns',          label: `Returns (${counts.returns})` },
    { key: 'cancellations',    label: `Cancellations (${counts.cancellations})` },
    { key: 'archived',         label: `Archived (${counts.archived})` },
  ]

  return (
    <div>
      {cancelId && (
        <CancelModal
          onConfirm={reason => cancelOrder(cancelId, reason)}
          onClose={() => setCancelId(null)}
        />
      )}
      {returnId && (
        <ReturnModal
          onConfirm={(reason, notes) => returnOrder(returnId, reason, notes)}
          onClose={() => setReturnId(null)}
        />
      )}

      <h1 className="text-2xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Orders</h1>

      {actionError && (
        <div className="text-sm mb-4 px-4 py-2 rounded flex items-center justify-between" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          <span>{actionError}</span>
          <button className="ml-3 underline text-xs" onClick={() => setActionError(null)}>Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setRequestError(null) }}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors"
            style={tab === t.key
              ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
              : { borderColor: '#E8DDD4', color: '#6B7280' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Customer request cards (Returns + Cancellations tabs only) */}
      {activeRequests.length > 0 && (
        <div className="mb-5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A68B6E' }}>
            Customer Requests — Pending Action
          </p>
          {requestError && (
            <div className="rounded-md px-4 py-2.5 text-sm mb-2"
              style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
              {requestError}
            </div>
          )}
          {activeRequests.map(req => {
            const isReturn   = tab === 'returns'
            const isExchange = req.request_type === 'exchange'

            // Exchange border: purple. Return: blue. Cancel: amber.
            const borderLeftColor = isExchange ? '#A78BFA' : isReturn ? '#3B82F6' : '#F59E0B'

            return (
              <div key={req.id} className="bg-white rounded-lg border p-4"
                style={{
                  borderColor: isExchange ? '#DDD6FE' : isReturn ? '#BFDBFE' : '#FDE68A',
                  borderLeftWidth: 4,
                  borderLeftColor,
                }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={isExchange
                          ? { backgroundColor: '#EDE9FE', color: '#6D28D9' }
                          : isReturn
                            ? { backgroundColor: '#DBEAFE', color: '#1D4ED8' }
                            : { backgroundColor: '#FEF9C3', color: '#92400E' }}>
                        {isExchange ? 'EXCHANGE REQUEST' : isReturn ? 'RETURN REQUEST' : 'CANCEL REQUEST'}
                      </span>
                      <span className="font-medium text-sm" style={{ color: '#A68B6E' }}>{req.order_number}</span>
                      {isExchange && req.exchange_status === 'shipped' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}>
                          Shipped
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{req.customer_name || 'Customer'}</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>{req.customer_email}</p>
                    {isExchange && req.exchange_details && (
                      <p className="text-xs mt-1 font-medium" style={{ color: '#4B5563' }}>
                        Wants: {req.exchange_details}
                      </p>
                    )}
                    {!isExchange && (
                      <p className="text-xs mt-1" style={{ color: '#4B5563' }}>
                        Reason: {REQUEST_REASON_LABELS[req.reason] || req.reason}
                      </p>
                    )}
                    {req.notes && (
                      <p className="text-xs mt-0.5 italic" style={{ color: '#9CA3AF' }}>"{req.notes}"</p>
                    )}
                    <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    {isExchange ? (
                      req.exchange_status === 'shipped' ? (
                        <button
                          onClick={() => markExchangeDelivered(req.id)}
                          className="text-xs px-3 py-1.5 rounded-full font-medium"
                          style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                        >
                          Mark Delivered
                        </button>
                      ) : (
                        <button
                          onClick={() => markExchangeShipped(req.id)}
                          className="text-xs px-3 py-1.5 rounded-full font-medium"
                          style={{ backgroundColor: '#EDE9FE', color: '#6D28D9' }}
                        >
                          Mark Shipped
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => isReturn
                          ? handleReturnFromRequest(req.order_number, req.id)
                          : handleCancelFromRequest(req.order_number, req.id)
                        }
                        className="text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{ backgroundColor: isReturn ? '#DBEAFE' : '#FEF9C3', color: isReturn ? '#1D4ED8' : '#92400E' }}
                      >
                        {isReturn ? 'Process Return' : 'Cancel Order'}
                      </button>
                    )}
                    <button
                      onClick={() => resolveRequest(req.id, isReturn ? 'return' : 'cancellation')}
                      className="text-xs px-3 py-1.5 rounded-full border"
                      style={{ borderColor: '#E8DDD4', color: '#9CA3AF' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
          {filtered.length > 0 && (
            <div className="border-t mt-3 mb-1" style={{ borderColor: '#E8DDD4' }} />
          )}
        </div>
      )}

      {filtered.length === 0 && activeRequests.length === 0 && (
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
                <p className="font-medium text-sm flex items-center gap-2 flex-wrap">
                  <span style={{ color: '#A68B6E' }}>{order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                  {' — '}{order.customer_name}
                  {order.email_bounced && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                      ⚠️ Email bounced
                    </span>
                  )}
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

                {/* Cancel — active/pending orders only */}
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

                {/* Archive — terminal status orders only */}
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

                {/* Edit contact details */}
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#E8DDD4' }}>
                  {editingId === order.id ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#A68B6E' }}>Edit Contact Details</p>
                      <div>
                        <label className="text-xs text-gray-500">Phone</label>
                        <input
                          className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                          style={{ borderColor: '#E2E8F0' }}
                          value={editForm.phone}
                          onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                          placeholder="03001234567"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Email</label>
                        <input
                          className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                          style={{ borderColor: '#E2E8F0' }}
                          value={editForm.email}
                          onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="customer@email.com"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Address</label>
                        <input
                          className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                          style={{ borderColor: '#E2E8F0' }}
                          value={editForm.address}
                          onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                        />
                      </div>
                      {editError && <p className="text-xs" style={{ color: '#DC2626' }}>{editError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveContact(order.id)}
                          disabled={editSaving}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium"
                          style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                        >
                          <Check size={12} /> {editSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => { setEditingId(null); setEditError(null) }}
                          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border"
                          style={{ borderColor: '#E8DDD4', color: '#9CA3AF' }}
                        >
                          <X size={12} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(order)}
                      className="flex items-center gap-1.5 text-xs"
                      style={{ color: '#9CA3AF' }}
                    >
                      <Pencil size={12} /> Edit contact details
                    </button>
                  )}
                </div>

                {order.order_status !== 'cancelled' && !order.is_archived && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Update Status:</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.map(s => (
                        <button
                          key={s}
                          onClick={() => s === 'returned' ? setReturnId(order.id) : updateStatus(order.id, s)}
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
