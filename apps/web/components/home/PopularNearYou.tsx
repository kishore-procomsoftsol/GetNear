'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useLocationStore } from '@/lib/stores/locationStore'
import { BusinessCard, BusinessCardSkeleton } from '@/components/listings/BusinessCard'
import apiClient from '@/lib/api'

/**
 * Shape returned by the /places/nearby endpoint.
 */
interface PlaceSummary {
  placeId: string
  name: string
  address: string
  rating?: number
  totalRatings?: number
  photoReference?: string
  businessStatus?: string
  openNow?: boolean
  types?: string[]
  location: { lat: number; lng: number }
}

/**
 * Maps a PlaceSummary from the backend to the shape expected by BusinessCard.
 */
function mapPlaceToBusinessCard(place: PlaceSummary) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

  return {
    id: place.placeId,
    name: place.name,
    address: place.address,
    rating_avg: place.rating ?? null,
    review_count: place.totalRatings ?? null,
    categories: place.types?.[0]
      ? { name: place.types[0].replace(/_/g, ' ') }
      : null,
    business_photos: place.photoReference
      ? [{ url: `${apiBaseUrl}/places/photo?ref=${encodeURIComponent(place.photoReference)}`, is_primary: true }]
      : null,
    business_hours: place.openNow != null
      ? [buildCurrentDayHours(place.openNow)]
      : null,
  }
}

/**
 * Builds a minimal business_hours entry for the current day
 * so BusinessCard can display the open/closed badge.
 */
function buildCurrentDayHours(openNow: boolean) {
  const currentDay = new Date().getDay()

  if (!openNow) {
    return { day: currentDay, open_time: null, close_time: null, is_closed: true }
  }

  // Indicate open for the full day so the card shows "Open"
  return { day: currentDay, open_time: '00:00', close_time: '23:59', is_closed: false }
}

/**
 * Fetches and displays up to 10 places near the user's current location
 * using the /places/nearby API endpoint.
 * Requirements: 1.1, 1.3, 9.1, 11.1
 */
export function PopularNearYou() {
  const router = useRouter()
  const { lat, lng, radius } = useLocationStore()
  const [places, setPlaces] = React.useState<PlaceSummary[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fetched, setFetched] = React.useState(false)

  React.useEffect(() => {
    if (!lat || !lng) return

    setLoading(true)
    setError(null)

    // Convert radius from km to meters for the API
    const radiusMeters = Math.min(radius * 1000, 50000)

    apiClient
      .get<{ data: PlaceSummary[]; error: null }>(
        `/places/nearby?lat=${lat}&lng=${lng}&radius=${radiusMeters}`
      )
      .then((res) => {
        setPlaces(res.data.data ?? [])
      })
      .catch((err) => {
        const message =
          err?.response?.data?.error?.message ||
          'Unable to load nearby places. Please try again.'
        setError(message)
        setPlaces([])
      })
      .finally(() => {
        setLoading(false)
        setFetched(true)
      })
  }, [lat, lng, radius])

  if (!lat || !lng) return null

  return (
    <div className="flex flex-col gap-3">
      {/* Loading state */}
      {loading &&
        Array.from({ length: 3 }).map((_, i) => (
          <BusinessCardSkeleton key={i} />
        ))}

      {/* Error state */}
      {!loading && error && (
        <p className="text-sm text-red-500 text-center py-4">
          {error}
        </p>
      )}

      {/* Results */}
      {!loading &&
        !error &&
        places.map((place) => (
          <BusinessCard
            key={place.placeId}
            business={mapPlaceToBusinessCard(place)}
            onClick={() => router.push(`/listing/${place.placeId}`)}
          />
        ))}

      {/* Empty state */}
      {!loading && !error && fetched && places.length === 0 && (
        <p className="text-sm text-muted text-center py-4">
          No places found nearby. Try increasing your search radius.
        </p>
      )}
    </div>
  )
}
