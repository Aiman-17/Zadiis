'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import type { Product } from '@/types'

function ProductRow({ p, onDelete }: { p: Product; onDelete: (id: string) => void }) {
  return (
    <tr className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
      <td className="p-4 font-medium">{p.name}</td>
      <td className="p-4 text-sm" style={{ color: '#6B7280' }}>{p.sku || '—'}</td>
      <td className="p-4">PKR {p.price.toLocaleString()}</td>
      <td className="p-4">{p.stock_quantity}</td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/admin/products/${p.id}/edit`} style={{ color: '#A68B6E' }} className="hover:underline text-sm">
            Edit
          </Link>
          <button
            onClick={() => onDelete(p.id)}
            title="Archive product"
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ArchivedRow({ p, onRestore }: { p: Product; onRestore: (id: string) => void }) {
  return (
    <tr className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
      <td className="p-4 text-sm" style={{ color: '#6B7280' }}>{p.name}</td>
      <td className="p-4 text-sm" style={{ color: '#9CA3AF' }}>{p.sku || '—'}</td>
      <td className="p-4 text-sm" style={{ color: '#9CA3AF' }}>PKR {p.price.toLocaleString()}</td>
      <td className="p-4 text-sm" style={{ color: '#9CA3AF' }}>{p.stock_quantity}</td>
      <td className="p-4">
        <button
          onClick={() => onRestore(p.id)}
          title="Restore to store"
          className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: '#A68B6E' }}
        >
          <RotateCcw size={13} />
          Restore
        </button>
      </td>
    </tr>
  )
}

export default function AdminProductsClient({
  activeProducts: initialActive,
  archivedProducts: initialArchived,
}: {
  activeProducts: Product[]
  archivedProducts: Product[]
}) {
  const router = useRouter()
  const [active, setActive] = useState(initialActive)
  const [archived, setArchived] = useState(initialArchived)
  const [showArchived, setShowArchived] = useState(false)

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this product? It will be hidden from the store.')) return
    await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const product = active.find(p => p.id === id)
    if (product) {
      setActive(prev => prev.filter(p => p.id !== id))
      setArchived(prev => [{ ...product, is_active: false }, ...prev])
    }
  }

  const handleRestore = async (id: string) => {
    await fetch('/api/admin/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: true }),
    })
    const product = archived.find(p => p.id === id)
    if (product) {
      setArchived(prev => prev.filter(p => p.id !== id))
      setActive(prev => [{ ...product, is_active: true }, ...prev])
    }
    router.refresh()
  }

  const TABLE_HEAD = ['Name', 'SKU', 'Price', 'Stock', 'Actions']

  return (
    <div className="space-y-6">
      {/* Active products */}
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
              <tr>
                {TABLE_HEAD.map(h => (
                  <th key={h} className="text-left p-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center" style={{ color: '#9CA3AF' }}>
                    No active products.{' '}
                    <Link href="/admin/products/new" style={{ color: '#A68B6E' }} className="hover:underline">
                      Add your first product
                    </Link>
                  </td>
                </tr>
              ) : active.map(p => (
                <ProductRow key={p.id} p={p} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archived products — collapsible */}
      {archived.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
          <button
            onClick={() => setShowArchived(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 text-sm font-medium hover:bg-gray-100 transition-colors"
            style={{ color: '#6B7280' }}
          >
            <span className="flex items-center gap-2">
              {showArchived ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              Archived Products
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                {archived.length}
              </span>
            </span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Click to {showArchived ? 'hide' : 'show'}</span>
          </button>

          {showArchived && (
            <div className="bg-white overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="border-b border-t" style={{ borderColor: '#F3F4F6' }}>
                  <tr>
                    {TABLE_HEAD.map(h => (
                      <th key={h} className="text-left p-4 font-medium text-xs uppercase tracking-wide" style={{ color: '#9CA3AF' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {archived.map(p => (
                    <ArchivedRow key={p.id} p={p} onRestore={handleRestore} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
