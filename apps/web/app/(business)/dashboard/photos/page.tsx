'use client'

import * as React from 'react'
import { Plus, Trash2, Image as ImageIcon, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'
import { cn } from '@/lib/utils'

interface Photo {
  id: string
  url: string
  is_primary: boolean
  created_at: string
}

export default function PhotosPage() {
  const [photos, setPhotos] = React.useState<Photo[]>([])
  const [loading, setLoading] = React.useState(true)
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    apiClient
      .get<{ data: Photo[] }>('/dashboard/photos')
      .then((res) => setPhotos(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach((file) => formData.append('photos', file))

      const res = await apiClient.post<{ data: Photo[] }>('/dashboard/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPhotos((prev) => [...(res.data.data ?? []), ...prev])
    } catch {
      // silently fail
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDelete = async (photoId: string) => {
    try {
      await apiClient.delete(`/dashboard/photos/${photoId}`)
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch {
      // silently fail
    }
  }

  const handleSetPrimary = async (photoId: string) => {
    try {
      await apiClient.patch(`/dashboard/photos/${photoId}/primary`)
      setPhotos((prev) =>
        prev.map((p) => ({ ...p, is_primary: p.id === photoId }))
      )
    } catch {
      // silently fail
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Photos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button size="sm" className="gap-1.5" disabled={uploading} asChild>
            <span>
              <Plus className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Add Photos'}
            </span>
          </Button>
        </label>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">No photos yet</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Upload photos to showcase your business. The primary photo appears in search results.
          </p>
          <label className="cursor-pointer mt-4 inline-block">
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button size="sm" variant="outline" asChild>
              <span>Upload Photos</span>
            </Button>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={cn(
                'relative group rounded-xl overflow-hidden border-2',
                photo.is_primary ? 'border-primary' : 'border-gray-100'
              )}
            >
              <img
                src={photo.url}
                alt="Business photo"
                className="h-40 w-full object-cover"
              />

              {/* Primary badge */}
              {photo.is_primary && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  <Star className="h-3 w-3 fill-white" /> Primary
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!photo.is_primary && (
                  <button
                    onClick={() => handleSetPrimary(photo.id)}
                    className="p-2 rounded-full bg-white/90 hover:bg-white text-gray-700"
                    title="Set as primary"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="p-2 rounded-full bg-white/90 hover:bg-white text-red-600"
                  title="Delete photo"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
