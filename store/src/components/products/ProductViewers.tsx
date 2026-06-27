'use client'
import { useState, useEffect } from 'react'

export default function ProductViewers() {
  const [viewers, setViewers] = useState<number | null>(null)

  useEffect(() => {
    const rand = () => Math.floor(Math.random() * 14) + 6 // 6–19
    setViewers(rand())
    const id = setInterval(() => {
      setViewers(v => {
        if (v === null) return rand()
        const delta = Math.random() > 0.5 ? 1 : -1
        return Math.min(19, Math.max(4, v + delta))
      })
    }, 45000)
    return () => clearInterval(id)
  }, [])

  if (viewers === null) return null

  return (
    <p className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: '#C62828' }} />
      {viewers} people viewing this right now
    </p>
  )
}
