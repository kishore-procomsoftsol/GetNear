'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Star } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingStars } from '@/components/shared/RatingStars'
import apiClient from '@/lib/api'

interface UserReview {
  id: string
  rating: number
  text: string | null
  status: string
  created_at: string
  businesses: {
    id: string
    name: string
    slug: string | null
  } | null
}

export default function MyReviewsPage() {
  const router = useRouter()
  const [reviews, setReviews] = React.useState<UserReview[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient
      .get<{ data: UserReview[] }>('/user/reviews')
      .then((res) => setReviews(res.data.data ?? []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-0 pb-24 bg-gray-50 min-h-dvh">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1" aria-label="Go back">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">My Reviews</h1>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}

        {!loading && reviews.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-3">
              <Star className="h-6 w-6 text-yellow-500" />
            </div>
            <p className="text-sm text-gray-500">No reviews yet.</p>
            <p className="text-xs text-gray-400 mt-1">Your reviews will appear here after you rate a business.</p>
          </div>
        )}

        {!loading &&
          reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                if (review.businesses) {
                  router.push(`/listing/${review.businesses.slug || review.businesses.id}`)
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {review.businesses?.name ?? 'Unknown business'}
                </p>
                <span className="text-[11px] text-gray-400">
                  {new Date(review.created_at).toLocaleDateString()}
                </span>
              </div>
              <RatingStars rating={review.rating} size="sm" mode="display" />
              {review.text && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{review.text}</p>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
