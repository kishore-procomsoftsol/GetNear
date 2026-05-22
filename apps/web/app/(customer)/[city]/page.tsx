'use client'

import * as React from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useLocationStore } from '@/lib/stores/locationStore'
import { BusinessCard, BusinessCardSkeleton } from '@/components/listings/BusinessCard'
import { Button } from '@/components/ui/button'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// City coordinates mapping
// ---------------------------------------------------------------------------

const CITY_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  visakhapatnam: { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam' },
  hyderabad: { lat: 17.385, lng: 78.4867, name: 'Hyderabad' },
  bangalore: { lat: 12.9716, lng: 77.5946, name: 'Bangalore' },
  chennai: { lat: 13.0827, lng: 80.2707, name: 'Chennai' },
  mumbai: { lat: 19.076, lng: 72.8777, name: 'Mumbai' },
  delhi: { lat: 28.6139, lng: 77.209, name: 'Delhi' },
  pune: { lat: 18.5204, lng: 73.8567, name: 'Pune' },
  kolkata: { lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad' },
  jaipur: { lat: 26.9124, lng: 75.7873, name: 'Jaipur' },
}

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
  is_sponsored?: boolean | null
  categories?: { name: string; icon?: string | null; color?: string | null } | null
  business_photos?: Array<{ url: string; is_primary: boolean }> | null
  business_hours?: Array<{ day: number; open_time: string | null; close_time: string | null; is_closed: boolean }> | null
  offers?: Array<{ title: string; valid_until: string | null }> | null
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CityPage() {
  const { city } = useParams<{ city: string }>()
  const router = useRouter()
  const { radius } = useLocationStore()

  const citySlug = city?.toLowerCase() ?? ''
  const cityData = CITY_COORDS[citySlug]

  const [query, setQuery] = React.useState('')
  const [debouncedQuery, setDebouncedQuery] = React.useState('')
  const [sort, setSort] = React.useState<SortOption>('relevance')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(false)
  const [page, setPage] = React.useState(1)

  // Debounce query
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  // Fetch results
  React.useEffect(() => {
    if (!cityData) return
    setPage(1)
    setResults([])
    fetchResults(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, sort, citySlug])

  async function fetchResults(pageNum: number, reset = false) {
    if (!cityData) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        lat: String(cityData.lat),
        lng: String(cityData.lng),
        radius: String(radius || 10),
        sort,
        page: String(pageNum),
        limit: '20',
      })
      if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())

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

  if (!cityData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <span className="text-5xl mb-4" aria-hidden="true">🏙️</span>
        <h1 className="text-lg font-semibold text-dark mb-1">City not found</h1>
        <p className="text-sm text-muted">We don't have listings for this city yet.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/')}>
          Go Home
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3 flex flex-col gap-3">
        <h1 className="text-lg font-bold text-dark">
          Businesses in {cityData.name}
        </h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in ${cityData.name}…`}
            aria-label="Search businesses"
            className={cn(
              'w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-gray-50',
              'text-sm text-dark placeholder:text-muted',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white',
              'transition-all'
            )}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {!loading && results.length > 0 && (
          <p className="text-xs text-muted mb-3">{total} result{total !== 1 ? 's' : ''} found</p>
        )}

        <div className="flex flex-col gap-3">
          {results.map((business) => (
            <BusinessCard
              key={business.id}
              business={business}
              onClick={() => router.push(`/listing/${business.id}`)}
            />
          ))}

          {loading && Array.from({ length: 4 }).map((_, i) => <BusinessCardSkeleton key={i} />)}

          {!loading && hasMore && (
            <Button variant="outline" onClick={() => { const next = page + 1; setPage(next); fetchResults(next) }}>
              Load more
            </Button>
          )}

          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4" aria-hidden="true">🔍</span>
              <h3 className="text-base font-semibold text-dark mb-1">No results found</h3>
              <p className="text-sm text-muted max-w-xs">
                Try broadening your search or check back later.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
