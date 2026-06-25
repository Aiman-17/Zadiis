'use client'
import { useState } from 'react'

export const metadata = undefined

const REASONS = [
  { value: 'changed_mind',       label: 'I changed my mind' },
  { value: 'ordered_by_mistake', label: 'I ordered by mistake' },
  { value: 'found_better_price', label: 'I found a better price elsewhere' },
  { value: 'delivery_too_slow',  label: 'Delivery is taking too long' },
  { value: 'other',              label: 'Other' },
]

type Form = {
  order_number: string
  customer_email: string
  customer_name: string
  reason: string
  notes: string
}

export default function CancelOrderPage() {
  const [form, setForm] = useState<Form>({
    order_number: '', customer_email: '', customer_name: '', reason: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/requests/cancel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error || 'Something went wrong. Please try again.')
      else setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div style={{ fontSize: 56, lineHeight: 1 }}>✓</div>
        <h2 className="text-2xl mt-5 mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#1C1C1C' }}>
          Request Received
        </h2>
        <p style={{ color: '#6B7280' }}>
          We have received your cancellation request for order{' '}
          <strong style={{ color: '#1C1C1C' }}>{form.order_number}</strong>.
          Our team will review it and respond to{' '}
          <strong style={{ color: '#1C1C1C' }}>{form.customer_email}</strong> within 24 hours.
        </p>
      </div>
    )
  }

  const inputStyle = {
    borderColor: '#E8DDD4',
    outline: 'none',
  } as React.CSSProperties

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif', color: '#1C1C1C' }}>
        Cancel Your Order
      </h1>
      <p className="mb-8 text-sm" style={{ color: '#6B7280' }}>
        Need to cancel? Fill in the details below and we will get back to you within 24 hours.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">Order Number *</label>
          <input
            type="text" required placeholder="e.g. ZD-1023"
            value={form.order_number} onChange={set('order_number')}
            className="w-full border rounded-md px-3 py-2.5 text-sm"
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            Found in your order confirmation email
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Email Address *</label>
          <input
            type="email" required placeholder="your@email.com"
            value={form.customer_email} onChange={set('customer_email')}
            className="w-full border rounded-md px-3 py-2.5 text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Your Name</label>
          <input
            type="text" placeholder="Full name"
            value={form.customer_name} onChange={set('customer_name')}
            className="w-full border rounded-md px-3 py-2.5 text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Reason for Cancellation *</label>
          <div className="space-y-2">
            {REASONS.map(r => (
              <label key={r.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio" name="reason" value={r.value}
                  checked={form.reason === r.value}
                  onChange={() => setForm(p => ({ ...p, reason: r.value }))}
                  style={{ accentColor: '#A68B6E' }}
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Additional Notes</label>
          <textarea
            placeholder="Anything else we should know? (optional)"
            value={form.notes} onChange={set('notes')} rows={3}
            className="w-full border rounded-md px-3 py-2.5 text-sm resize-none"
            style={inputStyle}
          />
        </div>

        {error && (
          <div className="rounded-md px-4 py-3 text-sm"
            style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !form.reason || !form.order_number || !form.customer_email}
          className="w-full py-3 text-sm font-medium rounded-md transition-opacity"
          style={{
            backgroundColor: '#1C1C1C',
            color: 'white',
            opacity: (loading || !form.reason || !form.order_number || !form.customer_email) ? 0.45 : 1,
          }}
        >
          {loading ? 'Submitting…' : 'Submit Cancellation Request'}
        </button>
      </form>
    </div>
  )
}
