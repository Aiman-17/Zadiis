'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import type { Product } from '@/types'

function isLowStock(p: Product): boolean {
  const vs = p.variant_stock
  if (vs && Object.keys(vs).length > 0) {
    return Object.values(vs).some(sizes =>
      Object.values(sizes as Record<string, number>).some(q => q <= 3)
    )
  }
  return p.stock_quantity <= 3
}

function getProductStock(p: Product): number {
  const vs = p.variant_stock
  if (vs && Object.keys(vs).length > 0) {
    return Object.values(vs).reduce(
      (sum, sizes) => sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0
    )
  }
  return p.stock_quantity
}

function productVelocity(p: Product): number {
  const ageDays = Math.max(1, (Date.now() - new Date(p.created_at).getTime()) / 86400000)
  return p.total_sold / ageDays
}

function daysToSellout(p: Product): number | null {
  const stock = getProductStock(p)
  const v = productVelocity(p)
  if (v <= 0 || stock <= 0) return null
  return Math.round(stock / v)
}

function productSellThrough(p: Product): number {
  const stock = getProductStock(p)
  const total = p.total_sold + stock
  return total > 0 ? p.total_sold / total : 0
}

function isSlowMover(p: Product, avgSellThrough: number): boolean {
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000
  if (ageDays < 15) return false
  const stock = getProductStock(p)
  if (stock === 0) return false
  // Slow if sell-through is less than half the store average
  // Edge case: if avg is 0 (nothing has sold store-wide), nothing is flagged
  return avgSellThrough > 0 && productSellThrough(p) < avgSellThrough * 0.5
}

function DTSBadge({ p }: { p: Product }) {
  const dts = daysToSellout(p)
  if (dts === null) return <span style={{ color: '#D1D5DB' }}>—</span>
  if (dts <= 7)  return <span className="font-medium text-xs" style={{ color: '#DC2626' }}>{dts}d ⚠</span>
  if (dts <= 30) return <span className="text-xs" style={{ color: '#F59E0B' }}>{dts}d</span>
  return <span className="text-xs" style={{ color: '#9CA3AF' }}>{dts}d</span>
}

