'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Review } from '@/types'

export default function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: (r: Review) => void }) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!rating) { setError('Please select a star rating'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: name, rating, comment }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to submit'); setSubmitting(false); return }
    onSubmitted(data)
    setDone(true)
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="border rounded-lg p-4 text-center text-sm" style={{ borderColor: '#E8DDD4', color: '#A68B6E' }}>
        Thank you for your review!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3" style={{ borderColor: '#E8DDD4' }}>
      <p className="font-medium text-sm">Write a Review</p>

      {/* Star picker */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => { setRating(star); setError('') }}
          >
            <svg width={28} height={28} viewBox="0 0 24 24"
              fill={star <= (hovered || rating) ? '#A68B6E' : 'none'}
              stroke="#A68B6E" strokeWidth="1.5"
              className="transition-colors"
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        ))}
      </div>

      <Input
        placeholder="Your name"
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        className="text-sm"
      />

      <textarea
        placeholder="Share your experience (optional)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
        style={{ borderColor: '#E8DDD4' }}
      />

      {error && <p className="text-xs" style={{ color: '#B91C1C' }}>{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full text-white rounded-none text-sm"
        style={{ backgroundColor: '#1C1C1C' }}
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </Button>

      <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
        🔒 Your privacy matters to us. We only display your name and review — your personal information is never shared.
      </p>
    </form>
  )
}
