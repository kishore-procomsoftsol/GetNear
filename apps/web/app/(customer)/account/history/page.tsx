'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'

interface SearchHistoryItem {
  id: string
  query: string
  lat: number | null
  lng: number | null
  created_at: string
}

export default function SearchHistoryPage() {
  const router = useRouter()
  const [items, setItems] = React.useState<SearchHistoryItem[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    apiClient.get<{ data: SearchHistoryItem[] }>('/user/search-history')
      .then((res) => setItems(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleClear = async () => {
    if (!confirm('Clear all search history?')) return
    await apiClient.delete('/user/search-history').catch(() => {})
    setItems([])
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-gray-100" aria-label="Go back">
            <ArrowLeft className="h-5 w-5 text-dark" />
          </button>
          <h1 className="text-lg font-semibold text-dark">Search History</h1>
        </div>
        {items.length > 0 && (
          <button onClick={handleClear} className="flex items-center gap-1 text-xs text-danger font-medium">
            <Trash2 className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted text-center py-12">No search history yet.</p>
      )}

      {!loading && items.map((item) => (
        <button
          key={item.id}
          onClick={() => router.push(`/search?q=${encodeURIComponent(item.query)}`)}
          className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2.5 hover:bg-gray-50 text-left w-full"
        >
          <Search className="h-4 w-4 text-muted flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-dark truncate">{item.query}</p>
            <p className="text-xs text-muted">{new Date(item.created_at).toLocaleDateString()}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
