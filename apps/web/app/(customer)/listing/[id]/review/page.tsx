'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { RatingStars } from '@/components/shared/RatingStars'
import apiClient from '@/lib/api'

const reviewSchema = z.object({
  text: z.string().max(1000).optional(),
})

export default function WriteReviewPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [rating, setRating] = React.useState(0)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const form = useForm({ resolver: zodResolver(reviewSchema), defaultValues: { text: '' } })

  const onSubmit = async (values: { text?: string }) => {
    if (rating === 0) { setError('Please select a rating'); return }
    setSubmitting(true)
    setError(null)
    try {
      await apiClient.post(`/businesses/${id}/reviews`, { rating, text: values.text || undefined })
      router.push(`/listing/${id}/reviews`)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'REVIEW_EXISTS') setError('You have already reviewed this business.')
      else setError(err?.response?.data?.error?.message ?? 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-4 pb-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-gray-100" aria-label="Go back">
          <ArrowLeft className="h-5 w-5 text-dark" />
        </button>
        <h1 className="text-lg font-semibold text-dark">Write a Review</h1>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-sm text-muted">How would you rate this business?</p>
        <RatingStars rating={rating} size="lg" mode="input" onChange={setRating} />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-dark mb-1 block">Your review (optional)</label>
          <textarea
            {...form.register('text')}
            maxLength={1000}
            rows={5}
            placeholder="Share your experience…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-dark placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          <p className="text-xs text-muted mt-1">{form.watch('text')?.length ?? 0}/1000</p>
        </div>

        {error && <p className="text-sm text-danger rounded-lg bg-red-50 px-3 py-2" role="alert">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Review'}
        </Button>
      </form>
    </div>
  )
}
