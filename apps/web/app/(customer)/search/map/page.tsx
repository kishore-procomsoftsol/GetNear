'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MapPin, MapPinOff, Navigation2, Crosshair } from 'lucide-react'
import { useSearchStore } from '@/lib/stores/searchStore'
import { useLocationStore } from '@/lib/stores/locationStore'
import { deriveMapPins } from '@/lib/utils/mapUtils'
import { MapView } from '@/components/maps/MapView'
import { MapPreviewCard } from '@/components/maps/MapPreviewCard'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Extended business shape returned by the search API (includes joined fields). */
interface SearchBusiness {
  id: string
  name: string
  rating_avg?: number | null
  distance_m?: number | null
  lat?: number | null
  lng?: number | null
  business_photos?: Array<{ url: string; is_primary: boolean }> | null
  business_hours?: Array<{
    day: number
    open_time: string | null
    close_time: string | null
    is_closed: boolean
  }> | null
  categories?: { name: string } | null
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-screen Map Page at /search/map.
 *
 * Displays search results as interactive pins on a Google Map.
 * Tapping a pin shows a preview card; tapping the card navigates to the listing.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.3
 */
export default function MapPage() {
  const router = useRouter()
  const { results } = useSearchStore()
  const { lat, lng } = useLocationStore()

  // Cast results to the extended search shape (API returns joined fields)
  const businesses = results as unknown as SearchBusiness[]

  const [selectedBusinessId, setSelectedBusinessId] = React.useState<string | null>(null)
  const [mapError, setMapError] = React.useState(false)
  const [retryKey, setRetryKey] = React.useState(0)

  // Derive map pins from search results
  const pins = React.useMemo(() => deriveMapPins(businesses), [businesses])

  // Find the selected business for the preview card
  const selectedBusiness = React.useMemo(() => {
    if (!selectedBusinessId) return null
    return businesses.find((b) => b.id === selectedBusinessId) ?? null
  }, [selectedBusinessId, businesses])

  // Handle marker click — show preview card
  const handleMarkerClick = React.useCallback((id: string) => {
    setSelectedBusinessId(id)
  }, [])

  // Handle preview card tap — navigate to listing
  const handlePreviewTap = React.useCallback(() => {
    if (selectedBusinessId) {
      router.push(`/listing/${selectedBusinessId}`)
    }
  }, [selectedBusinessId, router])

  // Handle preview card close
  const handlePreviewClose = React.useCallback(() => {
    setSelectedBusinessId(null)
  }, [])

  // Handle Google Maps load failure
  const handleMapError = React.useCallback(() => {
    setMapError(true)
  }, [])

  // Retry loading Google Maps
  const handleRetry = React.useCallback(() => {
    setMapError(false)
    setRetryKey((k) => k + 1)
  }, [])

  // If location is not available, show prompt
  if (lat == null || lng == null) {
    return (
      <div className="h-dvh w-full flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">
          Location access needed
        </h2>
        <p className="text-sm text-gray-500 text-center max-w-xs">
          Enable location access to see nearby businesses on the map.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-6 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  return (
    <div className="relative h-dvh w-full">
      {/* Full-screen map or error fallback */}
      {mapError ? (
        <div className="h-dvh w-full flex flex-col items-center justify-center bg-gray-50 px-6">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <MapPinOff className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2 text-center">
            Unable to load map
          </h2>
          <p className="text-sm text-gray-500 text-center max-w-xs">
            Something went wrong while loading Google Maps. Please check your connection and try again.
          </p>
          <button
            onClick={handleRetry}
            className="mt-6 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <MapView
          key={retryKey}
          markers={pins}
          center={{ lat, lng }}
          userLocation={{ lat, lng }}
          zoom={14}
          onMarkerClick={handleMarkerClick}
          onError={handleMapError}
          className="h-dvh w-full"
        />
      )}

      {/* Back button — fixed top-left */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-30 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5 text-gray-700" />
      </button>

      {/* My Location button — fixed top-right */}
      {!mapError && (
        <button
          onClick={() => {
            // Re-center map on user location (the MapView will handle this via center prop change)
            if (lat && lng) {
              window.dispatchEvent(new CustomEvent('recenter-map', { detail: { lat, lng } }))
            }
          }}
          className="fixed top-4 right-4 z-30 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label="Center on my location"
        >
          <Crosshair className="h-5 w-5 text-blue-600" />
        </button>
      )}

      {/* Preview card — shown when a pin is selected */}
      {selectedBusiness && (
        <MapPreviewCard
          business={{
            id: selectedBusiness.id,
            name: selectedBusiness.name,
            rating_avg: selectedBusiness.rating_avg ?? null,
            distance_m: selectedBusiness.distance_m ?? null,
            business_photos: selectedBusiness.business_photos ?? null,
            business_hours: selectedBusiness.business_hours ?? null,
            categories: selectedBusiness.categories ?? null,
          }}
          onTap={handlePreviewTap}
          onClose={handlePreviewClose}
        />
      )}

      {/* Directions button — shown when a business is selected */}
      {selectedBusiness && selectedBusiness.lat && selectedBusiness.lng && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${selectedBusiness.lat},${selectedBusiness.lng}&travelmode=walking`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-28 right-4 z-30 flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors"
        >
          <Navigation2 className="h-4 w-4" />
          Directions
        </a>
      )}
    </div>
  )
}
