'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { Search } from 'lucide-react'

export default function ShopSearchBar() {
  const router = useRouter()
  const params = useSearchParams()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (value: string) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const p = new URLSearchParams(params.toString())
      if (value.trim()) {
        p.set('q', value.trim())
      } else {
        p.delete('q')
      }
      router.push(`/shop?${p.toString()}`)
    }, 300)
  }

  return (
    <div className="relative max-w-sm">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#A68B6E' }} />
      <input
        type="search"
        defaultValue={params.get('q') || ''}
        onChange={e => handleChange(e.target.value)}
        placeholder="Search products…"
        className="w-full pl-9 pr-3 py-2 text-sm border rounded outline-none"
        style={{ borderColor: '#E8DDD4', backgroundColor: 'white' }}
      />
    </div>
  )
}
