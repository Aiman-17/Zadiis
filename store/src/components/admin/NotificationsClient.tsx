'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import type { AdminNotification } from '@/types'

const TYPE_LABELS: Record<AdminNotification['type'], string> = {
  payment_received: 'Payment Received',
  cancellation_request: 'Cancellation Request',
  return_request: 'Return Request',
  exchange_request: 'Exchange Request',
}

export default function NotificationsClient({ initialNotifications }: { initialNotifications: AdminNotification[] }) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [archived, setArchived] = useState<AdminNotification[]>([])
  const [showArchived, setShowArchived] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Mark everything currently shown as read once the merchant has opened
  // this page — matches the existing clearNotifications() UX convention in
  // admin/layout.tsx, but persisted to the DB instead of local state only.
  useEffect(() => {
    if (initialNotifications.some(n => !n.read_at)) {
      fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadArchived = async () => {
    const res = await fetch('/api/admin/notifications?includeArchived=true')
    if (res.ok) {
      const data = await res.json()
      setArchived((data.notifications || []).filter((n: AdminNotification) => n.archived_at))
    }
  }

  const archiveOne = async (id: string) => {
    setBusyId(id)
    const res = await fetch('/api/admin/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'archive' }),
    })
    if (res.ok) {
      const notif = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notif) setArchived(prev => [{ ...notif, archived_at: new Date().toISOString() }, ...prev])
    }
    setBusyId(null)
  }

  const restoreOne = async (id: string) => {
    setBusyId(id)
    const res = await fetch('/api/admin/notifications', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'restore' }),
    })
    if (res.ok) {
      const notif = archived.find(n => n.id === id)
      setArchived(prev => prev.filter(n => n.id !== id))
      if (notif) setNotifications(prev => [{ ...notif, archived_at: null }, ...prev])
    }
    setBusyId(null)
  }

  const deleteOne = async (id: string, fromArchived: boolean) => {
    if (!confirm('Delete this notification permanently? This cannot be undone.')) return
    setBusyId(id)
    const res = await fetch('/api/admin/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      if (fromArchived) setArchived(prev => prev.filter(n => n.id !== id))
      else setNotifications(prev => prev.filter(n => n.id !== id))
    }
    setBusyId(null)
  }

  const renderRow = (n: AdminNotification, isArchivedRow: boolean) => (
    <div
      key={n.id}
      className="flex items-start justify-between gap-3 p-4 border-b last:border-0"
      style={{ borderColor: '#F3F4F6' }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{TYPE_LABELS[n.type]}</span>
          {!n.read_at && (
            <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#F5F3FF', color: '#5B21B6' }}>
              NEW
            </span>
          )}
        </div>
        <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>{n.message}</p>
        <div className="flex items-center gap-2 mt-1">
          {n.order_number && (
            <Link href={`/admin/orders?search=${n.order_number}`} className="text-xs hover:underline" style={{ color: '#A68B6E' }}>
              {n.order_number}
            </Link>
          )}
          <span className="text-xs" style={{ color: '#9CA3AF' }}>
            {new Date(n.created_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        {isArchivedRow ? (
          <button
            onClick={() => restoreOne(n.id)}
            disabled={busyId === n.id}
            title="Restore notification"
            className="transition-colors"
            style={{ color: '#9CA3AF' }}
          >
            <RotateCcw size={15} />
          </button>
        ) : (
          <button
            onClick={() => archiveOne(n.id)}
            disabled={busyId === n.id}
            title="Archive notification"
            className="transition-colors"
            style={{ color: '#9CA3AF' }}
          >
            <Archive size={15} />
          </button>
        )}
        <button
          onClick={() => deleteOne(n.id, isArchivedRow)}
          disabled={busyId === n.id}
          title="Delete notification permanently"
          className="transition-colors"
          style={{ color: '#FCA5A5' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
          onMouseLeave={e => (e.currentTarget.style.color = '#FCA5A5')}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )

  return (
    <div>
      {notifications.length === 0 ? (
        <p className="text-sm" style={{ color: '#9CA3AF' }}>
          No notifications yet. Payment, cancellation, return, and exchange events will appear here.
        </p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
          {notifications.map(n => renderRow(n, false))}
        </div>
      )}

      <div className="mt-6 rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
        <button
          onClick={() => { const next = !showArchived; setShowArchived(next); if (next) loadArchived() }}
          className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 text-sm font-medium hover:bg-gray-100 transition-colors"
          style={{ color: '#6B7280' }}
        >
          <span>Archived Notifications</span>
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Click to {showArchived ? 'hide' : 'show'}</span>
        </button>
        {showArchived && (
          archived.length === 0
            ? <p className="text-sm p-4" style={{ color: '#9CA3AF' }}>No archived notifications.</p>
            : <div className="bg-white">{archived.map(n => renderRow(n, true))}</div>
        )}
      </div>
    </div>
  )
}
