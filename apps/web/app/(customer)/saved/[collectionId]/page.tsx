'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BusinessCard, BusinessCardSkeleton } from '@/components/listings/BusinessCard'
import apiClient from '@/lib/api'

export default function CollectionDetailPage() {
  const { collectionId } = useParams<{ collectionId: string }>()
  const router = useRouter()
  const [items, setItems] = React.useState<any[]>([])
  const [collectionName, setCollectionName] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    Promise.all([
      apiClient.get<{ data: any[] }>('/user/saved'),
      apiClient.get<{ data: any[] }>('/user/collections'),
    ])
      .then(([savedRes, colRes]) => {
        const allSaved = savedRes.data.data ?? []
        setItems(allSaved.filter((s: any) => s.collection_id === collectionId))
        const col = (colRes.data.data ?? []).find((c: any) => c.id === collectionId)
        setCollectionName(col?.name ?? 'Collection')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [collectionId])

  const handleRename = async () => {
    const name = prompt('New name:', collectionName)
    if (!name?.trim()) return
    await apiClient.put(`/user/collections/${collectionId}`, { name: name.trim() }).catch(() => {})
    setCollectionName(name.trim())
  }

  const handleDelete = async () => {
    if (!confirm('Delete this collection? Saved places will be moved to unsorted.')) return
    await apiClient.delete(`/user/collections/${collectionId}`).catch(() => {})
    router.push('/saved')
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-gray-100" aria-label="Go back">
            <ArrowLeft className="h-5 w-5 text-dark" />
          </button>
          <h1 className="text-lg font-semibold text-dark">{collectionName}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRename} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Rename collection">
            <Edit className="h-4 w-4 text-muted" />
          </button>
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-full" aria-label="Delete collection">
            <Trash2 className="h-4 w-4 text-danger" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {loading && Array.from({ length: 3 }).map((_, i) => <BusinessCardSkeleton key={i} />)}
        {!loading && items.map((item: any) => (
          <BusinessCard
            key={item.id}
            business={item.businesses}
            onClick={() => router.push(`/listing/${item.businesses?.id}`)}
          />
        ))}
        {!loading && items.length === 0 && (
          <p className="text-sm text-muted text-center py-8">No items in this collection yet.</p>
        )}
      </div>
    </div>
  )
}
