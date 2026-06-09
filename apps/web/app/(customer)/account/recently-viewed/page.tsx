'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BusinessCard } from '@/components/listings/BusinessCard'
import apiClient from '@/lib/api'

interface ViewedBusiness {
  id: string
  name: string
  slug?: string | null
  rating_avg?: number | null
  review_count?: number | null
  address?: string | null
  city?: string | null
  categories?: { name: string; icon?: string | null; color?: string | null } | null
  business_photos?: Array<{ url: string; is_primary: boolean }> | null
}

interface ViewedEntry {
  id: string
  business_id: string
  created_at: string
  businesses: ViewedBusiness | null
}

export default function RecentlyViewedPage() {
  const router = useRouter()
  const [items, setItems] = React.useState<ViewedEntry[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient
      .get<{ data: ViewedEntry[] }>('/user/recently-viewed')
      .then((res) => setItems(res.data.data ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-0 pb-24 bg-gray-50 min-h-dvh">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 bg-white border-b border-gray-100">
        <button onClick={() => router.back()} className="p-1" aria-label="Go back">
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Recently Viewed</h1>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-3">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}

        {!loading && items.length === 0 && (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
              <Eye className="h-6 w-6 text-emerald-500" />
            </div>
            <p className="text-sm text-gray-500">No recently viewed businesses yet.</p>
            <p className="text-xs text-gray-400 mt-1">Businesses you visit will appear here.</p>
          </div>
        )}

        {!loading &&
          items.map((entry) =>
            entry.businesses ? (
              <BusinessCard
                key={entry.id}
                business={entry.businesses}
                onClick={() =>
                  router.push(`/listing/${entry.businesses?.slug || entry.business_id}`)
                }
              />
            ) : null
          )}
      </div>
    </div>
  )
}
