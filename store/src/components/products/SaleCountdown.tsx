'use client'
import { useState, useEffect } from 'react'

export default function SaleCountdown({ endsAt }: { endsAt: string }) {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0, expired: false })

  useEffect(() => {
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

  if (t.expired) {
    return <p className="text-sm" style={{ color: '#A68B6E' }}>Sale has ended</p>
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  const units = t.d > 0
    ? [{ v: t.d, l: 'd' }, { v: t.h, l: 'h' }, { v: t.m, l: 'm' }, { v: t.s, l: 's' }]
    : [{ v: t.h, l: 'h' }, { v: t.m, l: 'm' }, { v: t.s, l: 's' }]

  return (
    <div className="flex items-center justify-center gap-3 text-white">
      <span className="text-xs uppercase tracking-widest" style={{ color: '#A68B6E' }}>Ends in</span>
      <div className="flex gap-2">
        {units.map(({ v, l }) => (
          <div key={l} className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums">{pad(v)}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
