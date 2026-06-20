import StarRating from './StarRating'
import type { Review } from '@/types'

export default function ReviewList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) {
    return <p className="text-sm text-center py-4" style={{ color: '#9CA3AF' }}>No reviews yet. Be the first!</p>
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StarRating rating={Math.round(avg)} size={20} />
        <span className="text-sm" style={{ color: '#4B5563' }}>
          {avg.toFixed(1)} out of 5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        </span>
      </div>
      {reviews.map(r => (
        <div key={r.id} className="border-b pb-4 last:border-0" style={{ borderColor: '#F0EAE3' }}>
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={r.rating} size={14} />
            <span className="text-sm font-medium">{r.customer_name}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>
              {new Date(r.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          {r.comment && <p className="text-sm" style={{ color: '#4B5563' }}>{r.comment}</p>}
        </div>
      ))}
    </div>
  )
}
