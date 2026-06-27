'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const TABS = [
  { key: 'trending',     label: 'Trending',    sub: 'Hot This Week', accent: '#C62828' },
  { key: 'new-arrivals', label: 'New Arrivals', sub: 'Just Launched', accent: '#059669' },
  { key: 'just-dropped', label: 'Just Dropped', sub: 'New In',        accent: '#1C1C1C' },
  { key: 'best-sellers', label: 'Best Sellers', sub: undefined,       accent: '#A68B6E' },
  { key: 'last-chance',  label: 'Last Chance',  sub: 'Almost Gone',   accent: '#C62828' },
] as const

export default function ProductSectionTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab')

  const handleTab = useCallback((key: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (activeTab === key) {
      params.delete('tab')
    } else {
      params.set('tab', key)
    }
    const qs = params.toString()
    router.push(`/shop${qs ? `?${qs}` : ''}`)
  }, [router, searchParams, activeTab])

  return (
    <div className="relative">
      <div className="flex gap-0 border-b overflow-x-auto scrollbar-none" style={{ borderColor: '#E8DDD4' }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => handleTab(tab.key)}
              className="shrink-0 px-3 md:px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
              style={isActive
                ? { color: tab.accent, borderBottom: `2px solid ${tab.accent}`, marginBottom: '-1px' }
                : { color: '#9CA3AF', borderBottom: '2px solid transparent', marginBottom: '-1px' }}
            >
              {tab.label}
              {tab.sub && isActive && (
                <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest hidden sm:inline" style={{ color: tab.accent }}>
                  {tab.sub}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="absolute right-0 top-0 bottom-[1px] w-8 pointer-events-none md:hidden"
        style={{ background: 'linear-gradient(to right, transparent, #FAF8F5)' }} />
    </div>
  )
}