function ProductRow({ p, onDelete, waitlist }: { p: Product; onDelete: (id: string) => void; waitlist: number }) {
  const stock = getProductStock(p)
  return (
    <tr className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
      <td className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-medium">{p.name}</span>
          {waitlist > 0 && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
              title={`${waitlist} customer${waitlist !== 1 ? 's' : ''} waiting for restock`}>
              {waitlist} waiting
            </span>
          )}
          {p.product_category && (
            <span className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
              {p.product_category}
            </span>
          )}
        </div>
        {(p.is_bestseller || p.is_trending || p.is_new_arrival) && (
          <div className="flex gap-1 mt-1">
            {p.is_bestseller  && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFFBEB', color: '#92400E' }}>★ Best Seller</span>}
            {p.is_trending    && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FDF2F8', color: '#9D174D' }}>↑ Trending</span>}
            {p.is_new_arrival && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#F5F3FF', color: '#5B21B6' }}>✦ New</span>}
          </div>
        )}
      </td>
      <td className="p-4 text-sm" style={{ color: '#6B7280' }}>{p.sku || '—'}</td>
      <td className="p-4">PKR {p.price.toLocaleString()}</td>
      <td className="p-4">
        <span style={stock === 0 ? { color: '#EF4444', fontWeight: 600 } : {}}>
          {stock === 0 ? 'Sold Out' : stock}
        </span>
      </td>
      <td className="p-4 text-sm"><DTSBadge p={p} /></td>
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
      <td className="p-4 text-sm" style={{ color: '#9CA3AF' }}>{getProductStock(p)}</td>
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
  waitlistCounts,
}: {
  activeProducts: Product[]
  archivedProducts: Product[]
  waitlistCounts: Record<string, number>
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filterParam    = searchParams.get('filter')
  const filterLowStock  = filterParam === 'low-stock'
  const filterSoldOut   = filterParam === 'sold-out'
  const filterSlowMovers = filterParam === 'slow-movers'

  const [active, setActive] = useState(initialActive)
  const [archived, setArchived] = useState(initialArchived)
  const [showArchived, setShowArchived] = useState(false)

  // Store average sell-through — must be above visibleActive to avoid TDZ
  const eligibleForAvg = active.filter(p => {
    const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000
    return ageDays >= 15 && getProductStock(p) > 0
  })
  const avgSellThrough = eligibleForAvg.length > 0
    ? eligibleForAvg.reduce((sum, p) => sum + productSellThrough(p), 0) / eligibleForAvg.length
    : 0

  const visibleActive = filterLowStock
    ? active.filter(isLowStock)
    : filterSoldOut
    ? active.filter(p => getProductStock(p) === 0)
    : filterSlowMovers
    ? active.filter(p => isSlowMover(p, avgSellThrough))
    : active

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

  const TABLE_HEAD = ['Name', 'SKU', 'Price', 'Stock', 'Days to Sellout', 'Actions']

  const bsCount    = active.filter(p => p.is_bestseller).length
  const trendCount = active.filter(p => p.is_trending).length
  const newCount   = active.filter(p => p.is_new_arrival).length
  const slowCount  = active.filter(p => isSlowMover(p, avgSellThrough)).length

  return (
    <div className="space-y-6">

      {/* Merch counts */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {bsCount > 0    && <span><strong style={{ color: '#92400E' }}>{bsCount}</strong> <span style={{ color: '#9CA3AF' }}>Best Seller{bsCount !== 1 ? 's' : ''}</span></span>}
        {trendCount > 0 && <span><strong style={{ color: '#9D174D' }}>{trendCount}</strong> <span style={{ color: '#9CA3AF' }}>Trending</span></span>}
        {newCount > 0   && <span><strong style={{ color: '#5B21B6' }}>{newCount}</strong> <span style={{ color: '#9CA3AF' }}>New Arrival{newCount !== 1 ? 's' : ''}</span></span>}
        {slowCount > 0  && <span><strong style={{ color: '#DC2626' }}>{slowCount}</strong> <span style={{ color: '#9CA3AF' }}>Slow Mover{slowCount !== 1 ? 's' : ''}</span></span>}
      </div>

      {/* Active filter banner */}
      {(filterLowStock || filterSoldOut || filterSlowMovers) && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg text-sm"
          style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5' }}>
          <span style={{ color: '#B91C1C' }}>
            {filterLowStock  && `Showing ${visibleActive.length} product${visibleActive.length !== 1 ? 's' : ''} with low stock (1–3 units)`}
            {filterSoldOut   && `Showing ${visibleActive.length} sold out product${visibleActive.length !== 1 ? 's' : ''}`}
            {filterSlowMovers && `Showing ${visibleActive.length} slow mover${visibleActive.length !== 1 ? 's' : ''} — below 50% of store avg sell-through, 15+ days old`}
          </span>
          <Link href="/admin/products" className="text-xs font-medium hover:underline" style={{ color: '#A68B6E' }}>
            Clear filter
          </Link>
        </div>
      )}

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
              {visibleActive.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center" style={{ color: '#9CA3AF' }}>
                    {filterLowStock   && 'No low stock products. All variants are well stocked.'}
                    {filterSoldOut    && 'No sold out products.'}
                    {filterSlowMovers && 'No slow movers. All active products have at least one sale.'}
                    {!filterLowStock && !filterSoldOut && !filterSlowMovers && (
                      <>No active products.{' '}
                        <Link href="/admin/products/new" style={{ color: '#A68B6E' }} className="hover:underline">
                          Add your first product
                        </Link>
                      </>
                    )}
                  </td>
                </tr>
              ) : visibleActive.map(p => (
                <ProductRow key={p.id} p={p} onDelete={handleDelete} waitlist={waitlistCounts[p.id] || 0} />
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
