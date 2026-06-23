'use client'
import { useState, useEffect } from 'react'

export default function SaleCountdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ hours: h, minutes: m, seconds: s, expired: false })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (timeLeft.expired) {
    return <p className="text-sm" style={{ color: '#A68B6E' }}>Sale has ended</p>
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-center justify-center gap-3 text-white">
      <span className="text-xs uppercase tracking-widest" style={{ color: '#A68B6E' }}>Ends in</span>
      <div className="flex gap-2">
        {[{ v: timeLeft.hours, l: 'h' }, { v: timeLeft.minutes, l: 'm' }, { v: timeLeft.seconds, l: 's' }].map(({ v, l }) => (
          <div key={l} className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums">{pad(v)}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
