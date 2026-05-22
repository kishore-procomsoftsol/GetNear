'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type RatingSize = 'sm' | 'md' | 'lg'
type RatingMode = 'display' | 'input'

interface RatingStarsProps {
  rating: number
  maxRating?: number
  size?: RatingSize
  mode?: RatingMode
  onChange?: (rating: number) => void
  className?: string
}

const sizeClasses: Record<RatingSize, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

export function RatingStars({
  rating,
  maxRating = 5,
  size = 'sm',
  mode = 'display',
  onChange,
  className,
}: RatingStarsProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  const displayRating = hovered !== null ? hovered : rating
  const roundedRating = Math.round(displayRating)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, starValue: number) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onChange?.(starValue)
    }
  }

  if (mode === 'display') {
    return (
      <div
        className={cn('inline-flex items-center gap-0.5', sizeClasses[size], className)}
        aria-label={`Rating: ${rating} out of ${maxRating}`}
        role="img"
      >
        {Array.from({ length: maxRating }, (_, i) => {
          const starValue = i + 1
          const filled = starValue <= Math.round(rating)
          return (
            <span
              key={starValue}
              className={filled ? 'text-amber-400' : 'text-gray-300'}
              aria-hidden="true"
            >
              {filled ? '★' : '☆'}
            </span>
          )
        })}
      </div>
    )
  }

  // Input mode
  return (
    <div
      className={cn('inline-flex items-center gap-0.5', sizeClasses[size], className)}
      role="group"
      aria-label={`Rating: ${rating} out of ${maxRating}`}
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: maxRating }, (_, i) => {
        const starValue = i + 1
        const filled = starValue <= roundedRating
        return (
          <button
            key={starValue}
            type="button"
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => setHovered(starValue)}
            onKeyDown={(e) => handleKeyDown(e, starValue)}
            className={cn(
              'cursor-pointer transition-colors leading-none',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-sm',
              filled ? 'text-amber-400' : 'text-gray-300',
              'hover:text-amber-400'
            )}
            aria-label={`Rate ${starValue} out of ${maxRating}`}
            aria-pressed={starValue === rating}
          >
            {filled ? '★' : '☆'}
          </button>
        )
      })}
    </div>
  )
}
