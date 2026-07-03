'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Search, MapPin, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { useSearchStore } from '@/lib/stores/searchStore'
import { useLocationStore } from '@/lib/stores/locationStore'
import { useAuthStore } from '@/lib/stores/authStore'
import { BusinessCard, BusinessCardSkeleton } from '@/components/listings/BusinessCard'
import { LazyMapView } from '@/components/maps/LazyMapView'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface SearchResponse {
  data: PlaceSummary[]
  meta: { nextPageToken?: string }
  error: null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

  return { day: currentDay, open_time: '00:00', close_time: '23:59', is_closed: false }
}

// ---------------------------------------------------------------------------
// Category pills (mapped to Google place types)
// ---------------------------------------------------------------------------

const CATEGORY_PILLS = [
  { label: 'All', value: '' },
  { label: 'Cafe', value: 'cafe' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Bakery', value: 'bakery' },
  { label: 'Bar', value: 'bar' },
  { label: 'Gym', value: 'gym' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lat, lng, radius } = useLocationStore()
  const session = useAuthStore((s) => s.session)

  const [query, setQuery] = React.useState(searchParams.get('q') ?? '')
  const [submittedQuery, setSubmittedQuery] = React.useState(searchParams.get('q') ?? '')
  const [openNow, setOpenNow] = React.useState(false)
  const [selectedCategory, setSelectedCategory] = React.useState(searchParams.get('category') ?? '')
  const [results, setResults] = React.useState<PlaceSummary[]>([])
  const [loading, setLoading] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [nextPageToken, setNextPageToken] = React.useState<string | undefined>(undefined)

  // Debounce query input 400ms before auto-searching
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (query.trim()) {
        setSubmittedQuery(query.trim())
      }
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Fetch results when submittedQuery/filters/location change
  React.useEffect(() => {
    if (!submittedQuery) {
      setResults([])
      setNextPageToken(undefined)
      return
    }
    fetchResults(submittedQuery, undefined)
    recordSearchHistory(submittedQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submittedQuery, openNow, selectedCategory, lat, lng])

  /**
   * Fetch search results from /places/search.
   */
  async function fetchResults(searchQuery: string, pageToken: string | undefined) {
    if (!searchQuery.trim()) return

    if (pageToken) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setError(null)
      setResults([])
      setNextPageToken(undefined)
    }

    try {
      const params = new URLSearchParams({ q: searchQuery.trim() })

      if (lat != null && lng != null) {
        params.set('lat', String(lat))
        params.set('lng', String(lng))
        // Convert radius from km to meters
        params.set('radius', String(Math.min(radius * 1000, 50000)))
      }

      if (selectedCategory) params.set('type', selectedCategory)
      if (openNow) params.set('openNow', 'true')
      if (pageToken) params.set('pageToken', pageToken)

      const res = await apiClient.get<SearchResponse>(`/places/search?${params}`)
      const { data, meta } = res.data

      if (pageToken) {
        setResults((prev) => [...prev, ...data])
      } else {
        setResults(data)
      }
      setNextPageToken(meta.nextPageToken)
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        'Unable to search places. Please try again.'
      if (!pageToken) {
        setError(message)
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  /**
   * Record search history for authenticated users.
   * POST /user/search-history with { query, lat, lng }
   */
  async function recordSearchHistory(searchQuery: string) {
    if (!session?.access_token) return
    if (!searchQuery.trim()) return

    try {
      await apiClient.post('/user/search-history', {
        query: searchQuery.trim(),
        lat: lat ?? undefined,
        lng: lng ?? undefined,
      })
    } catch {
      // Silently fail — search history recording is non-blocking
    }
  }

  /**
   * Handle explicit search submission (e.g. pressing Enter).
   */
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      setSubmittedQuery(query.trim())
    }
  }

  /**
   * Load more results using nextPageToken.
   */
  function handleLoadMore() {
    if (nextPageToken && submittedQuery) {
      fetchResults(submittedQuery, nextPageToken)
    }
  }

  // Map results to the format expected by map view
  const mapPins = results.map((place) => ({
    id: place.placeId,
    lat: place.location.lat,
    lng: place.location.lng,
    name: place.name,
  }))

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* Top bar: back + search + map button */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-gray-700" />
          </button>

          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search restaurants, cafes..."
              aria-label="Search places"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSubmittedQuery('')
                  setResults([])
                  setNextPageToken(undefined)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              useSearchStore.getState().setViewMode('map')
              useSearchStore.getState().setResults(results.map(mapPlaceToBusinessCard) as any[], results.length)
              router.push('/search/map')
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-blue-50 transition-colors flex-shrink-0"
          >
            <MapPin className="h-3.5 w-3.5" />
            Map
          </button>
        </form>

        {/* Location bar */}
        <div className="flex items-center gap-2 mt-3 px-1">
          <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
          <span className="text-xs text-gray-600 truncate flex-1">
            {useLocationStore.getState().city || 'Current location'}
          </span>
          <button className="text-xs text-primary font-medium">Change</button>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-medium flex-shrink-0"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filter
          </button>
          <button
            onClick={() => setOpenNow(!openNow)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-colors',
              openNow ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-600'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Open now
          </button>
          <button
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 text-gray-600 bg-white flex-shrink-0"
          >
            Price
          </button>
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {CATEGORY_PILLS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-colors',
                selectedCategory === cat.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mini map preview */}
      {lat && lng && results.length > 0 ? (
        <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-gray-200 h-28">
          <LazyMapView
            markers={mapPins}
            center={{ lat, lng }}
            zoom={13}
            onMarkerClick={(id) => {
              router.push(`/listing/${id}`)
            }}
            className="h-28 rounded-none"
          />
        </div>
      ) : (
        <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-gray-200 bg-blue-50 h-28 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Map will appear with results</span>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between px-4 mt-3 mb-2">
        {!loading && results.length > 0 && (
          <p className="text-xs text-gray-500 font-medium">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
        )}
        {!loading && results.length === 0 && <span />}
        <button className="flex items-center gap-1 text-xs text-gray-500">
          Sort by: <span className="font-medium text-gray-700">Relevance</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="flex flex-col gap-3">
          {results.map((place) => (
            <BusinessCard
              key={place.placeId}
              business={mapPlaceToBusinessCard(place)}
              onClick={() => router.push(`/listing/${place.placeId}`)}
            />
          ))}

          {/* Loading skeletons */}
          {(loading || loadingMore) &&
            Array.from({ length: 4 }).map((_, i) => (
              <BusinessCardSkeleton key={`skeleton-${i}`} />
            ))}

          {/* Load More button for pagination */}
          {!loading && !loadingMore && nextPageToken && (
            <button
              onClick={handleLoadMore}
              className="w-full py-3 mt-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-primary hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              Load More
            </button>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4" aria-hidden="true">⚠️</span>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Something went wrong</h3>
              <p className="text-sm text-gray-500 max-w-xs">{error}</p>
              <button
                onClick={() => submittedQuery && fetchResults(submittedQuery, undefined)}
                className="mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && submittedQuery && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4" aria-hidden="true">🔍</span>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No results found</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                {!lat || !lng
                  ? 'Enable location to search nearby places.'
                  : 'Try a different search term or adjust your filters.'}
              </p>
            </div>
          )}

          {/* Initial state (no query) */}
          {!loading && !error && !submittedQuery && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4" aria-hidden="true">🗺️</span>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Search for places</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Type a query above to discover restaurants, cafes, and more nearby.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Map view button */}
      <button
        onClick={() => {
          useSearchStore.getState().setViewMode('map')
          useSearchStore.getState().setResults(results.map(mapPlaceToBusinessCard) as any[], results.length)
          router.push('/search/map')
        }}
        className="fixed bottom-20 right-4 z-20 flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-white text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors"
      >
        <MapPin className="h-4 w-4" />
        Map view
      </button>
    </div>
  )
}
