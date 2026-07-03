'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Phone,
  Navigation,
  Globe,
  Share2,
  Clock,
  MapPin,
  Star,
  ExternalLink,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RatingStars } from '@/components/shared/RatingStars'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaceReview {
  authorName: string
  rating: number
  text: string
  relativeTimeDescription: string
}

interface OpeningHours {
  openNow?: boolean
  weekdayText?: string[]
}

interface PlaceDetailsResult {
  placeId: string
  name: string
  address: string
  phone?: string
  website?: string
  rating?: number
  totalRatings?: number
  openingHours?: OpeningHours
  reviews?: PlaceReview[]
  photoReferences?: string[]
  businessStatus?: string
  types?: string[]
  location: { lat: number; lng: number }
}

interface PlaceDetailsResponse {
  data: PlaceDetailsResult
  error: null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

function getPhotoUrl(photoReference: string, maxWidth = 800): string {
  return `${API_URL}/places/photo?ref=${encodeURIComponent(photoReference)}&maxWidth=${maxWidth}`
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

/**
 * Listing detail page for Google Places.
 * Fetches place details from /places/:placeId and displays comprehensive info.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 10.1, 10.2, 10.3
 */
export default function PlaceDetailPage() {
  const { placeId } = useParams<{ placeId: string }>()
  const router = useRouter()

  const [place, setPlace] = React.useState<PlaceDetailsResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [notFound, setNotFound] = React.useState(false)

  React.useEffect(() => {
    if (!placeId) return

    setLoading(true)
    setNotFound(false)

    apiClient
      .get<PlaceDetailsResponse>(`/places/${encodeURIComponent(placeId)}`)
      .then((res) => {
        setPlace(res.data.data)
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setNotFound(true)
        } else {
          setNotFound(true)
        }
        setPlace(null)
      })
      .finally(() => setLoading(false))
  }, [placeId])

  // Handle share
  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: place?.name, url }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  // Not found state
  if (notFound || !place) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <span className="text-5xl mb-4" aria-hidden="true">📍</span>
        <p className="text-lg font-semibold text-gray-900">Place not found</p>
        <p className="text-sm text-gray-500 mt-1">
          The place you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link
          href="/"
          className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Go to Homepage
        </Link>
      </div>
    )
  }

  const photos = place.photoReferences ?? []
  const reviews = (place.reviews ?? []).slice(0, 5)

  return (
    <div className="flex flex-col pb-24 bg-white min-h-dvh">
      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="relative">
          <div className="overflow-x-auto flex snap-x snap-mandatory scrollbar-hide">
            {photos.map((ref, i) => (
              <div
                key={ref}
                className="snap-center flex-shrink-0 w-full h-64 sm:h-80"
              >
                <img
                  src={getPhotoUrl(ref, 800)}
                  alt={`${place.name} photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                />
              </div>
            ))}
          </div>

          {/* Photo counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 right-3 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
              {photos.length} photos
            </div>
          )}

          {/* Back button overlay */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-gray-900" />
            </button>
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
              aria-label="Share"
            >
              <Share2 className="h-4 w-4 text-gray-900" />
            </button>
          </div>
        </div>
      )}

      {/* No photos — show back button inline */}
      {photos.length === 0 && (
        <div className="flex items-center gap-3 px-4 pt-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-gray-700" />
          </button>
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center ml-auto"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4 text-gray-700" />
          </button>
        </div>
      )}

      <div className="px-4 pt-4 flex flex-col gap-5">
        {/* Name and rating */}
        <div>
          <h1 className="text-xl font-bold text-gray-900">{place.name}</h1>

          {/* Rating */}
          {place.rating != null && (
            <div className="flex items-center gap-2 mt-2">
              <RatingStars rating={place.rating} size="md" mode="display" />
              <span className="text-sm font-medium text-gray-700">
                {place.rating.toFixed(1)}
              </span>
              {place.totalRatings != null && (
                <span className="text-sm text-gray-500">
                  ({place.totalRatings} review{place.totalRatings !== 1 ? 's' : ''})
                </span>
              )}
            </div>
          )}

          {/* Open/Closed status */}
          {place.openingHours?.openNow != null && (
            <div className="mt-2">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
                  place.openingHours.openNow
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                )}
              >
                {place.openingHours.openNow ? 'Open now' : 'Closed'}
              </span>
            </div>
          )}

          {/* Types / category */}
          {place.types && place.types.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 mt-2">
              {place.types.slice(0, 3).map((type) => (
                <span
                  key={type}
                  className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs"
                >
                  {type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Address */}
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">{place.address}</p>
        </div>

        {/* Contact actions */}
        <div className="flex items-center gap-2">
          {place.phone && (
            <a
              href={`tel:${place.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Phone className="h-4 w-4 text-primary" />
              Call
            </a>
          )}
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Navigation className="h-4 w-4 text-primary" />
            Directions
          </a>
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Globe className="h-4 w-4 text-primary" />
              Website
            </a>
          )}
        </div>

        {/* Phone number display */}
        {place.phone && (
          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <a
              href={`tel:${place.phone}`}
              className="text-sm text-primary font-medium hover:underline"
            >
              {place.phone}
            </a>
          </div>
        )}

        {/* Website display */}
        {place.website && (
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary font-medium hover:underline truncate"
            >
              {place.website.replace(/^https?:\/\//, '')}
              <ExternalLink className="inline h-3 w-3 ml-1" />
            </a>
          </div>
        )}

        {/* Opening hours */}
        {place.openingHours?.weekdayText && place.openingHours.weekdayText.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <h2 className="text-sm font-bold text-gray-900">Opening Hours</h2>
            </div>
            <div className="ml-7 space-y-1.5">
              {place.openingHours.weekdayText.map((text, i) => {
                const [day, ...timeParts] = text.split(': ')
                const time = timeParts.join(': ')
                return (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-500">{day}</span>
                    <span className="text-gray-900 font-medium">{time}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-3">
              Reviews ({reviews.length})
            </h2>
            <div className="space-y-4">
              {reviews.map((review, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-gray-100 p-3"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-900">
                      {review.authorName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {review.relativeTimeDescription}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }, (_, starIdx) => (
                      <Star
                        key={starIdx}
                        className={cn(
                          'h-3.5 w-3.5',
                          starIdx < review.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-gray-300'
                        )}
                      />
                    ))}
                  </div>
                  {review.text && (
                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
                      {review.text}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Directions button at bottom */}
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Navigation className="h-4 w-4" />
          Get Directions
        </a>
      </div>
    </div>
  )
}
