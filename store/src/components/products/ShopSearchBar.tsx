'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Search } from 'lucide-react'

export default function ShopSearchBar() {
  const router = useRouter()
  const params = useSearchParams()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Latest query the user intends ('' = cleared); null = nothing pending.
  // router.push never cancels an in-flight navigation, so a slow filtered
  // response can resolve AFTER a later push and win (BUG-002). This ref lets
  // the effect below detect that out-of-order settle and correct it.
  const intent = useRef<string | null>(null)

  const handleChange = (value: string) => {
    if (timer.current) clearTimeout(timer.current)
    const q = value.trim()
    intent.current = q
    timer.current = setTimeout(() => {
      timer.current = null
      const p = new URLSearchParams(params.toString())
      if (q) {
        p.set('q', q)
      } else {
        p.delete('q')
      }
      router.push(`/shop?${p.toString()}`)
    }, 300)
  }

  useEffect(() => {
    // A navigation just settled. If a debounce is still pending it will push
    // the latest intent itself. Otherwise, a URL that disagrees with the
    // intent means a stale response resolved last — push the intent again.
    if (intent.current === null || timer.current) return
    const urlQ = (params.get('q') || '').trim()
    if (urlQ === intent.current) {
      intent.current = null
      return
    }
    const p = new URLSearchParams(params.toString())
    if (intent.current) {
      p.set('q', intent.current)
    } else {
      p.delete('q')
    }
    router.push(`/shop?${p.toString()}`)
  }, [params, router])

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
