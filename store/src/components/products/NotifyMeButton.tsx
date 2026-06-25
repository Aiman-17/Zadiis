'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function NotifyMeButton({ productId }: { productId: string }) {
  const [open, setOpen]       = useState(false)
  const [email, setEmail]     = useState('')
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  if (done) {
    return (
      <div className="rounded-lg p-4 text-center" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
        <p className="text-sm font-medium" style={{ color: '#166534' }}>✓ You&apos;re on the list!</p>
        <p className="text-xs mt-1" style={{ color: '#15803D' }}>
          We&apos;ll notify you the moment this is back in stock.
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 border text-sm font-medium uppercase tracking-widest transition-colors hover:bg-gray-50"
        style={{ borderColor: '#E8DDD4', color: '#1C1C1C' }}
      >
        Notify Me When Back in Stock
      </button>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, email, phone: phone || undefined }),
    })
    setDone(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
      <p className="text-sm font-medium">Get notified when this comes back</p>
      <Input
        type="email"
        required
        placeholder="Email address *"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="mt-1"
      />
      <Input
        type="tel"
        placeholder="WhatsApp number (optional)"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="mt-1"
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 text-white rounded-none text-sm uppercase tracking-widest"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          {loading ? 'Saving…' : 'Notify Me'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
          className="rounded-none text-sm"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
