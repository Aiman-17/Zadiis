'use client'
import { useState } from 'react'

const RETURN_REASONS = [
  { value: 'wrong_size',      label: 'Wrong size received' },
  { value: 'defective_item',  label: 'Item is defective or damaged' },
  { value: 'wrong_item_sent', label: 'Wrong item was sent' },
  { value: 'changed_mind',    label: 'Changed my mind' },
  { value: 'other',           label: 'Other' },
]

type Form = {
  order_number:     string
  customer_email:   string
  customer_name:    string
  reason:           string
  notes:            string
  request_type:     'return' | 'exchange'
  exchange_details: string
}

export default function ReturnRequestForm() {
  const [form, setForm] = useState<Form>({
    order_number: '', customer_email: '', customer_name: '', reason: '', notes: '',
    request_type: 'return', exchange_details: '',
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
      const body = form.request_type === 'exchange'
        ? {
            order_number:     form.order_number,
            customer_email:   form.customer_email,
            customer_name:    form.customer_name,
            reason:           'exchange',
            notes:            form.notes,
            request_type:     'exchange',
            exchange_details: form.exchange_details,
          }
        : { ...form, request_type: 'return' }

      const res  = await fetch('/api/requests/return', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
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
    const isExchange = form.request_type === 'exchange'
    return (
      <div className="text-center py-10">
        <div style={{ fontSize: 56, lineHeight: 1 }}>✓</div>
        <h3 className="text-xl mt-5 mb-3" style={{ fontFamily: 'Playfair Display, serif', color: '#1C1C1C' }}>
          {isExchange ? 'Exchange Request Received' : 'Return Request Received'}
        </h3>
        <p style={{ color: '#6B7280', maxWidth: 420, margin: '0 auto' }}>
          {isExchange ? (
            <>We have received your exchange request for order{' '}
            <strong style={{ color: '#1C1C1C' }}>{form.order_number}</strong>.
            Our team will prepare your replacement and you will receive an email when it is dispatched.
            Please do not send back the original item until we confirm.</>
          ) : (
            <>We have received your return request for order{' '}
            <strong style={{ color: '#1C1C1C' }}>{form.order_number}</strong>.
            Our team will respond to <strong style={{ color: '#1C1C1C' }}>{form.customer_email}</strong> within 24 hours with next steps.
            Please do not ship anything until you hear from us.</>
          )}
        </p>
      </div>
    )
  }

  const inputStyle  = { borderColor: '#E8DDD4', outline: 'none' } as React.CSSProperties
  const isExchange  = form.request_type === 'exchange'
  const canSubmit   = form.order_number && form.customer_email &&
    (isExchange ? form.exchange_details : form.reason)

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">

      {/* Request type */}
      <div>
        <label className="block text-sm font-medium mb-2">Request Type *</label>
        <div className="space-y-2">
          {[
            { value: 'return',   label: 'Return my item' },
            { value: 'exchange', label: 'Exchange for a different size or color (same product)' },
          ].map(opt => (
            <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio" name="request_type" value={opt.value}
                checked={form.request_type === opt.value}
                onChange={() => setForm(p => ({
                  ...p,
                  request_type:     opt.value as 'return' | 'exchange',
                  reason:           '',
                  exchange_details: '',
                }))}
                style={{ accentColor: '#A68B6E' }}
              />
              <span className="text-sm">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

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

      {isExchange ? (
        <div>
          <label className="block text-sm font-medium mb-1.5">What would you like instead? *</label>
          <textarea
            placeholder="e.g. Same abaya in Size Large, Black — or — The blue floral kurta in Size Medium"
            value={form.exchange_details} onChange={set('exchange_details')} rows={3}
            className="w-full border rounded-md px-3 py-2.5 text-sm resize-none"
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            Describe the size, color, or variant you'd like as your replacement
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-2">Reason for Return *</label>
          <div className="space-y-2">
            {RETURN_REASONS.map(r => (
              <label key={r.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio" name="return_reason" value={r.value}
                  checked={form.reason === r.value}
                  onChange={() => setForm(p => ({ ...p, reason: r.value }))}
                  style={{ accentColor: '#A68B6E' }}
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1.5">Additional Details</label>
        <textarea
          placeholder={isExchange
            ? 'Any additional information? (optional)'
            : 'Please describe the issue in detail (optional)'}
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
        disabled={loading || !canSubmit}
        className="w-full py-3 text-sm font-medium rounded-md transition-opacity"
        style={{
          backgroundColor: '#1C1C1C',
          color: 'white',
          opacity: (loading || !canSubmit) ? 0.45 : 1,
        }}
      >
        {loading ? 'Submitting…' : isExchange ? 'Submit Exchange Request' : 'Submit Return Request'}
      </button>
    </form>
  )
}
