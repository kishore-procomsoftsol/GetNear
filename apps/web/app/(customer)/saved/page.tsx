'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, MoreHorizontal, Plus, ChevronDown, FolderOpen } from 'lucide-react'
import { BusinessCard, BusinessCardSkeleton } from '@/components/listings/BusinessCard'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

interface SavedItem {
  id: string
  collection_id: string | null
  created_at: string
  businesses: {
    id: string
    name: string
    rating_avg: number | null
    review_count: number | null
    address: string | null
    city: string | null
    distance_m?: number | null
    business_photos: Array<{ url: string; is_primary: boolean }> | null
    business_hours: Array<{ day: number; open_time: string | null; close_time: string | null; is_closed: boolean }> | null
    categories: { name: string; icon: string | null; color: string | null } | null
  }
}

interface Collection {
  id: string
  name: string
  item_count: number
}

const FILTER_PILLS = [
  { label: 'All Places', value: '' },
  { label: 'Cafes', value: 'cafes' },
  { label: 'Restaurants', value: 'restaurants' },
  { label: 'Hotels', value: 'hotels' },
  { label: 'More', value: 'more' },
]

export default function SavedPlacesPage() {
  const router = useRouter()
  const [savedItems, setSavedItems] = React.useState<SavedItem[]>([])
  const [collections, setCollections] = React.useState<Collection[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sort, setSort] = React.useState<'recently_added' | 'rating'>('recently_added')
  const [activeFilter, setActiveFilter] = React.useState('')

  React.useEffect(() => {
    Promise.all([
      apiClient.get<{ data: SavedItem[] }>(`/user/saved?sort=${sort}`),
      apiClient.get<{ data: Collection[] }>('/user/collections'),
    ])
      .then(([savedRes, colRes]) => {
        setSavedItems(savedRes.data.data ?? [])
        setCollections(colRes.data.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sort])

  const handleCreateCollection = async () => {
    const name = prompt('Collection name:')
    if (!name?.trim()) return
    try {
      await apiClient.post('/user/collections', { name: name.trim() })
      const res = await apiClient.get<{ data: Collection[] }>('/user/collections')
      setCollections(res.data.data ?? [])
    } catch (err: any) {
      if (err?.response?.data?.error?.code === 'COLLECTION_LIMIT_REACHED') {
        alert('Collection limit reached. Please remove a collection to create a new one.')
      }
    }
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-gray-700" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Saved Places</h1>
              <p className="text-xs text-gray-500">Your favorite places, saved for later</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" aria-label="Search saved">
              <Search className="h-4 w-4 text-gray-600" />
            </button>
            <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" aria-label="More options">
              <MoreHorizontal className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Category filter pills */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto scrollbar-hide">
          {FILTER_PILLS.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setActiveFilter(pill.value)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-medium border flex-shrink-0 transition-colors',
                activeFilter === pill.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
              )}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Count + sort */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">
          {loading ? '...' : `${savedItems.length} Saved Places`}
        </p>
        <button
          onClick={() => setSort(sort === 'recently_added' ? 'rating' : 'recently_added')}
          className="flex items-center gap-1 text-xs text-gray-500"
        >
          {sort === 'recently_added' ? 'Recently Added' : 'Top Rated'}
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Business list */}
      <div className="flex flex-col gap-3 px-4">
        {loading && Array.from({ length: 3 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
        {!loading && savedItems.map((item) => (
          <BusinessCard
            key={item.id}
            business={item.businesses as any}
            onClick={() => router.push(`/listing/${item.businesses.id}`)}
          />
        ))}
        {!loading && savedItems.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-3 block">💾</span>
            <p className="text-sm font-medium text-gray-900">No saved places yet</p>
            <p className="text-xs text-gray-500 mt-1">Start exploring and save your favorites!</p>
            <button
              onClick={() => router.push('/search')}
              className="mt-4 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Browse businesses
            </button>
          </div>
        )}
      </div>

      {/* Organize your saves banner */}
      <div className="mx-4 mt-6 rounded-2xl bg-blue-50 border border-blue-100 p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">📂</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Organize your saves</p>
          <p className="text-xs text-gray-500 mt-0.5">Create collections to group your favorite places</p>
        </div>
        <button
          onClick={handleCreateCollection}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-white text-xs font-medium flex-shrink-0"
        >
          <Plus className="h-3 w-3" />
          Create
        </button>
      </div>

      {/* Collections section */}
      {collections.length > 0 && (
        <div className="px-4 mt-6 pb-24">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">My Collections</h2>
            <Link href="/saved" className="text-xs text-primary font-medium">View all</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/saved/${col.id}`}
                className="flex-shrink-0 w-36 rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="h-20 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
                  <FolderOpen className="h-8 w-8 text-primary/60" />
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-semibold text-gray-900 truncate">{col.name}</p>
                  <p className="text-[10px] text-gray-500">{col.item_count} places</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
