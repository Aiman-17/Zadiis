'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'

const CATEGORIES = ['Summer', 'Winter', 'Formal', 'Casual', 'Eid', 'Sale']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const TYPES = [
  { label: 'Stitched', value: 'stitched' },
  { label: 'Unstitched', value: 'unstitched' },
]
const PRICE_RANGES = [
  { label: 'Under PKR 2,000', min: '0', max: '2000' },
  { label: 'PKR 2,000 – 5,000', min: '2000', max: '5000' },
  { label: 'PKR 5,000 – 10,000', min: '5000', max: '10000' },
  { label: 'Over PKR 10,000', min: '10000', max: '999999' },
]

const activeStyle = { backgroundColor: '#1C1C1C', borderColor: '#1C1C1C', color: 'white' }
const idleStyle = { borderColor: '#D1D5DB' }

export default function ProductFilters() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()
  const params = useSearchParams()

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (p.get(key) === value) p.delete(key)
    else p.set(key, value)
    router.push(`/shop?${p.toString()}`)
  }

  const setPrice = (min: string, max: string) => {
    const p = new URLSearchParams(params.toString())
    if (p.get('min') === min && p.get('max') === max) { p.delete('min'); p.delete('max') }
    else { p.set('min', min); p.set('max', max) }
    router.push(`/shop?${p.toString()}`)
  }

  const clearAll = () => { router.push('/shop'); setDrawerOpen(false) }

  const activeCount = ['cat', 'type', 'size', 'min'].filter(k => params.get(k)).length

  const filterSections = (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Category</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => updateParam('cat', cat)}
              className="px-3 py-1 text-sm border rounded transition-colors"
              style={params.get('cat') === cat ? activeStyle : idleStyle}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Type */}
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Type</h3>
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => (
            <button key={t.value} onClick={() => updateParam('type', t.value)}
              className="px-3 py-1 text-sm border rounded transition-colors"
              style={params.get('type') === t.value ? activeStyle : idleStyle}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(size => (
            <button key={size} onClick={() => updateParam('size', size)}
              className="px-3 py-1 text-sm border rounded transition-colors"
              style={params.get('size') === size ? activeStyle : idleStyle}>
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Price</h3>
        <div className="space-y-2">
          {PRICE_RANGES.map(range => (
            <button key={range.label} onClick={() => setPrice(range.min, range.max)}
              className="block text-sm text-left hover:opacity-70 transition-opacity"
              style={{ color: params.get('min') === range.min ? '#A68B6E' : undefined }}>
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar (md and up) ── */}
      <div className="hidden md:block space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm uppercase tracking-wider">Filters</h3>
          <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-700">Clear all</button>
        </div>
        {filterSections}
      </div>

      {/* ── Mobile: pill button ── */}
      <div className="md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border rounded-full text-sm font-medium transition-colors"
          style={activeCount > 0
            ? { backgroundColor: '#1C1C1C', borderColor: '#1C1C1C', color: 'white' }
            : { borderColor: '#D1D5DB', color: '#374151' }}
        >
          <SlidersHorizontal size={14} />
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </button>
      </div>

      {/* ── Mobile: bottom drawer ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl md:hidden overflow-y-auto"
            style={{ maxHeight: '82vh' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>

            <div className="px-5 pb-6 pt-3">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-semibold text-base uppercase tracking-wider">Filters</h3>
                <button onClick={() => setDrawerOpen(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              {filterSections}

              {/* Action buttons */}
              <div className="flex gap-3 mt-7">
                <button
                  onClick={clearAll}
                  className="flex-1 py-3 border text-sm font-semibold rounded tracking-wide"
                  style={{ borderColor: '#D1D5DB', color: '#374151' }}
                >
                  Clear All
                </button>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex-1 py-3 text-sm font-semibold rounded text-white tracking-wide"
                  style={{ backgroundColor: '#1C1C1C' }}
                >
                  Show Results
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
