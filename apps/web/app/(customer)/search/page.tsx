'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Search, MapPin, SlidersHorizontal, X, Star, ChevronDown } from 'lucide-react'
import { useSearchStore } from '@/lib/stores/searchStore'
import { useLocationStore } from '@/lib/stores/locationStore'
import { BusinessCard, BusinessCardSkeleton } from '@/components/listings/BusinessCard'
import { LazyMapView } from '@/components/maps/LazyMapView'
import { deriveMapPins } from '@/lib/utils/mapUtils'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortOption = 'relevance' | 'distance' | 'rating' | 'newest'

interface SearchResult {
  id: string
  name: string
  slug?: string | null
  rating_avg?: number | null
  review_count?: number | null
  address?: string | null
  city?: string | null
  distance_m?: number | null
  categories?: { name: string; icon?: string | null; color?: string | null } | null
  business_photos?: Array<{ url: string; is_primary: boolean }> | null
  business_hours?: Array<{ day: number; open_time: string | null; close_time: string | null; is_closed: boolean }> | null
}

// ---------------------------------------------------------------------------
// Category pills
// ---------------------------------------------------------------------------

const CATEGORY_PILLS = [
  { label: 'All', value: '' },
  { label: 'Cafe', value: 'cafe' },
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Bakery', value: 'bakery' },
  { label: 'Fast Food', value: 'fast-food' },
  { label: 'More', value: 'more' },
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lat, lng, radius } = useLocationStore()

  const [query, setQuery] = React.useState(searchParams.get('q') ?? '')
  const [debouncedQuery, setDebouncedQuery] = React.useState(query)
  const [sort, setSort] = React.useState<SortOption>('relevance')
  const [openNow, setOpenNow] = React.useState(false)
  const [minRating, setMinRating] = React.useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = React.useState(searchParams.get('category') ?? '')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [loading, setLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(false)

  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)

  // Debounce query input 300ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Fetch results when query/filters/location change
  React.useEffect(() => {
    if (!lat || !lng) return
    setPage(1)
    setResults([])
    fetchResults(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, sort, openNow, minRating, selectedCategory, lat, lng, radius])

  async function fetchResults(pageNum: number, reset = false) {
    if (!lat || !lng) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radius: String(radius),
        sort,
        page: String(pageNum),
        limit: '20',
      })
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
      if (minRating) params.set('min_rating', String(minRating))
      if (selectedCategory) params.set('category', selectedCategory)

      const res = await apiClient.get<{
        data: SearchResult[]
        meta: { page: number; total: number; hasNextPage: boolean }
      }>(`/businesses/search?${params}`)

      const { data, meta } = res.data
      setResults((prev) => (reset ? data : [...prev, ...data]))
      setTotal(meta.total)
      setHasMore(meta.hasNextPage)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  // Infinite scroll
  React.useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchResults(nextPage)
        }
      },
      { threshold: 0.1 }
    )
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loading, page])

  return (
    <div className="flex flex-col h-dvh bg-gray-50">
      {/* Top bar: back + search + map button */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button
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
              aria-label="Search businesses"
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
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
              useSearchStore.getState().setResults(results as any[], total)
              router.push('/search/map')
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary text-primary text-sm font-medium hover:bg-blue-50 transition-colors flex-shrink-0"
          >
            <MapPin className="h-3.5 w-3.5" />
            Map
          </button>
        </div>

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
            onClick={() => setMinRating(minRating === 4 ? null : 4)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-colors',
              minRating === 4 ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : 'bg-white border-gray-200 text-gray-600'
            )}
          >
            <Star className="h-3 w-3 text-yellow-400" />
            Top rated
          </button>
          <button
            onClick={() => setSort('distance')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-colors',
              sort === 'distance' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
            )}
          >
            Nearest
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
            markers={deriveMapPins(results as any[])}
            center={{ lat, lng }}
            zoom={13}
            onMarkerClick={(id) => router.push(`/listing/${id}`)}
            className="h-28 rounded-none"
          />
        </div>
      ) : (
        <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-gray-200 bg-blue-50 h-28 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Map will appear with results</span>
        </div>
      )}

      {/* Results count + sort */}
      <div className="flex items-center justify-between px-4 mt-3 mb-2">
        {!loading && results.length > 0 && (
          <p className="text-xs text-gray-500 font-medium">
            {total} result{total !== 1 ? 's' : ''} found
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
          {results.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              onClick={() => router.push(`/listing/${business.id}`)}
            />
          ))}

          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <BusinessCardSkeleton key={i} />
            ))}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" aria-hidden="true" />

          {/* Empty state */}
          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4" aria-hidden="true">🔍</span>
              <h3 className="text-base font-semibold text-gray-900 mb-1">No results found</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                {!lat || !lng
                  ? 'Enable location to search nearby businesses.'
                  : 'Try broadening your search radius or changing your query.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Map view button */}
      <button
        onClick={() => {
          useSearchStore.getState().setViewMode('map')
          useSearchStore.getState().setResults(results as any[], total)
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
