'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import type { Product } from '@/types'
import { merchandisingIdSets, computeStoreAvgSellThrough, isSlowMover } from '@/lib/merchandising'
import { getEffectiveStock } from '@/lib/stock'
import { useLongPress } from '@/hooks/useLongPress'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'
import { getAdminStatusColors } from '@/lib/adminColors'

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
  return getEffectiveStock(p)
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

function DTSBadge({ p }: { p: Product }) {
  const dts = daysToSellout(p)
  const C = getAdminStatusColors(useAdminDarkMode())
  if (dts === null) return <span style={{ color: 'var(--admin-subtle)' }}>—</span>
  if (dts <= 7)  return <span className="font-medium text-xs" style={{ color: C.criticalStrong }}>{dts}d ⚠</span>
  if (dts <= 30) return <span className="text-xs" style={{ color: C.warning }}>{dts}d</span>
  return <span className="text-xs" style={{ color: 'var(--admin-subtle)' }}>{dts}d</span>
}

function ProductRow({ p, onDelete, waitlist, isBestSeller, isTrending }: {
  p: Product; onDelete: (id: string) => void; waitlist: number
  isBestSeller: boolean; isTrending: boolean
}) {
  const stock = getProductStock(p)
  const { revealed, handlers } = useLongPress()
  const C = getAdminStatusColors(useAdminDarkMode())
  return (
    <tr className="border-b last:border-0" style={{ borderColor: 'var(--admin-divider)' }} {...handlers}>
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
              style={{ backgroundColor: 'var(--admin-divider)', color: 'var(--admin-muted)' }}>
              {p.product_category}
            </span>
          )}
        </div>
        {(isBestSeller || isTrending || p.is_new_arrival) && (
          <div className="flex gap-1 mt-1">
            {isBestSeller     && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FFFBEB', color: '#92400E' }}>★ Best Seller</span>}
            {isTrending       && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#FDF2F8', color: '#9D174D' }}>↑ Trending</span>}
            {p.is_new_arrival && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#F5F3FF', color: C.violetStrong }}>✦ New</span>}
          </div>
        )}
      </td>
      <td className="p-4 text-sm" style={{ color: 'var(--admin-muted)' }}>{p.sku || '—'}</td>
      <td className="p-4">PKR {p.price.toLocaleString()}</td>
      <td className="p-4">
        <span style={stock === 0 ? { color: C.critical, fontWeight: 600 } : {}}>
          {stock === 0 ? 'Sold Out' : stock}
        </span>
      </td>
      <td className="p-4 text-sm"><DTSBadge p={p} /></td>
      <td className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/admin/products/${p.id}/edit`} style={{ color: '#A68B6E' }} className="hover:underline text-sm">
            Edit
          </Link>
          {/* Hidden below md by default (long-press to reveal) — desktop unaffected */}
          <button
            onClick={() => onDelete(p.id)}
            title="Archive product"
            className={`hover:text-red-500 transition-colors ${revealed ? '' : 'max-md:hidden'}`}
            style={{ color: 'var(--admin-subtle)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}

function ArchivedRow({ p, onRestore }: { p: Product; onRestore: (id: string) => void }) {
  const { revealed, handlers } = useLongPress()
  return (
    <tr className="border-b last:border-0" style={{ borderColor: 'var(--admin-divider)' }} {...handlers}>
      <td className="p-4 text-sm" style={{ color: 'var(--admin-muted)' }}>{p.name}</td>
      <td className="p-4 text-sm" style={{ color: 'var(--admin-subtle)' }}>{p.sku || '—'}</td>
      <td className="p-4 text-sm" style={{ color: 'var(--admin-subtle)' }}>PKR {p.price.toLocaleString()}</td>
      <td className="p-4 text-sm" style={{ color: 'var(--admin-subtle)' }}>{getProductStock(p)}</td>
      <td className="p-4">
        <button
          onClick={() => onRestore(p.id)}
          title="Restore to store"
          className={`items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80 ${revealed ? 'flex' : 'hidden md:flex'}`}
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
  const C = getAdminStatusColors(useAdminDarkMode())
  const searchParams = useSearchParams()
  const filterParam    = searchParams.get('filter')
  const filterLowStock  = filterParam === 'low-stock'
  const filterSoldOut   = filterParam === 'sold-out'
  const filterSlowMovers = filterParam === 'slow-movers'

  const [active, setActive] = useState(initialActive)
  const [archived, setArchived] = useState(initialArchived)
  const [showArchived, setShowArchived] = useState(false)

  // Store average sell-through — must be above visibleActive to avoid TDZ.
  // Shared with sales/new and sales/[id]/edit (spec 006, US9 consolidation).
  const avgSellThrough = computeStoreAvgSellThrough(active)

  const visibleActive = filterLowStock
    ? active.filter(isLowStock)
    : filterSoldOut
    ? active.filter(p => getProductStock(p) === 0)
    : filterSlowMovers
    ? active.filter(p => isSlowMover(p, avgSellThrough))
    : active

  const handleDelete = async (id: string) => {
    if (!confirm('Archive this product? It will be hidden from the store.')) return
    const res = await fetch('/api/admin/products', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { alert('Failed to archive product — please try again'); return }
    const product = active.find(p => p.id === id)
    if (product) {
      setActive(prev => prev.filter(p => p.id !== id))
      setArchived(prev => [{ ...product, is_active: false }, ...prev])
    }
    router.refresh()
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

  // Same qualification as every other page (single source of truth —
  // specs/003-merchandising-badges-v2) — computed once for the whole table.
  const { bestSellerIds, trendingIds } = merchandisingIdSets(active)
  const bsCount    = bestSellerIds.size
  const trendCount = trendingIds.size
  const newCount   = active.filter(p => p.is_new_arrival).length
  const slowCount  = active.filter(p => isSlowMover(p, avgSellThrough)).length

  return (
    <div className="space-y-6">

      {/* Merch counts */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {bsCount > 0    && <span><strong style={{ color: '#92400E' }}>{bsCount}</strong> <span style={{ color: 'var(--admin-subtle)' }}>Best Seller{bsCount !== 1 ? 's' : ''}</span></span>}
        {trendCount > 0 && <span><strong style={{ color: '#9D174D' }}>{trendCount}</strong> <span style={{ color: 'var(--admin-subtle)' }}>Trending</span></span>}
        {newCount > 0   && <span><strong style={{ color: C.violetStrong }}>{newCount}</strong> <span style={{ color: 'var(--admin-subtle)' }}>New Arrival{newCount !== 1 ? 's' : ''}</span></span>}
        {slowCount > 0  && <span><strong style={{ color: C.criticalStrong }}>{slowCount}</strong> <span style={{ color: 'var(--admin-subtle)' }}>Slow Mover{slowCount !== 1 ? 's' : ''}</span></span>}
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
      <div className="bg-[var(--admin-surface)] rounded-lg border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="border-b bg-[var(--admin-bg)]" style={{ borderColor: 'var(--admin-border)' }}>
              <tr>
                {TABLE_HEAD.map(h => (
                  <th key={h} className="text-left p-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleActive.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center" style={{ color: 'var(--admin-subtle)' }}>
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
                <ProductRow
                  key={p.id}
                  p={p}
                  onDelete={handleDelete}
                  waitlist={waitlistCounts[p.id] || 0}
                  isBestSeller={bestSellerIds.has(p.id)}
                  isTrending={trendingIds.has(p.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Archived products — collapsible */}
      {archived.length > 0 && (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--admin-border)' }}>
          <button
            onClick={() => setShowArchived(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3 bg-[var(--admin-bg)] text-sm font-medium hover:bg-[var(--admin-divider)] transition-colors"
            style={{ color: 'var(--admin-muted)' }}
          >
            <span className="flex items-center gap-2">
              {showArchived ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              Archived Products
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--admin-divider)', color: 'var(--admin-subtle)' }}>
                {archived.length}
              </span>
            </span>
            <span className="text-xs" style={{ color: 'var(--admin-subtle)' }}>Click to {showArchived ? 'hide' : 'show'}</span>
          </button>

          {showArchived && (
            <div className="bg-[var(--admin-surface)] overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="border-b border-t" style={{ borderColor: 'var(--admin-divider)' }}>
                  <tr>
                    {TABLE_HEAD.map(h => (
                      <th key={h} className="text-left p-4 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--admin-subtle)' }}>{h}</th>
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
