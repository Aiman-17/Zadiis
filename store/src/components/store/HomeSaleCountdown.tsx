'use client'
import { useState, useEffect } from 'react'

export default function HomeSaleCountdown({ endsAt }: { endsAt: string | null }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false })

  useEffect(() => {
    if (!endsAt) return
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setT({ d: 0, h: 0, m: 0, s: 0, expired: true }); return }
      setT({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (!endsAt || t.expired) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const units = t.d > 0
    ? [{ v: t.d, l: 'D' }, { v: t.h, l: 'H' }, { v: t.m, l: 'M' }, { v: t.s, l: 'S' }]
    : [{ v: t.h, l: 'H' }, { v: t.m, l: 'M' }, { v: t.s, l: 'S' }]

  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      <span className="text-xs uppercase tracking-widest mr-2" style={{ color: '#A68B6E' }}>Ends in</span>
      {units.map(({ v, l }, i) => (
        <span key={l} className="flex items-baseline">
          {i > 0 && <span className="text-gray-500 mx-0.5">:</span>}
          <span className="text-xl font-bold tabular-nums text-white">{pad(v)}</span>
          <span className="text-xs ml-px" style={{ color: '#A68B6E' }}>{l}</span>
        </span>
      ))}
    </div>
  )
}
