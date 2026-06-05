'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useLocationStore } from '@/lib/stores/locationStore'
import { BusinessCard, BusinessCardSkeleton } from '@/components/listings/BusinessCard'
import apiClient from '@/lib/api'

interface Business {
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

/**
 * Fetches and displays the top 10 businesses near the user's current location.
 * Requirements: 2.7, 2.9
 */
export function PopularNearYou() {
  const router = useRouter()
  const { lat, lng, radius } = useLocationStore()
  const [businesses, setBusinesses] = React.useState<Business[]>([])
  const [loading, setLoading] = React.useState(false)
  const [fetched, setFetched] = React.useState(false)

  React.useEffect(() => {
    if (!lat || !lng) return
    setLoading(true)
    apiClient
      .get<{ data: Business[] }>(
        `/businesses/search?lat=${lat}&lng=${lng}&radius=${radius}&sort=relevance&limit=10`
      )
      .then((res) => {
        setBusinesses(res.data.data ?? [])
      })
      .catch(() => {
        setBusinesses([])
      })
      .finally(() => {
        setLoading(false)
        setFetched(true)
      })
  }, [lat, lng, radius])

  if (!lat || !lng) return null

  return (
    <div className="flex flex-col gap-3">
      {loading &&
        Array.from({ length: 3 }).map((_, i) => (
          <BusinessCardSkeleton key={i} />
        ))}

      {!loading &&
        businesses.map((b) => (
          <BusinessCard
            key={b.id}
            business={b}
            onClick={() => router.push(`/listing/${b.slug || b.id}`)}
          />
        ))}

      {!loading && fetched && businesses.length === 0 && (
        <p className="text-sm text-muted text-center py-4">
          No businesses found nearby. Try increasing your search radius.
        </p>
      )}
    </div>
  )
}
