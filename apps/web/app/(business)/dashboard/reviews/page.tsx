'use client'

import * as React from 'react'
import { RatingStars } from '@/components/shared/RatingStars'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'

interface Review {
  id: string
  rating: number
  text: string | null
  created_at: string
  users: { id: string; name: string | null; avatar_url: string | null } | null
}

export default function BusinessReviewsPage() {
  const [reviews, setReviews] = React.useState<Review[]>([])
  const [loading, setLoading] = React.useState(true)
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null)
  const [replyText, setReplyText] = React.useState('')

  React.useEffect(() => {
    apiClient.get<{ data: Review[] }>('/dashboard/reviews')
      .then((res) => setReviews(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return
    await apiClient.post(`/dashboard/reviews/${reviewId}/reply`, { text: replyText.trim() }).catch(() => {})
    setReplyingTo(null)
    setReplyText('')
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-bold text-dark">Reviews</h1>

      {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

      {!loading && reviews.length === 0 && (
        <p className="text-sm text-muted text-center py-8">No reviews yet.</p>
      )}

      {!loading && reviews.map((r) => (
        <div key={r.id} className="border border-gray-100 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-dark">{r.users?.name ?? 'Anonymous'}</span>
              <RatingStars rating={r.rating} size="sm" mode="display" />
            </div>
            <span className="text-xs text-muted">{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
          {r.text && <p className="text-sm text-muted">{r.text}</p>}

          {replyingTo === r.id ? (
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button size="sm" onClick={() => handleReply(r.id)}>Reply</Button>
              <Button size="sm" variant="ghost" onClick={() => { setReplyingTo(null); setReplyText('') }}>Cancel</Button>
            </div>
          ) : (
            <button onClick={() => setReplyingTo(r.id)} className="text-xs text-primary font-medium mt-1">
              Reply
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
