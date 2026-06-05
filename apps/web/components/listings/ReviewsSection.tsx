'use client'

import * as React from 'react'
import Link from 'next/link'
import apiClient from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { ReviewCard } from './ReviewCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewsSectionProps {
  businessId: string
  reviewCount: number
  slug: string
}

interface Review {
  id: string
  rating: number
  text: string | null
  created_at: string
  users: {
    id: string
    name: string
    avatar_url: string | null
  }
}

// ---------------------------------------------------------------------------
// Skeleton Placeholder
// ---------------------------------------------------------------------------

function ReviewCardSkeleton() {
  return (
    <div className="flex gap-3 p-4 rounded-xl border border-gray-200 bg-white">
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ReviewsSection Component
// ---------------------------------------------------------------------------

export function ReviewsSection({ businessId, reviewCount, slug }: ReviewsSectionProps) {
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    apiClient
      .get<{ data: Review[] }>(`/businesses/${businessId}/reviews?limit=3`, {
        signal: controller.signal,
      })
      .then((res) => {
        setReviews(res.data.data ?? [])
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        clearTimeout(timeoutId)
        setLoading(false)
      })

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [businessId])

  // Hide entire section on error or timeout
  if (error) return null

  // Loading state — show skeleton placeholders
  if (loading) {
    return (
      <section className="space-y-4" aria-label="Reviews loading">
        <h2 className="text-lg font-semibold text-gray-900">What people say</h2>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ReviewCardSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  // No reviews placeholder
  if (reviews.length === 0) {
    return (
      <section className="space-y-4" aria-label="Reviews">
        <h2 className="text-lg font-semibold text-gray-900">What people say</h2>
        <div className="text-center py-8 border border-gray-200 rounded-xl bg-white">
          <p className="text-sm text-gray-500">
            No reviews yet. Be the first to leave a review!
          </p>
        </div>
      </section>
    )
  }

  // Render reviews
  return (
    <section className="space-y-4" aria-label="Reviews">
      <h2 className="text-lg font-semibold text-gray-900">What people say</h2>
      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
      {reviewCount > 3 && (
        <Link
          href={`/listing/${slug}/reviews`}
          className="inline-block text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all reviews →
        </Link>
      )}
    </section>
  )
}
