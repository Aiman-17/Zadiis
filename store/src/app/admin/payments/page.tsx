'use client'
import { useState, useEffect, useMemo } from 'react'
import { Trash2, Archive, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import type { Order } from '@/types'

const PAYMENT_COLORS: Record<string, React.CSSProperties> = {
  pending: { backgroundColor: '#FEF9C3', color: '#92400E' },
  paid:    { backgroundColor: '#DCFCE7', color: '#15803D' },
  failed:  { backgroundColor: '#FEE2E2', color: '#DC2626' },
}

type Tab = 'all' | 'pending' | 'paid'

export default function AdminPayments() {
  const [orders, setOrders]           = useState<Order[]>([])
  const [tab, setTab]                 = useState<Tab>('all')
  const [marking, setMarking]         = useState<string | null>(null)
  const [actioning, setActioning]     = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
  }, [])

  const active   = orders.filter(o => !o.is_archived)
  const archived = orders.filter(o => o.is_archived)

  const filtered = useMemo(() => {
    if (tab === 'all')     return active
    if (tab === 'paid')    return active.filter(o => o.payment_status === 'paid')
    return active.filter(o => o.payment_status === 'pending')
  }, [active, tab])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all',     label: `All (${active.length})` },
    { key: 'pending', label: `Pending (${active.filter(o => o.payment_status === 'pending').length})` },
    { key: 'paid',    label: `Paid (${active.filter(o => o.payment_status === 'paid').length})` },
  ]

  const markPaid = async (id: string) => {
    setMarking(id)
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, payment_status: 'paid' }),
    })
    if (res.ok) setOrders(prev => prev.map(o => o.id === id ? { ...o, payment_status: 'paid' } : o))
    setMarking(null)
  }

  const archivePayment = async (id: string) => {
    setActioning(id)
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: true }),
    })
    if (res.ok) setOrders(prev => prev.map(o => o.id === id ? { ...o, is_archived: true } : o))
    setActioning(null)
  }

  const restorePayment = async (id: string) => {
    setActioning(id)
    const res = await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_archived: false }),
    })
    if (res.ok) setOrders(prev => prev.map(o => o.id === id ? { ...o, is_archived: false } : o))
    setActioning(null)
  }

  const deletePayment = async (id: string, orderNumber: string) => {
    if (!confirm(`Permanently delete payment record for ${orderNumber}?\n\nThis cannot be undone.`)) return
    setActioning(id)
    const res = await fetch('/api/admin/orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setOrders(prev => prev.filter(o => o.id !== id))
    setActioning(null)
  }

  const TABLE_COLS = ['Order', 'Customer', 'Amount', 'Method', 'Payment', 'Date', 'Action']

  const renderRow = (order: Order, isArchivedView = false) => (
    <tr key={order.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
      <td className="p-4 font-medium" style={{ color: '#A68B6E' }}>{order.order_number}</td>
      <td className="p-4">
        <p className="font-medium">{order.customer_name}</p>
        <p className="text-xs" style={{ color: '#6B7280' }}>{order.customer_phone}</p>
      </td>
      <td className="p-4 font-semibold">PKR {Number(order.total).toLocaleString()}</td>
      <td className="p-4 capitalize">{order.payment_method}</td>
      <td className="p-4">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={PAYMENT_COLORS[order.payment_status] ?? {}}>
          {order.payment_status}
        </span>
        {order.safepay_transaction_id && (
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{order.safepay_transaction_id}</p>
        )}
      </td>
      <td className="p-4 text-xs" style={{ color: '#6B7280' }}>
        {new Date(order.created_at).toLocaleDateString()}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2.5">
          {!isArchivedView && order.payment_status === 'pending' && (
            order.payment_method === 'cod'
              ? <span className="text-xs" style={{ color: '#9CA3AF' }}>Collect on delivery</span>
              : (
                <button
                  onClick={() => markPaid(order.id)}
                  disabled={marking === order.id}
                  className="text-xs px-3 py-1.5 rounded border font-medium"
                  style={{ borderColor: '#A68B6E', color: '#A68B6E' }}
                >
                  {marking === order.id ? 'Saving…' : 'Mark Paid'}
                </button>
              )
          )}
          {!isArchivedView && order.payment_status === 'paid' && (
            <span className="text-xs" style={{ color: '#15803D' }}>✓ Confirmed</span>
          )}

          {/* Archive — all active rows */}
          {!isArchivedView && (
            <button
              onClick={() => archivePayment(order.id)}
              disabled={actioning === order.id}
              title="Archive payment"
              className="transition-colors"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F59E0B')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
            >
              <Archive size={14} />
            </button>
          )}

          {/* Delete — paid tab only */}
          {!isArchivedView && tab === 'paid' && (
            <button
              onClick={() => deletePayment(order.id, order.order_number)}
              disabled={actioning === order.id}
              title="Delete payment record"
              className="transition-colors"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#DC2626')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9CA3AF')}
            >
              <Trash2 size={14} />
            </button>
          )}

          {/* Restore — archived view */}
          {isArchivedView && (
            <button
              onClick={() => restorePayment(order.id)}
              disabled={actioning === order.id}
              title="Restore to active"
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: '#A68B6E' }}
            >
              <RotateCcw size={13} />
              Restore
            </button>
          )}
        </div>
      </td>
    </tr>
  )

  const renderTable = (rows: Order[], isArchivedView = false) => (
    <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
            <tr>
              {TABLE_COLS.map(h => (
                <th key={h} className="text-left p-4 font-medium" style={{ color: '#6B7280' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
                  No payments in this category.
                </td>
              </tr>
            ) : (
              rows.map(o => renderRow(o, isArchivedView))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div>
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Payments</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors"
            style={tab === t.key
              ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
              : { borderColor: '#E8DDD4', color: '#6B7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {renderTable(filtered)}

      {/* Archived payments — collapsible */}
      {archived.length > 0 && (
        <div className="mt-6 rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
          <button
            onClick={() => setShowArchived(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 text-sm font-medium hover:bg-gray-100 transition-colors"
            style={{ color: '#6B7280' }}
          >
            <span className="flex items-center gap-2">
              {showArchived ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              Archived Payments
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                {archived.length}
              </span>
            </span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              Click to {showArchived ? 'hide' : 'show'}
            </span>
          </button>
          {showArchived && renderTable(archived, true)}
        </div>
      )}
    </div>
  )
}
