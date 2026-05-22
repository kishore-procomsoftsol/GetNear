'use client'

import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { Heart, BadgeCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessCardProps {
  business: {
    id: string
    name: string
    slug?: string | null
    description?: string | null
    rating_avg?: number | null
    review_count?: number | null
    address?: string | null
    city?: string | null
    distance_m?: number | null
    is_sponsored?: boolean | null
    categories?: { name: string; icon?: string | null; color?: string | null } | null
    business_photos?: Array<{ url: string; is_primary: boolean; display_order?: number }> | null
    business_hours?: Array<{
      day: number
      open_time: string | null
      close_time: string | null
      is_closed: boolean
    }> | null
    offers?: Array<{ title: string; valid_until: string | null }> | null
  }
  onClick?: () => void
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  const km = meters / 1000
  return `${km.toFixed(1)} km`
}

function getWalkingTime(meters: number): string {
  const minutes = Math.round(meters / 80) // ~80m per minute walking
  return `${minutes} min`
}

function getOpenStatus(
  hours: Array<{
    day: number
    open_time: string | null
    close_time: string | null
    is_closed: boolean
  }> | null | undefined
): 'open' | 'closed' | null {
  if (!hours || hours.length === 0) return null

  const now = new Date()
  const currentDay = now.getDay()
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const todayHours = hours.find((h) => h.day === currentDay)
  if (!todayHours) return null

  if (todayHours.is_closed) return 'closed'

  const { open_time, close_time } = todayHours
  if (!open_time || !close_time) return null

  if (currentHHMM >= open_time && currentHHMM <= close_time) {
    return 'open'
  }
  return 'closed'
}

function getClosesSoonStatus(
  hours: Array<{
    day: number
    open_time: string | null
    close_time: string | null
    is_closed: boolean
  }> | null | undefined
): boolean {
  if (!hours || hours.length === 0) return false

  const now = new Date()
  const currentDay = now.getDay()
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const todayHours = hours.find((h) => h.day === currentDay)
  if (!todayHours) return false

  if (todayHours.is_closed) return false

  const { open_time, close_time } = todayHours
  if (!open_time || !close_time) return false

  // Check if currently open
  if (currentHHMM < open_time || currentHHMM > close_time) return false

  // Calculate minutes until closing
  const [closeHour, closeMin] = close_time.split(':').map(Number)
  const [currentHour, currentMin] = currentHHMM.split(':').map(Number)
  const closeMinutes = closeHour * 60 + closeMin
  const currentMinutes = currentHour * 60 + currentMin
  const minutesUntilClose = closeMinutes - currentMinutes

  return minutesUntilClose <= 60
}

function getPrimaryPhotoUrl(
  photos: Array<{ url: string; is_primary: boolean; display_order?: number }> | null | undefined
): string | null {
  if (!photos || photos.length === 0) return null
  const primary = photos.find((p) => p.is_primary)
  return primary?.url ?? photos[0]?.url ?? null
}

// ---------------------------------------------------------------------------
// BusinessCard — Horizontal Layout
// ---------------------------------------------------------------------------

export function BusinessCard({ business, onClick, className }: BusinessCardProps) {
  const photoUrl = getPrimaryPhotoUrl(business.business_photos)
  const openStatus = getOpenStatus(business.business_hours)
  const closesSoon = getClosesSoonStatus(business.business_hours)

  return (
    <article
      className={cn(
        'flex gap-3 p-3 rounded-xl border border-gray-200 bg-white shadow-sm',
        'cursor-pointer transition-shadow hover:shadow-md active:scale-[0.99]',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      aria-label={`View details for ${business.name}`}
    >
      {/* Left: Photo */}
      <div className="relative w-[100px] h-[100px] flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={`${business.name} photo`}
            fill
            sizes="100px"
            className="object-cover"
          />
        ) : (
          <div
            className="h-full w-full bg-gradient-to-br from-primary/20 to-blue-100"
            aria-hidden="true"
          />
        )}

        {/* Open/Closed badge overlay */}
        {openStatus && (
          <span
            className={cn(
              'absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase',
              openStatus === 'open'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            )}
          >
            {openStatus === 'open' ? 'Open' : 'Closed'}
          </span>
        )}

        {/* Closes Soon badge overlay */}
        {openStatus === 'open' && closesSoon && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-orange-500 text-white">
            Closes soon
          </span>
        )}

        {/* Heart/Save icon */}
        <button
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"
          onClick={(e) => { e.stopPropagation() }}
          aria-label="Save place"
        >
          <Heart className="h-3.5 w-3.5 text-gray-500" />
        </button>

        {/* Sponsored badge */}
        {business.is_sponsored && (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-yellow-400 px-1.5 py-0.5 text-[8px] font-semibold text-yellow-900">
            Ad
          </span>
        )}
      </div>

      {/* Right: Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        {/* Name + verified */}
        <div className="flex items-center gap-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {business.name}
          </h3>
          <BadgeCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
        </div>

        {/* Rating + category */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className="flex items-center gap-0.5">
            <span className="text-yellow-400 text-xs">★</span>
            <span className="text-xs font-semibold text-gray-900">
              {business.rating_avg ? business.rating_avg.toFixed(1) : '—'}
            </span>
          </div>
          {business.review_count != null && business.review_count > 0 && (
            <span className="text-[11px] text-gray-500">({business.review_count})</span>
          )}
          {business.categories && (
            <>
              <span className="text-gray-300 text-[10px]">•</span>
              <span className="text-[11px] text-gray-500 truncate">{business.categories.name}</span>
            </>
          )}
        </div>

        {/* Price indicator + distance */}
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[11px] text-gray-500">₹</span>
          {business.distance_m != null && (
            <>
              <span className="text-gray-300 text-[10px]">•</span>
              <span className="text-[11px] text-gray-500">{formatDistance(business.distance_m)}</span>
            </>
          )}
        </div>

        {/* Walking time */}
        {business.distance_m != null && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[11px] font-medium text-amber-500">
              🚶 {getWalkingTime(business.distance_m)}
            </span>
            <span className="text-[10px] text-gray-400">
              ({formatDistance(business.distance_m)})
            </span>
          </div>
        )}
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// BusinessCardSkeleton — Horizontal Layout
// ---------------------------------------------------------------------------

export function BusinessCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-xl border border-gray-200 bg-white shadow-sm',
        className
      )}
      aria-busy="true"
      aria-label="Loading business card"
    >
      {/* Photo skeleton */}
      <Skeleton className="w-[100px] h-[100px] rounded-xl flex-shrink-0" />

      {/* Content skeleton */}
      <div className="flex-1 flex flex-col justify-between py-1">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
        <Skeleton className="h-3 w-2/5 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
    </div>
  )
}
