'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'

type InvoiceRow = {
  id: string
  invoice_number: string
  amount: number
  generated_at: string
  orders: {
    order_number: string
    customer_name: string
    customer_phone: string
    payment_method: string
  }
}

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

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/invoices')
      .then(r => r.json())
      .then(data => setInvoices(Array.isArray(data) ? data : []))
  }, [])

  const filtered = useMemo(() => {
    const now = new Date()
    return invoices.filter(inv => {
      if (filter === 'all') return true
      if (filter === 'today') return new Date(inv.generated_at).toDateString() === now.toDateString()
      if (filter === '3days') return isWithinDays(inv.generated_at, 3)
      if (filter === '7days') return isWithinDays(inv.generated_at, 7)
      if (filter === '1month') return isWithinDays(inv.generated_at, 30)
      return true
    })
  }, [invoices, filter])

  const deleteInvoice = async (id: string) => {
    if (!confirm('Delete this invoice record permanently?')) return
    setDeleting(id)
    const res = await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' })
    if (res.ok) setInvoices(prev => prev.filter(inv => inv.id !== id))
    setDeleting(null)
  }

  return (
    <div>
      <h1 className="text-2xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Invoices</h1>

      {/* Time filters */}
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
          {filtered.length} invoice{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm" style={{ color: '#9CA3AF' }}>
          {invoices.length === 0
            ? 'No invoices yet. Generated automatically when orders are paid.'
            : 'No invoices in this period.'}
        </p>
      )}

      {filtered.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
                <tr>
                  <th className="text-left p-4 font-medium">Invoice #</th>
                  <th className="text-left p-4 font-medium">Order</th>
                  <th className="text-left p-4 font-medium">Customer</th>
                  <th className="text-left p-4 font-medium">Amount</th>
                  <th className="text-left p-4 font-medium">Method</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                    <td className="p-4 font-bold" style={{ color: '#A68B6E' }}>{inv.invoice_number}</td>
                    <td className="p-4 font-medium">
                      {inv.orders?.order_number ?? <span className="italic text-sm" style={{ color: '#9CA3AF' }}>Order deleted</span>}
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{inv.orders?.customer_name ?? <span className="italic text-sm" style={{ color: '#9CA3AF' }}>—</span>}</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>{inv.orders?.customer_phone}</p>
                    </td>
                    <td className="p-4 font-semibold">PKR {Number(inv.amount).toLocaleString()}</td>
                    <td className="p-4 capitalize">{inv.orders?.payment_method}</td>
                    <td className="p-4 text-xs" style={{ color: '#6B7280' }}>
                      {new Date(inv.generated_at).toLocaleDateString('en-PK', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/invoices/${inv.id}/print`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1.5 rounded border font-medium transition-colors"
                          style={{ borderColor: '#A68B6E', color: '#A68B6E' }}
                        >
                          Print / PDF
                        </Link>
                        <button
                          onClick={() => deleteInvoice(inv.id)}
                          disabled={deleting === inv.id}
                          className="transition-colors"
                          style={{ color: '#FCA5A5' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = '#FCA5A5')}
                          title="Delete invoice"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
