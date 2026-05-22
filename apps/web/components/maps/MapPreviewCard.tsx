'use client'

import * as React from 'react'
import Image from 'next/image'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { X, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MapPreviewCardProps {
  business: {
    id: string
    name: string
    rating_avg: number | null
    distance_m: number | null
    business_photos: Array<{ url: string; is_primary: boolean }> | null
    business_hours: Array<{
      day: number
      open_time: string | null
      close_time: string | null
      is_closed: boolean
    }> | null
    categories: { name: string } | null
  }
  onTap: () => void
  onClose: () => void
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

function getPrimaryPhotoUrl(
  photos: Array<{ url: string; is_primary: boolean }> | null | undefined
): string | null {
  if (!photos || photos.length === 0) return null
  const primary = photos.find((p) => p.is_primary)
  return primary?.url ?? photos[0]?.url ?? null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * MapPreviewCard — Bottom preview card shown when a map pin is selected.
 * Animates in from the bottom, supports swipe-down to dismiss.
 *
 * Requirements: 5.1, 5.2, 5.3
 */
export function MapPreviewCard({ business, onTap, onClose }: MapPreviewCardProps) {
  const photoUrl = getPrimaryPhotoUrl(business.business_photos)
  const openStatus = getOpenStatus(business.business_hours)

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Dismiss if dragged down far enough or with enough velocity
    if (info.offset.y > 50 || info.velocity.y > 300) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key={business.id}
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.3}
        onDragEnd={handleDragEnd}
        className={cn(
          'fixed bottom-0 inset-x-0 z-50',
          'bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]',
          'px-4 pt-3 pb-5'
        )}
        onClick={onTap}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onTap()
          }
        }}
        aria-label={`Preview card for ${business.name}. Tap to view details.`}
      >
        {/* Drag handle */}
        <div className="flex justify-center mb-3" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className={cn(
            'absolute top-3 right-3 w-7 h-7 rounded-full',
            'bg-gray-100 flex items-center justify-center',
            'hover:bg-gray-200 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1'
          )}
          aria-label="Close preview"
        >
          <X className="h-3.5 w-3.5 text-gray-600" />
        </button>

        {/* Card content */}
        <div className="flex gap-3">
          {/* Photo thumbnail */}
          <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={`${business.name} photo`}
                fill
                sizes="64px"
                className="object-cover"
              />
            ) : (
              <div
                className="h-full w-full bg-gradient-to-br from-primary/20 to-blue-100"
                aria-hidden="true"
              />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            {/* Business name */}
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {business.name}
            </h3>

            {/* Rating + category */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold text-gray-900">
                  {business.rating_avg ? business.rating_avg.toFixed(1) : '—'}
                </span>
              </div>
              {business.categories && (
                <>
                  <span className="text-gray-300 text-[10px]">•</span>
                  <span className="text-[11px] text-gray-500 truncate">
                    {business.categories.name}
                  </span>
                </>
              )}
            </div>

            {/* Distance + open/closed status */}
            <div className="flex items-center gap-1.5">
              {business.distance_m != null && (
                <span className="text-[11px] text-gray-500">
                  {formatDistance(business.distance_m)}
                </span>
              )}
              {openStatus && (
                <>
                  {business.distance_m != null && (
                    <span className="text-gray-300 text-[10px]">•</span>
                  )}
                  <span
                    className={cn(
                      'text-[11px] font-medium',
                      openStatus === 'open' ? 'text-emerald-600' : 'text-red-500'
                    )}
                  >
                    {openStatus === 'open' ? 'Open' : 'Closed'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
