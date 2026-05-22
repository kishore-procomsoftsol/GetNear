'use client'

import * as React from 'react'
import Image from 'next/image'
import { motion, type PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhotoGalleryPhoto {
  id: string
  url: string
  is_primary: boolean
  display_order: number
}

export interface PhotoGalleryProps {
  photos: PhotoGalleryPhoto[]
  businessName: string
  className?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SWIPE_OFFSET_THRESHOLD = 50
const SWIPE_VELOCITY_THRESHOLD = 500

/**
 * Determines the next photo index based on drag offset and velocity.
 * Exported for property-based testing.
 */
export function handleDragEnd(
  offsetX: number,
  velocityX: number,
  photoCount: number,
  currentIndex: number
): number {
  let newIndex = currentIndex

  if (offsetX < -SWIPE_OFFSET_THRESHOLD || velocityX < -SWIPE_VELOCITY_THRESHOLD) {
    // Swiped left → next photo
    newIndex = currentIndex + 1
  } else if (offsetX > SWIPE_OFFSET_THRESHOLD || velocityX > SWIPE_VELOCITY_THRESHOLD) {
    // Swiped right → previous photo
    newIndex = currentIndex - 1
  }

  // Clamp to valid range
  return Math.max(0, Math.min(newIndex, photoCount - 1))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PhotoGallery({ photos, businessName, className }: PhotoGalleryProps) {
  const [photoIndex, setPhotoIndex] = React.useState(0)

  // Empty state: gradient placeholder
  if (photos.length === 0) {
    return (
      <div
        className={cn('relative w-full bg-gradient-to-br from-primary/20 to-blue-100', className)}
        role="region"
        aria-label={`Photo gallery for ${businessName}`}
      />
    )
  }

  // Single photo: no swipe, no dots
  if (photos.length === 1) {
    return (
      <div
        className={cn('relative w-full overflow-hidden', className)}
        role="region"
        aria-label={`Photo gallery for ${businessName}`}
      >
        <Image
          src={photos[0].url}
          alt={`${businessName} photo`}
          fill
          className="object-cover"
          sizes="100vw"
        />
      </div>
    )
  }

  // Multiple photos: swipeable gallery
  const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newIndex = handleDragEnd(
      info.offset.x,
      info.velocity.x,
      photos.length,
      photoIndex
    )
    setPhotoIndex(newIndex)
  }

  return (
    <div
      className={cn('relative w-full overflow-hidden', className)}
      role="region"
      aria-label={`Photo gallery for ${businessName}`}
      aria-roledescription="carousel"
    >
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={onDragEnd}
        className="relative h-full w-full"
      >
        <Image
          src={photos[photoIndex].url}
          alt={`${businessName} photo ${photoIndex + 1} of ${photos.length}`}
          fill
          className="object-cover pointer-events-none"
          sizes="100vw"
        />
      </motion.div>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {photos.map((_, idx) => (
          <span
            key={idx}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors',
              idx === photoIndex ? 'bg-white' : 'bg-white/50'
            )}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}
