'use client'

import * as React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import apiClient from '@/lib/api'

interface Offer {
  id: string
  title: string
  description: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
}

export default function OffersPage() {
  const [offers, setOffers] = React.useState<Offer[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchOffers = () => {
    apiClient.get<{ data: Offer[] }>('/dashboard/offers')
      .then((res) => setOffers(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  React.useEffect(fetchOffers, [])

  const handleCreate = async () => {
    const title = prompt('Offer title:')
    if (!title?.trim()) return
    await apiClient.post('/dashboard/offers', { title: title.trim() }).catch(() => {})
    fetchOffers()
  }

  const handleToggle = async (id: string, currentActive: boolean) => {
    await apiClient.put(`/dashboard/offers/${id}`, { is_active: !currentActive }).catch(() => {})
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, is_active: !currentActive } : o))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this offer?')) return
    await apiClient.delete(`/dashboard/offers/${id}`).catch(() => {})
    setOffers((prev) => prev.filter((o) => o.id !== id))
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-dark">Offers</h1>
        <Button size="sm" onClick={handleCreate}><Plus className="h-4 w-4 mr-1" /> New Offer</Button>
      </div>

      {loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}

      {!loading && offers.length === 0 && <p className="text-sm text-muted text-center py-8">No offers yet. Create one to attract customers!</p>}

      {!loading && offers.map((offer) => (
        <div key={offer.id} className="flex items-center justify-between border border-gray-100 rounded-xl p-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-dark truncate">{offer.title}</p>
              <Badge variant={offer.is_active ? 'success' : 'outline'} className="text-[10px]">
                {offer.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            {offer.valid_until && <p className="text-xs text-muted mt-0.5">Valid until {offer.valid_until}</p>}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <button onClick={() => handleToggle(offer.id, offer.is_active)} className="text-xs text-primary font-medium">
              {offer.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button onClick={() => handleDelete(offer.id)} className="p-1.5 hover:bg-red-50 rounded" aria-label="Delete offer">
              <Trash2 className="h-4 w-4 text-danger" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
