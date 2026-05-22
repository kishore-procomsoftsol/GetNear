'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { RatingStars } from '@/components/shared/RatingStars'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api'

interface Review {
  id: string
  rating: number
  text: string | null
  photos: string[] | null
  created_at: string
  users: { id: string; name: string | null; avatar_url: string | null } | null
}

export default function AllReviewsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [hasMore, setHasMore] = React.useState(false)

  const fetchReviews = async (pageNum: number) => {
    setLoading(true)
    try {
      const res = await apiClient.get<{ data: Review[]; meta: { hasNextPage: boolean } }>(`/businesses/${id}/reviews?page=${pageNum}&limit=20`)
      setReviews((prev) => pageNum === 1 ? res.data.data : [...prev, ...res.data.data])
      setHasMore(res.data.meta?.hasNextPage ?? false)
    } catch {}
    setLoading(false)
  }

  React.useEffect(() => { fetchReviews(1) }, [id])

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-gray-100" aria-label="Go back">
          <ArrowLeft className="h-5 w-5 text-dark" />
        </button>
        <h1 className="text-lg font-semibold text-dark">All Reviews</h1>
      </div>

      <Button variant="outline" onClick={() => router.push(`/listing/${id}/review`)}>Write a Review</Button>

      {loading && page === 1 && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}

      {reviews.map((r) => (
        <div key={r.id} className="border border-gray-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-dark">{r.users?.name ?? 'Anonymous'}</span>
            <RatingStars rating={r.rating} size="sm" mode="display" />
          </div>
          {r.text && <p className="text-sm text-muted">{r.text}</p>}
          <p className="text-xs text-muted mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
        </div>
      ))}

      {hasMore && !loading && (
        <Button variant="outline" onClick={() => { setPage(page + 1); fetchReviews(page + 1) }}>Load more</Button>
      )}

      {!loading && reviews.length === 0 && <p className="text-sm text-muted text-center py-8">No reviews yet. Be the first!</p>}
    </div>
  )
}
