'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { RatingStars } from '@/components/shared/RatingStars'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReviewCardProps {
  review: {
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
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable relative date string (e.g., "2 days ago").
 */
function getRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? '' : 's'} ago`
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
}

/**
 * Truncates text to a maximum length, appending an ellipsis if truncated.
 */
export function truncateText(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

// ---------------------------------------------------------------------------
// ReviewCard Component
// ---------------------------------------------------------------------------

export function ReviewCard({ review, className }: ReviewCardProps) {
  const { users, rating, text, created_at } = review
  const initial = users.name.charAt(0).toUpperCase()

  return (
    <article
      className={cn(
        'flex gap-3 p-4 rounded-xl border border-gray-200 bg-white',
        className
      )}
      aria-label={`Review by ${users.name}`}
    >
      {/* Avatar */}
      <Avatar size="sm" className="flex-shrink-0">
        {users.avatar_url ? (
          <AvatarImage src={users.avatar_url} alt={`${users.name}'s avatar`} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
          {initial}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Name + Date */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {users.name}
          </span>
          <time
            className="text-xs text-gray-500 flex-shrink-0"
            dateTime={created_at}
          >
            {getRelativeDate(created_at)}
          </time>
        </div>

        {/* Rating */}
        <div className="mt-1">
          <RatingStars rating={rating} size="sm" />
        </div>

        {/* Review Text */}
        {text && (
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">
            {truncateText(text)}
          </p>
        )}
      </div>
    </article>
  )
}
