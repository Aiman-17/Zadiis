'use client'
import { useState, useEffect } from 'react'

export default function ProductSaleUrgency({
  endsAt,
  stockQty,
}: {
  endsAt: string | null
  stockQty: number
}) {
  const [t, setT] = useState({ h: 0, m: 0, s: 0, expired: false })

  useEffect(() => {
    if (!endsAt) return
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setT({ h: 0, m: 0, s: 0, expired: true }); return }
      setT({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        expired: false,
      })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (t.expired) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const isLowStock = stockQty > 0 && stockQty <= 3

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 rounded"
      style={{ backgroundColor: '#1C1C1C' }}
    >
      {/* Left label */}
      <div>
        {isLowStock ? (
          <>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#A68B6E' }}>
              Almost Gone
            </p>
            <p className="text-sm font-medium text-white mt-0.5">
              Only {stockQty} left at this price
            </p>
          </>
        ) : (
          <>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#A68B6E' }}>
              Sale On Now
            </p>
            <p className="text-xs text-gray-400 mt-0.5">This offer expires when the timer ends</p>
          </>
        )}
      </div>

      {/* Right: countdown */}
      {endsAt && (
        <div className="flex items-center gap-1 shrink-0">
          {[{ v: t.h, l: 'H' }, { v: t.m, l: 'M' }, { v: t.s, l: 'S' }].map(({ v, l }, i) => (
            <span key={l} className="flex items-baseline">
              {i > 0 && <span className="text-gray-500 mx-0.5 font-light">:</span>}
              <span className="text-lg font-bold tabular-nums text-white">{pad(v)}</span>
              <span className="text-xs ml-px" style={{ color: '#A68B6E' }}>{l}</span>
            </span>
          ))}
        </div>
      )}
    </div>

    {/* Sale restock warning */}
    <div className="mt-2.5 pt-2.5 border-t" style={{ borderColor: '#2C2C2C' }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#A68B6E' }}>
        Sale stock will not be restocked.
      </p>
      <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
        Hurry up — grab yours before someone else does.
      </p>
    </div>
  )
}
