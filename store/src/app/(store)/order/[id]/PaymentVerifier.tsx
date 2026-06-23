'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PaymentVerifier({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'confirmed' | 'pending'>('checking')

  useEffect(() => {
    let cancelled = false
    const verify = async () => {
      try {
        const res = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId }),
        })
        const data = await res.json()
        if (cancelled) return
        if (data.paid) {
          setStatus('confirmed')
          router.refresh()
        } else {
          setStatus('pending')
        }
      } catch {
        if (!cancelled) setStatus('pending')
      }
    }
    verify()
    return () => { cancelled = true }
  }, [orderId, router])

  if (status === 'checking') {
    return (
      <div className="border rounded-lg p-4" style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
        <p className="text-sm font-medium" style={{ color: '#92400E' }}>
          ⏳ Verifying your payment…
        </p>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm font-medium text-green-700">✓ Payment confirmed! Your order is being processed.</p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4" style={{ borderColor: '#FDE68A', backgroundColor: '#FFFBEB' }}>
      <p className="text-sm font-medium mb-1" style={{ color: '#92400E' }}>⏳ Confirming your payment…</p>
      <p className="text-sm" style={{ color: '#92400E' }}>
        If you completed payment on Safepay, confirmation usually arrives within a few seconds.
        Check your email for a confirmation message.
      </p>
    </div>
  )
}
