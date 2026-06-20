'use client'
import { useState } from 'react'
import ReviewList from './ReviewList'
import ReviewForm from './ReviewForm'
import type { Review } from '@/types'

export default function ReviewListWrapper({ productId, initialReviews }: { productId: string; initialReviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <ReviewList reviews={reviews} />
      <ReviewForm productId={productId} onSubmitted={r => setReviews(prev => [r, ...prev])} />
    </div>
  )
}
